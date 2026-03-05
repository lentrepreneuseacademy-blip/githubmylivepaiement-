import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { shopId, zipcode, country } = body

    if (!zipcode || zipcode.length < 5) {
      return Response.json({ error: 'Code postal invalide', points: [] })
    }

    // Read shop's boxtal config from Supabase (same method as quote route)
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

    console.log('[Relays] user:', !!user, 'pass:', !!pass, 'test:', testMode)

    if (!user || !pass) {
      return Response.json({
        error: 'Boxtal non configure. Le point relais te sera communique par email.',
        points: []
      })
    }

    const baseUrl = testMode
      ? 'https://test.envoimoinscher.com'
      : 'https://www.envoimoinscher.com'

    const auth = Buffer.from(user + ':' + pass).toString('base64')
    const params = 'pays=' + (country || 'FR') + '&code_postal=' + zipcode

    // Try URL format 1: /api/v1/MONR/listpoints
    const url1 = baseUrl + '/api/v1/MONR/listpoints?' + params
    console.log('[Relays] Try 1:', url1)
    let res = await fetch(url1, { headers: { 'Authorization': 'Basic ' + auth } })

    // If 406, try format 2: /api/v1/listpoints?carriers_code=MONR
    if (res.status === 406) {
      const url2 = baseUrl + '/api/v1/listpoints?carriers_code=MONR&' + params
      console.log('[Relays] Try 2:', url2)
      res = await fetch(url2, { headers: { 'Authorization': 'Basic ' + auth } })
    }

    console.log('[Relays] Status:', res.status)

    if (res.status === 401) {
      return Response.json({
        error: 'Identifiants Boxtal invalides. Va sur boxtal.com > Mon compte > API pour trouver tes cles API.',
        points: []
      })
    }

    if (!res.ok) {
      return Response.json({ error: 'Erreur Boxtal (' + res.status + ')', points: [] })
    }

    const xml = await res.text()
    const points = []
    const blocks = xml.match(/<point>([\s\S]*?)<\/point>/g)
    if (blocks) {
      for (const block of blocks) {
        const get = (tag) => {
          const m = block.match(new RegExp('<' + tag + '>([^<]*)</' + tag + '>'))
          return m ? m[1].trim() : ''
        }
        const code = get('code')
        const name = get('name')
        if (code && name) {
          points.push({
            code, name,
            address: get('address'),
            city: get('city'),
            zipcode: get('zipcode'),
            country: get('country'),
            phone: get('phone'),
          })
        }
      }
    }

    console.log('[Relays] Found:', points.length, 'points')
    return Response.json({ points: points, count: points.length })

  } catch (err) {
    console.error('[Relays] Error:', err)
    return Response.json({ error: 'Erreur: ' + (err.message || 'inconnue'), points: [] })
  }
}
