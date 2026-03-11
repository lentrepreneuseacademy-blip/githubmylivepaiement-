// /app/api/admin/route.js
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

async function supabaseFetch(path) {
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
  })
  return res.json()
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'get_dashboard') {
      const [shops, orders] = await Promise.all([
        supabaseFetch('shops?select=*&order=created_at.desc'),
        supabaseFetch('orders?select=*&order=created_at.desc&limit=1000'),
      ])

      const s = shops || []
      const o = orders || []
      const paid = o.filter(x => x.status === 'paid' || x.status === 'shipped' || x.status === 'delivered')
      const active = s.filter(x => x.subscription_status === 'active')

      // Revenue by day (last 30 days)
      const revenueByDay = {}
      const signupsByDay = {}
      const now = new Date()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        revenueByDay[key] = 0
        signupsByDay[key] = 0
      }
      paid.forEach(x => {
        const day = (x.created_at || '').slice(0, 10)
        if (revenueByDay[day] !== undefined) revenueByDay[day] += parseFloat(x.total_amount) || 0
      })
      s.forEach(x => {
        const day = (x.created_at || '').slice(0, 10)
        if (signupsByDay[day] !== undefined) signupsByDay[day]++
      })

      // Revenue by shop
      const revenueByShop = {}
      paid.forEach(x => {
        if (!revenueByShop[x.shop_id]) revenueByShop[x.shop_id] = { revenue: 0, orders: 0 }
        revenueByShop[x.shop_id].revenue += parseFloat(x.total_amount) || 0
        revenueByShop[x.shop_id].orders++
      })

      return Response.json({
        shops: s,
        orders: o,
        stats: {
          totalShops: s.length,
          activeSubscriptions: active.length,
          mrr: active.length * 27,
          totalOrders: o.length,
          paidOrders: paid.length,
          totalRevenue: Math.round(paid.reduce((sum, x) => sum + (parseFloat(x.total_amount) || 0), 0) * 100) / 100,
          todayRevenue: Math.round((paid.filter(x => (x.created_at || '').slice(0, 10) === now.toISOString().slice(0, 10)).reduce((sum, x) => sum + (parseFloat(x.total_amount) || 0), 0)) * 100) / 100,
          todayOrders: o.filter(x => (x.created_at || '').slice(0, 10) === now.toISOString().slice(0, 10)).length,
          pendingOrders: o.filter(x => x.status === 'pending_payment').length,
        },
        revenueByDay,
        signupsByDay,
        revenueByShop,
      })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[Admin API]', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
