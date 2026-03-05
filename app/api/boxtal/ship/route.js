// ═══════════════════════════════════════════════════════
// /app/api/boxtal/ship/route.js
// API Route — Création d'expédition Boxtal + étiquette
// Appelée par le dashboard pro quand elle clique "Commander"
// La pro est facturée par Boxtal en prélèvement différé
// ═══════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const body = await request.json()
    const { boxtal, shopName, shopEmail, recipient, parcel, carrier, relayPoint, reference } = body

    if (!boxtal?.user || !boxtal?.pass) {
      return Response.json({ error: 'Identifiants Boxtal manquants.' }, { status: 400 })
    }

    if (!carrier?.operator || !carrier?.service) {
      return Response.json({ error: 'Transporteur non sélectionné.' }, { status: 400 })
    }

    // ─── Construire les paramètres de commande ───
    const baseUrl = boxtal.testMode
      ? 'https://test.envoimoinscher.com/api/v1'
      : 'https://www.envoimoinscher.com/api/v1'

    const params = new URLSearchParams()

    // Colis
    params.append('colis_1.poids', String(parcel.weight || 0.5))
    params.append('colis_1.longueur', String(parcel.length || 30))
    params.append('colis_1.largeur', String(parcel.width || 20))
    params.append('colis_1.hauteur', String(parcel.height || 10))
    params.append('code_contenu', '10120') // Vêtements
    params.append('colis.description', parcel.description || 'Vetements')
    params.append('colis.valeur', String(parcel.value || 0))

    // Date de collecte (demain ou aujourd'hui)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    // Si c'est un dimanche, passer au lundi
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1)
    if (tomorrow.getDay() === 6) tomorrow.setDate(tomorrow.getDate() + 2)
    params.append('collecte', tomorrow.toISOString().slice(0, 10))

    // Expéditeur (la vendeuse pro)
    params.append('expediteur.type', 'entreprise')
    params.append('expediteur.societe', shopName || 'Ma Boutique')
    params.append('expediteur.prenom', (shopName || 'Boutique').split(' ')[0])
    params.append('expediteur.nom', (shopName || 'Live').split(' ').slice(1).join(' ') || 'Live')
    params.append('expediteur.email', shopEmail || boxtal.user || '')
    params.append('expediteur.tel', formatPhone(boxtal.senderPhone || '0600000000'))
    params.append('expediteur.adresse', boxtal.senderAddress || '')
    params.append('expediteur.code_postal', boxtal.senderZip || '')
    params.append('expediteur.ville', boxtal.senderCity || '')
    params.append('expediteur.pays', 'FR')

    // Destinataire (la cliente acheteuse)
    params.append('destinataire.type', 'particulier')
    params.append('destinataire.prenom', recipient.firstname || 'Client')
    params.append('destinataire.nom', recipient.lastname || 'Client')
    params.append('destinataire.email', recipient.email || '')
    params.append('destinataire.tel', formatPhone(recipient.phone || '0600000000'))
    params.append('destinataire.adresse', recipient.address || '')
    params.append('destinataire.code_postal', recipient.zipcode || '')
    params.append('destinataire.ville', recipient.city || '')
    params.append('destinataire.pays', recipient.country || 'FR')

    // Transporteur choisi
    params.append('operator', carrier.operator)
    params.append('service', carrier.service)

    // Référence externe
    if (reference) {
      params.append('reference_externe', String(reference))
    }

    // Point relais de retrait (si la cliente en a choisi un)
    if (relayPoint && relayPoint.code) {
      params.append('retrait.pointrelais', relayPoint.code)
    }

    // URL de callback (pour recevoir les notifications de suivi)
    // On utilise une URL générique — tu peux la personnaliser plus tard
    const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://githubmylivepaiement.vercel.app'}/api/boxtal/webhook?ref=${reference || ''}`
    params.append('url_push', callbackUrl)

    const url = `${baseUrl}/order`
    const auth = Buffer.from(`${boxtal.user}:${boxtal.pass}`).toString('base64')

    console.log('[Boxtal Ship] Création commande:', carrier.operator, carrier.service)
    console.log('[Boxtal Ship] URL:', url)

    // ─── Appeler l'API Boxtal POST /order ───
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml',
      },
      body: params.toString(),
    })

    const xml = await res.text()
    console.log(`[Boxtal Ship] Réponse ${res.status} (${xml.length} chars)`)
    console.log('[Boxtal Ship] XML:', xml.substring(0, 500))

    if (!res.ok) {
      const errorMsg = extractTag(xml, 'message') || extractTag(xml, 'error') || ''
      const fullError = errorMsg || xml.substring(0, 300) || 'Erreur Boxtal (' + res.status + ')'
      console.error('[Boxtal Ship] Erreur ' + res.status + ':', fullError)
      console.error('[Boxtal Ship] XML complet:', xml)
      return Response.json({ error: fullError }, { status: 200 })
    }

    // ─── Parser la réponse ───
    const result = parseOrderResponse(xml, boxtal)

    console.log('[Boxtal Ship] Succès:', result)

    return Response.json(result)
  } catch (error) {
    console.error('[Boxtal Ship] Erreur serveur:', error)
    return Response.json({ error: 'Erreur serveur lors de la création de l\'envoi' }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// PARSER RÉPONSE /order
// ═══════════════════════════════════════════════════════

function parseOrderResponse(xml, boxtal) {
  const result = {
    success: true,
    reference: null,
    tracking: null,
    label_url: null,
    carrier: null,
    service: null,
    price: null,
  }

  // Référence Boxtal de la commande
  result.reference = extractTag(xml, 'reference') || null

  // Labels (URLs des étiquettes)
  const labelMatches = xml.match(/<label>([^<]+)<\/label>/g)
  if (labelMatches && labelMatches.length > 0) {
    // La première URL est l'étiquette principale
    let labelUrl = labelMatches[0].replace(/<\/?label>/g, '').trim()
    labelUrl = decodeXMLEntities(labelUrl)

    // L'URL de l'étiquette nécessite l'authentification Basic Auth
    // On crée une URL proxy pour la télécharger sans exposer les credentials
    // En attendant, on stocke l'URL brute + les credentials seront ajoutées au téléchargement
    result.label_url = labelUrl

    // Si c'est une URL Boxtal, on la proxifie
    if (labelUrl.includes('envoimoinscher.com')) {
      // On encode l'URL + auth pour le proxy de téléchargement
      const authStr = Buffer.from(`${boxtal.user}:${boxtal.pass}`).toString('base64')
      result.label_url = `/api/boxtal/label?url=${encodeURIComponent(labelUrl)}&auth=${encodeURIComponent(authStr)}`
    }
  }

  // Carrier info
  const operatorBlock = xml.match(/<operator>([\s\S]*?)<\/operator>/)
  if (operatorBlock) {
    result.carrier = extractTag(operatorBlock[1], 'label') || null
  }

  const serviceBlock = xml.match(/<service>([\s\S]*?)<\/service>/)
  if (serviceBlock) {
    result.service = extractTag(serviceBlock[1], 'label') || null
  }

  // Prix
  const priceBlock = xml.match(/<price>([\s\S]*?)<\/price>/)
  if (priceBlock) {
    result.price = extractTag(priceBlock[1], 'tax-inclusive') || null
  }

  // Numéro de suivi (sera envoyé via callback, mais on essaie de le récupérer)
  result.tracking = result.reference

  return result
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function formatPhone(phone) {
  // Boxtal veut le format international sans + (ex: 33612345678)
  let clean = phone.replace(/[\s.-]/g, '')
  if (clean.startsWith('+33')) {
    clean = '33' + clean.slice(3)
  } else if (clean.startsWith('0')) {
    clean = '33' + clean.slice(1)
  }
  return clean
}

function extractTag(xml, tagName) {
  const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`)
  const match = xml.match(regex)
  if (!match) return null
  const val = match[1].trim()
  return val === '' || val === 'null' ? null : decodeXMLEntities(val)
}

function decodeXMLEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}
