// ═══════════════════════════════════════════════════════
// /app/api/boxtal/relays/route.js
// API Route - Points Relais Boxtal (Mondial Relay)
// Version auto-detect : trouve le shop automatiquement
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function POST(request) {
  try {
    const body = await request.json()
    const { shopId, shopSlug, zipcode, country, city, address } = body

    // ─── Auto-detect slug depuis le Referer (ex: /pay/boutique-live-t) ───
    let detectedSlug = shopSlug || null
    if (!shopId && !detectedSlug) {
      try {
        const referer = request.headers.get('referer') || ''
        const match = referer.match(/\/pay\/([^?/]+)/)
        if (match) detectedSlug = match[1]
      } catch (e) {}
    }

    console.log('[Boxtal Relays] Requete — shopId:', shopId, 'shopSlug:', shopSlug, 'detectedSlug:', detectedSlug, 'zip:', zipcode, 'city:', city)

    if (!zipcode || zipcode.length < 5) {
      return Response.json({ error: 'Code postal invalide', points: [] }, { status: 400 })
    }

    // ─── Recuperer les credentials Boxtal ───
    let accessKey = ''
    let secretKey = ''
    let isTest = true
    let shopFound = false

    // Methode 1 : par ID
    if (shopId) {
      const result = await fetchShop('id=eq.' + encodeURIComponent(shopId))
      if (result) { accessKey = result.accessKey; secretKey = result.secretKey; isTest = result.isTest; shopFound = true }
    }

    // Methode 2 : par slug
    if (!shopFound && detectedSlug) {
      const result = await fetchShop('slug=eq.' + encodeURIComponent(detectedSlug))
      if (result) { accessKey = result.accessKey; secretKey = result.secretKey; isTest = result.isTest; shopFound = true }
    }

    // Methode 3 : prendre le premier shop qui a des credentials Boxtal
    if (!shopFound || (!accessKey && !secretKey)) {
      console.log('[Boxtal Relays] Fallback — recherche du premier shop avec boxtal_key...')
      const result = await fetchFirstShopWithBoxtal()
      if (result) { accessKey = result.accessKey; secretKey = result.secretKey; isTest = result.isTest; shopFound = true }
    }

    // Fallback sur les variables d environnement
    if (!accessKey) accessKey = process.env.BOXTAL_ACCESS_KEY || ''
    if (!secretKey) secretKey = process.env.BOXTAL_SECRET_KEY || ''
    if (process.env.BOXTAL_ENV === 'production') isTest = false

    console.log('[Boxtal Relays] Credentials finales — accessKey present:', !!accessKey, 'secretKey present:', !!secretKey, 'isTest:', isTest, 'shopFound:', shopFound)

    if (!accessKey || !secretKey) {
      return Response.json({
        error: 'La boutique n\'a pas encore configure Boxtal. Le point relais te sera communique par email.',
        points: [],
      }, { status: 200 })
    }

    // ─── Appeler l API Boxtal ───
    const baseUrl = isTest
      ? 'https://test.envoimoinscher.com/api/v1'
      : 'https://www.envoimoinscher.com/api/v1'

    const params = new URLSearchParams()
    params.append('pays', country || 'FR')
    params.append('cp', zipcode)
    if (city) params.append('ville', city)
    if (address) params.append('adresse', address)

    const url = baseUrl + '/MONR/listpoints?' + params.toString()
    const auth = Buffer.from(accessKey + ':' + secretKey).toString('base64')

    console.log('[Boxtal Relays] Appel API:', url)

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Accept': 'application/xml',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('[Boxtal Relays] Erreur', res.status, ':', errorText)
      return Response.json({ error: 'Erreur Boxtal (' + res.status + ')', details: errorText, points: [] }, { status: res.status })
    }

    const xml = await res.text()
    console.log('[Boxtal Relays] Reponse recue (' + xml.length + ' chars)')

    const points = parseRelayPointsXML(xml)
    console.log('[Boxtal Relays] ' + points.length + ' points relais trouves')

    return Response.json({ points })
  } catch (error) {
    console.error('[Boxtal Relays] Erreur serveur:', error)
    return Response.json({ error: 'Erreur serveur', points: [] }, { status: 500 })
  }
}

// ═══ Helpers pour lire le shop depuis Supabase ═══

