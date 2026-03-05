// ═══════════════════════════════════════════════════════
// /app/api/boxtal/quote/route.js
// API Route — Cotation Boxtal (compare les transporteurs)
// Appelée par le dashboard pro quand elle clique "Comparer les transporteurs"
// ═══════════════════════════════════════════════════════

export async function POST(request) {
  try {
    const body = await request.json()
    const { boxtal, recipient, parcel } = body

    if (!boxtal?.user || !boxtal?.pass) {
      return Response.json({ error: 'Identifiants Boxtal manquants. Va dans Parametres pour les configurer.' }, { status: 400 })
    }

    // ─── Construire l'URL de cotation ───
    const baseUrl = boxtal.testMode
      ? 'https://test.envoimoinscher.com/api/v1'
      : 'https://www.envoimoinscher.com/api/v1'

    const params = new URLSearchParams()

    // Expéditeur (la vendeuse pro)
    params.append('expediteur.type', 'entreprise')
    params.append('expediteur.pays', 'FR')
    params.append('expediteur.code_postal', boxtal.senderZip || '75001')
    params.append('expediteur.ville', boxtal.senderCity || 'Paris')

    // Destinataire (la cliente)
    params.append('destinataire.type', 'particulier')
    params.append('destinataire.pays', recipient.country || 'FR')
    params.append('destinataire.code_postal', recipient.zipcode || '')
    params.append('destinataire.ville', recipient.city || '')

    // Colis
    params.append('colis_1.poids', String(parcel.weight || 0.5))
    params.append('colis_1.longueur', String(parcel.length || 30))
    params.append('colis_1.largeur', String(parcel.width || 20))
    params.append('colis_1.hauteur', String(parcel.height || 10))

    // Contenu : 10120 = Vêtements
    params.append('code_contenu', '10120')

    const url = `${baseUrl}/cotation?${params.toString()}`
    const auth = Buffer.from(`${boxtal.user}:${boxtal.pass}`).toString('base64')

    console.log('[Boxtal Quote] Requête cotation:', url)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/xml',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[Boxtal Quote] Erreur ${res.status}:`, errorText)

      // Parser l'erreur XML
      const errorMsg = extractTag(errorText, 'message') || `Erreur Boxtal (${res.status})`
      return Response.json({ error: errorMsg, quotes: [] }, { status: 200 })
    }

    const xml = await res.text()
    console.log(`[Boxtal Quote] Réponse reçue (${xml.length} chars)`)

    // ─── Parser les devis ───
    const allQuotes = parseQuotesXML(xml)
    const quotes = allQuotes.filter(q => {
      if (q.operator_code !== 'MONR') return false
      const label = (q.service_label || '').toLowerCase() + ' ' + (q.delivery_type || '').toLowerCase()
      if (label.includes('domicile')) return false
      return true
    })
    console.log('[Boxtal Quote] ' + allQuotes.length + ' total, ' + quotes.length + ' Mondial Relay Point Relais')

    return Response.json({ quotes })
  } catch (error) {
    console.error('[Boxtal Quote] Erreur serveur:', error)
    return Response.json({ error: 'Erreur serveur lors de la cotation', quotes: [] }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// PARSER XML COTATION → JSON
// ═══════════════════════════════════════════════════════

function parseQuotesXML(xml) {
  const quotes = []

  // Chaque offre est dans un <offer>...</offer>
  const offerBlocks = xml.match(/<offer>([\s\S]*?)<\/offer>/g)
  if (!offerBlocks) return quotes

  for (const block of offerBlocks) {
    const inner = block.replace(/<\/?offer>/g, '')

    // Operator
    const operatorBlock = inner.match(/<operator>([\s\S]*?)<\/operator>/)
    const operatorCode = operatorBlock ? extractTag(operatorBlock[1], 'code') : null
    const operatorLabel = operatorBlock ? extractTag(operatorBlock[1], 'label') : null
    const operatorLogo = operatorBlock ? extractTag(operatorBlock[1], 'logo') : null

    // Service
    const serviceBlock = inner.match(/<service>([\s\S]*?)<\/service>/)
    const serviceCode = serviceBlock ? extractTag(serviceBlock[1], 'code') : null
    const serviceLabel = serviceBlock ? extractTag(serviceBlock[1], 'label') : null

    // Prix
    const priceBlock = inner.match(/<price>([\s\S]*?)<\/price>/)
    const priceHT = priceBlock ? extractTag(priceBlock[1], 'tax-exclusive') : null
    const priceTTC = priceBlock ? extractTag(priceBlock[1], 'tax-inclusive') : null

    // Delivery
    const deliveryBlock = inner.match(/<delivery>([\s\S]*?)<\/delivery>/)
    let deliveryType = ''
    let deliveryDelay = ''
    if (deliveryBlock) {
      deliveryDelay = extractTag(deliveryBlock[1], 'label') || ''
      const typeBlock = deliveryBlock[1].match(/<type>([\s\S]*?)<\/type>/)
      if (typeBlock) {
        deliveryType = extractTag(typeBlock[1], 'label') || ''
      }
    }

    // Collection
    const collectionBlock = inner.match(/<collection>([\s\S]*?)<\/collection>/)
    let collectionType = ''
    if (collectionBlock) {
      const colTypeBlock = collectionBlock[1].match(/<type>([\s\S]*?)<\/type>/)
      if (colTypeBlock) {
        collectionType = extractTag(colTypeBlock[1], 'label') || ''
      }
    }

    // Characteristics
    const characteristics = []
    const charMatches = inner.match(/<characteristics>([\s\S]*?)<\/characteristics>/)
    if (charMatches) {
      const labels = charMatches[1].match(/<label>([^<]*)<\/label>/g)
      if (labels) {
        labels.forEach(l => {
          const val = l.replace(/<\/?label>/g, '').trim()
          if (val) characteristics.push(val)
        })
      }
    }

    if (operatorCode && serviceCode && priceTTC) {
      quotes.push({
        operator_code: operatorCode,
        operator_label: operatorLabel || operatorCode,
        logo: operatorLogo || null,
        service_code: serviceCode,
        service_label: serviceLabel || serviceCode,
        price_ht: parseFloat(priceHT) || 0,
        price_ttc: parseFloat(priceTTC) || 0,
        delivery_type: deliveryType,
        delivery_delay: deliveryDelay,
        collection_type: collectionType,
        characteristics,
      })
    }
  }

  // Trier par prix TTC croissant
  quotes.sort((a, b) => a.price_ttc - b.price_ttc)

  return quotes
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
