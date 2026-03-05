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

    console.log('[Relays] user:', !!user, 'pass:', !!pass, 'test:', testMode)

    if (!user || !pass) {
      return Response.json({
        error: 'Boxtal non configure.',
        points: []
      })
    }

    const baseUrl = testMode
      ? 'https://test.envoimoinscher.com'
      : 'https://www.envoimoinscher.com'

    const auth = Buffer.from(user + ':' + pass).toString('base64')

    // Format: /api/v1/listpoints?carriers_code=MONR&pays=FR&code_postal=75017
    const url = baseUrl + '/api/v1/listpoints?carriers_code=MONR&pays=' + (country || 'FR') + '&code_postal=' + zipcode
    console.log('[Relays] URL:', url)

    const res = await fetch(url, {
      headers: { 'Authorization': 'Basic ' + auth }
    })
    console.log('[Relays] Status:', res.status)

    if (!res.ok) {
      const errText = await res.text()
      console.log('[Relays] Error body:', errText.substring(0, 300))
      return Response.json({ error: 'Erreur Boxtal (' + res.status + ')', points: [] })
    }

    const xml = await res.text()
    console.log('[Relays] XML length:', xml.length)

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
    return Response.json({ points: points, count: points.length })

  } catch (err) {
    console.error('[Relays] Error:', err)
    return Response.json({ error: 'Erreur: ' + (err.message || 'inconnue'), points: [] })
  }
}
