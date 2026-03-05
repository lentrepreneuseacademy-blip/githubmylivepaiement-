// ═══════════════════════════════════════════════════════
// /app/api/mondialrelay/ship/route.js
// Création expédition Mondial Relay + étiquette PDF
// Via API SOAP directe Mondial Relay (WSI2_CreationEtiquette)
// ═══════════════════════════════════════════════════════

import { createHash } from 'crypto'

const MR_ENSEIGNE = process.env.MR_ENSEIGNE || ''
const MR_PRIVATE_KEY = process.env.MR_PRIVATE_KEY || ''
const MR_BRAND_CODE = process.env.MR_BRAND_CODE || ''
const MR_API_URL = 'https://api.mondialrelay.com/Web_Services.asmx'

export async function POST(request) {
  try {
    const body = await request.json()
    const { sender, recipient, parcel, relayCode, reference } = body

    const enseigne = body.enseigne || MR_ENSEIGNE
    const privateKey = body.privateKey || MR_PRIVATE_KEY

    if (!enseigne || !privateKey) {
      return Response.json({ error: 'Identifiants Mondial Relay manquants. Configure Code Enseigne et Cle Privee dans Parametres.' }, { status: 400 })
    }

    // Params for WSI2_CreationEtiquette
    const params = {
      Enseigne: enseigne.toUpperCase(),
      ModeCol: 'CCC',       // Collecte chez commerçant
      ModeLiv: '24R',        // Livraison en Point Relais
      NDossier: (reference || '').substring(0, 15).replace(/[^0-9A-Z_ -]/gi, '').toUpperCase(),
      NClient: '',
      Expe_Langage: 'FR',
      Expe_Ad1: (sender?.name || 'Ma Boutique').substring(0, 32),
      Expe_Ad2: '',
      Expe_Ad3: (sender?.address || '').substring(0, 32),
      Expe_Ad4: '',
      Expe_Ville: (sender?.city || '').substring(0, 26),
      Expe_CP: (sender?.zipcode || '').substring(0, 5),
      Expe_Pays: 'FR',
      Expe_Tel1: formatPhone(sender?.phone || ''),
      Expe_Tel2: '',
      Expe_Mail: (sender?.email || '').substring(0, 70),
      Dest_Langage: 'FR',
      Dest_Ad1: ((recipient?.firstname || '') + ' ' + (recipient?.lastname || '')).trim().substring(0, 32),
      Dest_Ad2: '',
      Dest_Ad3: (recipient?.address || '').substring(0, 32),
      Dest_Ad4: '',
      Dest_Ville: (recipient?.city || '').substring(0, 26),
      Dest_CP: (recipient?.zipcode || '').substring(0, 5),
      Dest_Pays: 'FR',
      Dest_Tel1: formatPhone(recipient?.phone || ''),
      Dest_Tel2: '',
      Dest_Mail: (recipient?.email || '').substring(0, 70),
      Poids: String(Math.round((parcel?.weight || 0.5) * 1000)), // en grammes
      Longueur: '',
      Taille: '',
      NbColis: '1',
      CRT_Valeur: '0',
      CRT_Devise: 'EUR',
      Exp_Valeur: '',
      Exp_Devise: '',
      COL_Rel_Pays: '',
      COL_Rel: '',
      LIV_Rel_Pays: 'FR',
      LIV_Rel: (relayCode || '').replace(/^MONR-/, ''),
      TAvis662: '',
      TTexte: '',
      MModeLiv: '',
      Texte: '',
    }

    // Generate MD5 security key
    const concatStr = Object.values(params).join('') + privateKey
    const security = createHash('md5').update(concatStr).digest('hex').toUpperCase()
    params.Security = security

    console.log('[MR Ship] Creating shipment, relay:', params.LIV_Rel, 'weight:', params.Poids + 'g')

    // Build SOAP XML
    const soapXml = buildSoapXml('WSI2_CreationEtiquette', params)

    // Call Mondial Relay API
    const res = await fetch(MR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI2_CreationEtiquette',
      },
      body: soapXml,
    })

    const xml = await res.text()
    console.log('[MR Ship] Response status:', res.status, 'length:', xml.length)

    // Parse response
    const stat = extractTag(xml, 'STAT')
    console.log('[MR Ship] STAT:', stat)

    if (stat !== '0') {
      const errorMsg = MR_ERRORS[stat] || 'Erreur Mondial Relay (code ' + stat + ')'
      console.error('[MR Ship] Error:', stat, errorMsg)
      console.error('[MR Ship] XML:', xml.substring(0, 500))
      return Response.json({ error: errorMsg, code: stat }, { status: 200 })
    }

    const expeditionNum = extractTag(xml, 'ExpeditionNum')
    const labelUrl = extractTag(xml, 'URL_Etiquette')
    
    const fullLabelUrl = labelUrl ? (labelUrl.startsWith('http') ? labelUrl : 'https://api.mondialrelay.com' + labelUrl) : null

    console.log('[MR Ship] Success! ExpeditionNum:', expeditionNum, 'Label:', fullLabelUrl)

    return Response.json({
      success: true,
      expeditionNum: expeditionNum,
      tracking: expeditionNum,
      label_url: fullLabelUrl,
      carrier: 'Mondial Relay',
      service: 'Point Relais',
    })

  } catch (error) {
    console.error('[MR Ship] Server error:', error)
    return Response.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function buildSoapXml(method, params) {
  let paramsXml = ''
  for (const [key, value] of Object.entries(params)) {
    paramsXml += `<${key}>${escapeXml(value || '')}</${key}>`
  }
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method} xmlns="http://www.mondialrelay.fr/webservice/">
      ${paramsXml}
    </${method}>
  </soap:Body>
</soap:Envelope>`
}

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

function formatPhone(phone) {
  let clean = phone.replace(/[\s.\-\+]/g, '')
  if (clean.startsWith('33')) clean = '0' + clean.slice(2)
  if (!clean.startsWith('0')) clean = '0' + clean
  return clean.substring(0, 10)
}

const MR_ERRORS = {
  '1': 'Code enseigne invalide',
  '2': 'Numero de commande invalide',
  '3': 'Numero de client invalide',
  '5': 'Nombre de colis invalide',
  '6': 'Destination invalide',
  '7': 'Information expediteur manquante',
  '8': 'Adresse expediteur manquante',
  '9': 'Ville expediteur invalide',
  '10': 'Code postal expediteur invalide',
  '11': 'Pays expediteur invalide',
  '12': 'Telephone expediteur invalide',
  '13': 'Email expediteur invalide',
  '14': 'Information destinataire manquante',
  '15': 'Adresse destinataire manquante',
  '16': 'Ville destinataire invalide',
  '17': 'Code postal destinataire invalide',
  '18': 'Pays destinataire invalide',
  '19': 'Telephone destinataire invalide',
  '20': 'Poids invalide',
  '21': 'Taille invalide',
  '22': 'Longueur invalide',
  '24': 'Numero de point relais invalide',
  '25': 'Point relais ferme ou indisponible',
  '26': 'Mode de collecte invalide',
  '27': 'Mode de livraison invalide',
  '28': 'Mode de livraison indisponible pour ce pays',
  '29': 'Colis trop lourd',
  '30': 'Valeur de colis invalide',
  '31': 'Assurance invalide',
  '33': 'Enseigne non autorisee',
  '34': 'Service indisponible',
  '35': 'Multi-colis non autorise',
  '38': 'Pays non autorise',
  '39': 'Format etiquette invalide',
  '40': 'Colis deja expedie',
  '44': 'Doublon detecte',
  '45': 'Quota expeditions depasse',
  '60': 'Solde insuffisant',
  '62': 'Langue non supportee',
  '80': 'Cle de securite invalide',
  '81': 'Format de reference invalide',
  '82': 'Expediteur incomplet',
  '83': 'Destinataire incomplet',
  '84': 'Point relais invalide',
  '86': 'Poids maximum depasse',
  '94': 'Mode de collecte incompatible',
  '95': 'Code postal expediteur invalide pour ce pays',
  '96': 'Code postal destinataire invalide pour ce pays',
  '97': 'Erreur technique Mondial Relay — reessaye dans quelques minutes',
}