async function fetchShop(filter) {
  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/shops?' + filter + '&select=id,slug,boxtal_key,boxtal_secret,boxtal_config,relay_price,colissimo_price',
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Accept': 'application/vnd.pgrst.object+json',
        },
      }
    )
    if (!res.ok) {
      console.error('[Boxtal Relays] fetchShop erreur', res.status, await res.text())
      return null
    }
    var shop = await res.json()
    console.log('[Boxtal Relays] Shop trouve:', shop?.slug, '— boxtal_key:', !!shop?.boxtal_key, 'boxtal_secret:', !!shop?.boxtal_secret, 'boxtal_config:', !!shop?.boxtal_config)
    return extractCredentials(shop)
  } catch (e) {
    console.error('[Boxtal Relays] fetchShop exception:', e.message)
    return null
  }
}

async function fetchFirstShopWithBoxtal() {
  try {
    var res = await fetch(
      SUPABASE_URL + '/rest/v1/shops?boxtal_key=not.is.null&select=id,slug,boxtal_key,boxtal_secret,boxtal_config,relay_price,colissimo_price&limit=1',
      {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
        },
      }
    )
    if (!res.ok) return null
    var data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      console.log('[Boxtal Relays] Fallback shop trouve:', data[0].slug)
      return extractCredentials(data[0])
    }
    return null
  } catch (e) {
    console.error('[Boxtal Relays] fetchFirstShop exception:', e.message)
    return null
  }
}

function extractCredentials(shop) {
  if (!shop) return null
  var accessKey = ''
  var secretKey = ''
  var isTest = true

  // Colonnes separees
  if (shop.boxtal_key) accessKey = shop.boxtal_key
  if (shop.boxtal_secret) secretKey = shop.boxtal_secret

  // Fallback JSON
  if ((!accessKey || !secretKey) && shop.boxtal_config) {
    try {
      var config = typeof shop.boxtal_config === 'string' ? JSON.parse(shop.boxtal_config) : shop.boxtal_config
      if (!accessKey && config.user) accessKey = config.user
      if (!secretKey && config.pass) secretKey = config.pass
      if (config.testMode === false) isTest = false
    } catch (e) {}
  }

  return { accessKey: accessKey, secretKey: secretKey, isTest: isTest }
}

// ═══ Parser XML ═══

function parseRelayPointsXML(xml) {
  var points = []
  var pointBlocks = xml.match(/<point>([\s\S]*?)<\/point>/g)
  if (!pointBlocks) return points

  for (var i = 0; i < pointBlocks.length; i++) {
    var inner = pointBlocks[i].replace(/<\/?point>/g, '')
    var point = {
      code: extractTag(inner, 'code'),
      name: extractTag(inner, 'name'),
      address: extractTag(inner, 'address'),
      city: extractTag(inner, 'city'),
      zipcode: extractTag(inner, 'zipcode'),
      country: extractTag(inner, 'country'),
      latitude: parseFloat(extractTag(inner, 'latitude')) || null,
      longitude: parseFloat(extractTag(inner, 'longitude')) || null,
      phone: extractTag(inner, 'phone'),
      description: extractTag(inner, 'description'),
      schedule: parseSchedule(inner),
    }
    if (point.code && point.name) points.push(point)
  }
  return points
}

function extractTag(xml, tagName) {
  var regex = new RegExp('<' + tagName + '>([^<]*)</' + tagName + '>')
  var match = xml.match(regex)
  if (!match) return null
  var val = match[1].trim()
  return val === '' || val === 'null' ? null : decodeXMLEntities(val)
}

function decodeXMLEntities(str) {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
}

function parseSchedule(xml) {
  var schedule = []
  var dayBlocks = xml.match(/<day>([\s\S]*?)<\/day>/g)
  if (!dayBlocks) return schedule
  var dayNames = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  for (var i = 0; i < dayBlocks.length; i++) {
    var inner = dayBlocks[i].replace(/<\/?day>/g, '')
    var weekday = parseInt(extractTag(inner, 'weekday')) || 0
    var openAm = extractTag(inner, 'open_am')
    var closeAm = extractTag(inner, 'close_am')
    var openPm = extractTag(inner, 'open_pm')
    var closePm = extractTag(inner, 'close_pm')
    if (weekday >= 1 && weekday <= 7) {
      var hours = ''
      if (openAm && closeAm) {
        hours = openAm + '-' + closeAm
        if (openPm && closePm) hours += ' / ' + openPm + '-' + closePm
      }
      schedule.push({ day: dayNames[weekday], weekday: weekday, hours: hours, openAm: openAm, closeAm: closeAm, openPm: openPm, closePm: closePm })
    }
  }
  return schedule.sort(function(a, b) { return a.weekday - b.weekday })
}
