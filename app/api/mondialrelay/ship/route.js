import { createHash } from 'crypto'

const MR_API_URL = 'https://api.mondialrelay.com/Web_Services.asmx'

function removeAccents(str) {
  return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// Exact parameter order for MD5 security key calculation
const PARAM_ORDER = [
  'Enseigne','ModeCol','ModeLiv','NDossier','NClient',
  'Expe_Langage','Expe_Ad1','Expe_Ad2','Expe_Ad3','Expe_Ad4',
  'Expe_Ville','Expe_CP','Expe_Pays','Expe_Tel1','Expe_Tel2','Expe_Mail',
  'Dest_Langage','Dest_Ad1','Dest_Ad2','Dest_Ad3','Dest_Ad4',
  'Dest_Ville','Dest_CP','Dest_Pays','Dest_Tel1','Dest_Tel2','Dest_Mail',
  'Poids','Longueur','Taille','NbColis',
  'CRT_Valeur','CRT_Devise','Exp_Valeur','Exp_Devise',
  'COL_Rel_Pays','COL_Rel','LIV_Rel_Pays','LIV_Rel',
  'TAvis_Dest','Texte',
]

export async function POST(request) {
  try {
    const body = await request.json()
    const { sender, recipient, parcel, relayCode, reference } = body
    const enseigne = (body.enseigne || process.env.MR_ENSEIGNE || '').toUpperCase().trim()
    const privateKey = body.privateKey || process.env.MR_PRIVATE_KEY || ''

    if (!enseigne || !privateKey) {
      return Response.json({ error: 'Identifiants Mondial Relay manquants.' }, { status: 400 })
    }

    var relayNum = (relayCode || '').replace(/^MONR-/, '').trim()

    var params = {
      Enseigne: enseigne,
      ModeCol: 'CCC',
      ModeLiv: '24R',
      NDossier: cleanAlphaNum(reference || '', 15),
      NClient: '',
      Expe_Langage: 'FR',
      Expe_Ad1: clean(sender?.name || 'Ma Boutique', 32),
      Expe_Ad2: '',
      Expe_Ad3: clean(sender?.address || '', 32),
      Expe_Ad4: '',
      Expe_Ville: clean(sender?.city || '', 26),
      Expe_CP: (sender?.zipcode || '').replace(/\D/g, '').substring(0, 5),
      Expe_Pays: 'FR',
      Expe_Tel1: formatPhone(sender?.phone || ''),
      Expe_Tel2: '',
      Expe_Mail: (sender?.email || '').substring(0, 70),
      Dest_Langage: 'FR',
      Dest_Ad1: clean(((recipient?.firstname || '') + ' ' + (recipient?.lastname || '')).trim(), 32),
      Dest_Ad2: '',
      Dest_Ad3: clean(recipient?.address || '', 32),
      Dest_Ad4: '',
      Dest_Ville: clean(recipient?.city || '', 26),
      Dest_CP: (recipient?.zipcode || '').replace(/\D/g, '').substring(0, 5),
      Dest_Pays: 'FR',
      Dest_Tel1: formatPhone(recipient?.phone || ''),
      Dest_Tel2: '',
      Dest_Mail: (recipient?.email || '').substring(0, 70),
      Poids: String(Math.round((parcel?.weight || 0.5) * 1000)),
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
      LIV_Rel: relayNum,
      TAvis_Dest: '',
      Texte: '',
    }

    // Build MD5 security key: concat all param values in EXACT order + private key
    var concatParts = []
    for (var i = 0; i < PARAM_ORDER.length; i++) {
      concatParts.push(params[PARAM_ORDER[i]] || '')
    }
    var concatStr = concatParts.join('') + privateKey
    var security = createHash('md5').update(concatStr, 'utf8').digest('hex').toUpperCase()
    params.Security = security

    console.log('[MR Ship] Enseigne:', enseigne, 'Relay:', relayNum, 'Weight:', params.Poids + 'g')
    console.log('[MR Ship] Sender:', params.Expe_Ad1, params.Expe_CP, params.Expe_Ville)
    console.log('[MR Ship] Dest:', params.Dest_Ad1, params.Dest_CP, params.Dest_Ville)
    console.log('[MR Ship] MD5 input (first 100):', concatStr.substring(0, 100) + '...')
    console.log('[MR Ship] MD5 hash:', security)

    // Build SOAP XML
    var soapBody = ''
    var allKeys = PARAM_ORDER.concat(['Security'])
    for (var k = 0; k < allKeys.length; k++) {
      var key = allKeys[k]
      soapBody += '<' + key + '>' + escapeXml(params[key] || '') + '</' + key + '>'
    }

    var soapXml = '<?xml version="1.0" encoding="utf-8"?>'
      + '<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
      + '<soap:Body>'
      + '<WSI2_CreationEtiquette xmlns="http://www.mondialrelay.fr/webservice/">'
      + soapBody
      + '</WSI2_CreationEtiquette>'
      + '</soap:Body>'
      + '</soap:Envelope>'

    console.log('[MR Ship] SOAP XML:', soapXml)

    // Try main URL, then fallback
    var urls = [
      'https://api.mondialrelay.com/Web_Services.asmx',
      'https://api.mondialrelay.com/WebService.asmx',
    ]
    var xml = ''
    var stat = null

    for (var u = 0; u < urls.length; u++) {
      console.log('[MR Ship] Trying URL:', urls[u])
      var res = await fetch(urls[u], {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://www.mondialrelay.fr/webservice/WSI2_CreationEtiquette',
        },
        body: soapXml,
      })

      xml = await res.text()
      console.log('[MR Ship] Response:', res.status, xml.length, 'chars')

      stat = extractTag(xml, 'STAT')
      console.log('[MR Ship] STAT:', stat)

      if (stat === '0') break
      if (stat !== '97') break // Only retry on 97 (technical error)
    }

    if (stat !== '0') {
      var errorMsg = MR_ERRORS[stat] || 'Erreur Mondial Relay (code ' + stat + ')'
      console.error('[MR Ship] Error:', stat, errorMsg)
      console.error('[MR Ship] Full XML:', xml)
      return Response.json({ error: errorMsg, code: stat }, { status: 200 })
    }

    var expeditionNum = extractTag(xml, 'ExpeditionNum') || ''
    var labelUrl = extractTag(xml, 'URL_Etiquette') || ''
    // Decode HTML entities in URL
    labelUrl = labelUrl.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    if (labelUrl && !labelUrl.startsWith('http')) {
      labelUrl = 'https://api.mondialrelay.com' + labelUrl
    }

    console.log('[MR Ship] Success! Num:', expeditionNum, 'Label:', labelUrl)

    return Response.json({
      success: true,
      expeditionNum: expeditionNum,
      tracking: expeditionNum,
      label_url: labelUrl,
      carrier: 'Mondial Relay',
    })

  } catch (error) {
    console.error('[MR Ship] Server error:', error)
    return Response.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 })
  }
}

