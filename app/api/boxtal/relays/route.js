// ═══════════════════════════════════════════════════════
// /app/api/boxtal/relays/route.js
// API Route - Points Relais Boxtal (Mondial Relay)
// ═══════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { shopId, zipcode, country, city, address } = body

    if (!zipcode || zipcode.length < 5) {
      return Response.json({ error: 'Code postal invalide', points: [] }, { status: 400 })
    }

    // ─── Récupérer les credentials Boxtal ───
    // Priorité : config boutique > variables d'environnement
    let accessKey = process.env.BOXTAL_ACCESS_KEY || ''
    let secretKey = process.env.BOXTAL_SECRET_KEY || ''
    let isTest = process.env.BOXTAL_ENV !== 'production'

    if (shopId) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )
        const { data: shop } = await supabase
          .from('shops')
          .select('boxtal_config')
          .eq('id', shopId)
          .single()

        if (shop?.boxtal_config) {
          const config = typeof shop.boxtal_config === 'string'
            ? JSON.parse(shop.boxtal_config)
            : shop.boxtal_config
          if (config.accessKey) accessKey = config.accessKey
          if (config.secretKey) secretKey = config.secretKey
          if (config.env === 'production') isTest = false
          if (config.env === 'test') isTest = true
        }
      } catch (e) {
        console.error('[Boxtal] Erreur lecture config boutique:', e.message)
      }
    }

    if (!accessKey || !secretKey) {
      return Response.json({
        error: 'Credentials Boxtal non configurés. Ajoutez BOXTAL_ACCESS_KEY et BOXTAL_SECRET_KEY dans vos variables d\'environnement.',
        points: []
      }, { status: 500 })
    }

    // ─── Construire l'URL de l'API Boxtal ───
    const baseUrl = isTest
      ? 'https://test.envoimoinscher.com/api/v1'
      : 'https://www.envoimoinscher.com/api/v1'

    const params = new URLSearchParams()
    params.append('pays', country || 'FR')
    params.append('cp', zipcode)
    if (city) params.append('ville', city)
    if (address) params.append('adresse', address)

    // On demande Mondial Relay (MONR) par défaut
    // Tu peux ajouter d'autres transporteurs ici : CHRP, SOGP, COPR, UPSE
    const carrierCode = 'MONR'

    const url = `${baseUrl}/${carrierCode}/listpoints?${params.toString()}`
    const auth = Buffer.from(`${accessKey}:${secretKey}`).toString('base64')

    console.log(`[Boxtal] Requête: ${url}`)

    // ─── Appeler l'API Boxtal ───
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/xml',
      },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error(`[Boxtal] Erreur ${res.status}:`, errorText)
      return Response.json({
        error: `Erreur Boxtal (${res.status})`,
        details: errorText,
        points: []
      }, { status: res.status })
    }

    const xml = await res.text()
    console.log(`[Boxtal] Réponse reçue (${xml.length} chars)`)

    // ─── Parser le XML en JSON ───
    const points = parseRelayPointsXML(xml)

    console.log(`[Boxtal] ${points.length} points relais trouvés`)

    return Response.json({ points })
  } catch (error) {
    console.error('[Boxtal] Erreur serveur:', error)
    return Response.json({
      error: 'Erreur serveur lors de la recherche de points relais',
      points: []
    }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════
// PARSER XML → JSON
// ═══════════════════════════════════════════════════════

function parseRelayPointsXML(xml) {
  const points = []

  // Extraire chaque bloc <point>...</point>
  const pointBlocks = xml.match(/<point>([\s\S]*?)<\/point>/g)
  if (!pointBlocks) return points

  for (const block of pointBlocks) {
    const inner = block.replace(/<\/?point>/g, '')

    const point = {
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

    // Ne garder que les points valides (avec un code et un nom)
    if (point.code && point.name) {
      points.push(point)
    }
  }

  return points
}

function extractTag(xml, tagName) {
  // Gère les tags simples <tag>valeur</tag>
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

function parseSchedule(xml) {
  const schedule = []
  const dayBlocks = xml.match(/<day>([\s\S]*?)<\/day>/g)
  if (!dayBlocks) return schedule

  const dayNames = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

  for (const block of dayBlocks) {
    const inner = block.replace(/<\/?day>/g, '')
    const weekday = parseInt(extractTag(inner, 'weekday')) || 0
    const openAm = extractTag(inner, 'open_am')
    const closeAm = extractTag(inner, 'close_am')
    const openPm = extractTag(inner, 'open_pm')
    const closePm = extractTag(inner, 'close_pm')

    if (weekday >= 1 && weekday <= 7) {
      let hours = ''
      if (openAm && closeAm) {
        hours = `${openAm}-${closeAm}`
        if (openPm && closePm) {
          hours += ` / ${openPm}-${closePm}`
        }
      }
      schedule.push({
        day: dayNames[weekday],
        weekday,
        hours,
        openAm,
        closeAm,
        openPm,
        closePm,
      })
    }
  }

  return schedule.sort((a, b) => a.weekday - b.weekday)
}
