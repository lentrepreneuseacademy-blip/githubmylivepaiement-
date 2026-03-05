import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { shopId, zipcode, country, city, address } = body

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

    const params = new URLSearchParams()
    params.append('pays', country || 'FR')
    params.append('cp', zipcode)
    if (city) params.append('ville', city)

    const url = baseUrl + '/api/v1/MONR/listpoints?' + params.toString()
    console.log('[Relays] URL:', url)

    const res = await fetch(url, {
      headers: { 'Authorization': 'Basic ' + auth }
    })

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
          points.push({ code, name, address: get('address'), city: get('city'), zipcode: get('zipcode'), country: get('country'), phone: get('phone') })
        }
      }
    }

    console.log('[Relays] Points:', points.length)
    return Response.json({ points, count: points.length })

  } catch (err) {
    console.error('[Relays] Error:', err)
    return Response.json({ error: 'Erreur: ' + (err.message || 'inconnue'), points: [] })
  }
}
