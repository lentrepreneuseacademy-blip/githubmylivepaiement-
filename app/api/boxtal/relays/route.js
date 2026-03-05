import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { shopId, zipcode, country } = body

    if (!zipcode || zipcode.length < 5) {
      return Response.json({ error: 'Code postal invalide', points: [] })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    let user = ''
    let pass = ''
    let testMode = false

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
          user = config.user || ''
          pass = config.pass || ''
          testMode = config.testMode || false
        } catch(e) {}
      }
    }

    if (!user || !pass) {
      return Response.json({ error: 'Boxtal non configure.', points: [] })
    }

    const baseUrl = testMode
      ? 'https://test.envoimoinscher.com'
      : 'https://www.envoimoinscher.com'

    const auth = Buffer.from(user + ':' + pass).toString('base64')
    const headers = { 'Authorization': 'Basic ' + auth }
    const cc = country || 'FR'

    // Try ALL possible URL/param combinations
    const urls = [
      baseUrl + '/api/v1/MONR/listpoints?pays=' + cc + '&cp=' + zipcode,
      baseUrl + '/api/v1/MONR/listpoints?pays=' + cc + '&postalcode=' + zipcode,
      baseUrl + '/api/v1/MONR/listpoints?pays=' + cc + '&code_postal=' + zipcode,
      baseUrl + '/api/v1/listpoints?carriers_code=MONR&pays=' + cc + '&cp=' + zipcode,
      baseUrl + '/api/v1/listpoints?carriers_code=MONR&pays=' + cc + '&postalcode=' + zipcode,
    ]

    for (let i = 0; i < urls.length; i++) {
      console.log('[Relays] Try ' + (i+1) + ':', urls[i])
      const res = await fetch(urls[i], { headers })
      console.log('[Relays] Try ' + (i+1) + ' Status:', res.status)

      if (res.ok) {
        const xml = await res.text()
        const points = parsePoints(xml)
        console.log('[Relays] SUCCESS with Try ' + (i+1) + ' — ' + points.length + ' points')
        return Response.json({ points, count: points.length })
      }

      // If 400/406, try next. If 401/403, stop (bad credentials)
      if (res.status === 401 || res.status === 403) {
        return Response.json({ error: 'Identifiants Boxtal invalides.', points: [] })
      }
    }

    // None worked
    console.log('[Relays] ALL attempts failed')
    return Response.json({ error: 'Points relais indisponibles', points: [] })

  } catch (err) {
    console.error('[Relays] Error:', err)
    return Response.json({ error: 'Erreur: ' + (err.message || 'inconnue'), points: [] })
  }
}

function parsePoints(xml) {
  const points = []
  const blocks = xml.match(/<point>([\s\S]*?)<\/point>/g)
  if (!blocks) return points
  for (const block of blocks) {
    const get = (tag) => {
      const m = block.match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>'))
      return m ? m[1].trim() : ''
    }
    const code = get('code')
    const name = get('name')
    if (code && name) {
      points.push({ code, name, address: get('address'), city: get('city'), zipcode: get('zipcode'), country: get('country'), phone: get('phone') })
    }
  }
  return points
}
