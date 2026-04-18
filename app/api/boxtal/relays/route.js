import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { shopId, zipcode, country, city, lat, lng } = body

    if (!zipcode || zipcode.length < 5) {
      return Response.json({ error: 'Code postal invalide', points: [] })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    let enseigne = ''
    let privateKey = ''

    if (shopId) {
      const { data: shop } = await supabase
        .from('shops')
        .select('boxtal_config')
        .eq('id', shopId)
        .single()

      if (shop?.boxtal_config) {
        try {
          const config = typeof shop.boxtal_config === 'string'
            ? JSON.parse(shop.boxtal_config)
            : shop.boxtal_config
          enseigne = (config.mrEnseigne || '').toUpperCase().trim()
          privateKey = (config.mrPrivateKey || '').trim()
        } catch (e) {}
      }
    }

    if (!enseigne || !privateKey) {
      return Response.json({ error: 'Mondial Relay non configure.', points: [] })
    }

    // Mondial Relay WSI4_PointRelais_Recherche API
    const pays = (country || 'FR').toUpperCase()
    const cp = zipcode.trim()
    const nombreResultats = '10'

    // Signature: MD5(Enseigne + Pays + NumPointRelais + Ville + CP + Latitude + Longitude + RayonRecherche + TypeActivite + NombreResultats + PrivateKey)
    const toSign = enseigne + pays + '' + '' + cp + '' + '' + '' + '' + nombreResultats + privateKey
    const security = crypto.createHash('md5').update(toSign).digest('hex').toUpperCase()

    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <WSI4_PointRelais_Recherche xmlns="http://www.mondialrelay.fr/webservice/">
      <Enseigne>${enseigne}</Enseigne>
      <Pays>${pays}</Pays>
      <NumPointRelais></NumPointRelais>
      <Ville></Ville>
      <CP>${cp}</CP>
      <Latitude></Latitude>
      <Longitude></Longitude>
      <RayonRecherche></RayonRecherche>
      <TypeActivite></TypeActivite>
      <NombreResultats>${nombreResultats}</NombreResultats>
      <Security>${security}</Security>
    </WSI4_PointRelais_Recherche>
  </soap12:Body>
</soap12:Envelope>`

    const res = await fetch('https://api.mondialrelay.com/Web_Services.asmx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/soap+xml; charset=utf-8' },
      body: soapBody,
    })

    if (!res.ok) {
      return Response.json({ error: 'Erreur Mondial Relay (' + res.status + ')', points: [] })
    }

    const xml = await res.text()

    // Check Mondial Relay status code
    const statMatch = xml.match(/<STAT>([^<]*)<\/STAT>/)
    if (statMatch && statMatch[1] !== '0') {
      return Response.json({
        error: 'Mondial Relay a refuse (code ' + statMatch[1] + '). Verifie tes identifiants.',
        points: []
      })
    }

    // Parse point relais details
    const points = []
    const blocks = xml.match(/<PointRelais_Details>([\s\S]*?)<\/PointRelais_Details>/g)
    if (blocks) {
      for (const block of blocks) {
        const get = (tag) => {
          const m = block.match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>'))
          return m ? m[1].trim() : ''
        }
        const code = get('Num')
        const name = get('LgAdr1')
        if (code && name) {
          const latStr = get('Latitude').replace(',', '.')
          const lngStr = get('Longitude').replace(',', '.')
          points.push({
            code,
            name,
            address: [get('LgAdr2'), get('LgAdr3'), get('LgAdr4')].filter(Boolean).join(' '),
            city: get('Ville'),
            zipcode: get('CP'),
            country: get('Pays'),
            phone: '',
            lat: parseFloat(latStr) || null,
            lng: parseFloat(lngStr) || null,
          })
        }
      }
    }

    // Sort by distance if client lat/lng provided
    if (lat && lng) {
      const clientLat = parseFloat(lat)
      const clientLng = parseFloat(lng)
      for (const p of points) {
        if (p.lat && p.lng) {
          const dLat = (p.lat - clientLat) * 111.32
          const dLng = (p.lng - clientLng) * 111.32 * Math.cos(clientLat * Math.PI / 180)
          p.distance = Math.sqrt(dLat * dLat + dLng * dLng)
          p.distanceLabel = p.distance < 1
            ? Math.round(p.distance * 1000) + 'm'
            : p.distance.toFixed(1) + 'km'
        } else {
          p.distance = 9999
          p.distanceLabel = ''
        }
      }
      points.sort((a, b) => a.distance - b.distance)
    }

    console.log('[Relays MR] Points:', points.length)
    return Response.json({ points, count: points.length })
  } catch (err) {
    console.error('[Relays MR] Error:', err)
    return Response.json({ error: 'Erreur: ' + (err.message || 'inconnue'), points: [] })
  }
}