function clean(str, max) {
  return removeAccents(String(str || '')).replace(/[<>&'"]/g, '').substring(0, max)
}

function cleanAlphaNum(str, max) {
  return removeAccents(String(str || '')).replace(/[^0-9A-Za-z_ -]/g, '').toUpperCase().substring(0, max)
}

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function extractTag(xml, tag) {
  var regex = new RegExp('<' + tag + '>([^<]*)</' + tag + '>', 'i')
  var match = xml.match(regex)
  return match ? match[1].trim() : null
}

function formatPhone(phone) {
  var clean = (phone || '').replace(/[\s.\-\+]/g, '')
  if (clean.startsWith('33')) clean = '0' + clean.slice(2)
  if (clean.length > 0 && !clean.startsWith('0')) clean = '0' + clean
  // MR wants exactly 10 digits
  clean = clean.replace(/\D/g, '').substring(0, 10)
  return clean.padEnd(10, '0')
}

var MR_ERRORS = {
  '1': 'Code enseigne invalide',
  '2': 'Numero de commande invalide',
  '7': 'Infos expediteur manquantes',
  '8': 'Adresse expediteur manquante',
  '9': 'Ville expediteur invalide',
  '10': 'Code postal expediteur invalide',
  '12': 'Telephone expediteur invalide',
  '14': 'Infos destinataire manquantes',
  '15': 'Adresse destinataire manquante',
  '16': 'Ville destinataire invalide',
  '17': 'Code postal destinataire invalide',
  '19': 'Telephone destinataire invalide',
  '20': 'Poids invalide',
  '24': 'Numero de point relais invalide',
  '25': 'Point relais indisponible',
  '26': 'Mode de collecte invalide',
  '27': 'Mode de livraison invalide',
  '29': 'Colis trop lourd',
  '33': 'Enseigne non autorisee pour ce service',
  '34': 'Service indisponible',
  '38': 'Pays non autorise',
  '60': 'Solde insuffisant',
  '80': 'Cle de securite (MD5) invalide — verifie le Code Enseigne et la Cle Privee',
  '82': 'Expediteur incomplet — remplis ton adresse dans Parametres',
  '83': 'Destinataire incomplet',
  '84': 'Point relais invalide',
  '86': 'Poids maximum depasse',
  '97': 'Erreur technique Mondial Relay — verifie tes identifiants ou reessaye dans quelques minutes',
}
