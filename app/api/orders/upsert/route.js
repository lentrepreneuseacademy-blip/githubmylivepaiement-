// ═══════════════════════════════════════════════════════
// /app/api/orders/upsert/route.js
// API Route — Créer / mettre à jour / lire les commandes
// Utilise l'API REST Supabase directement (pas de SDK)
// pour éviter les problèmes d'import
// ═══════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function supabaseRequest(method, table, params) {
  var url = SUPABASE_URL + '/rest/v1/' + table
  var headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'return=representation',
  }

  if (params.filters) {
    var filterParts = []
    for (var key in params.filters) {
      filterParts.push(key + '=eq.' + encodeURIComponent(params.filters[key]))
    }
    url = url + '?' + filterParts.join('&')
  }

  if (params.select) {
    url = url + (url.indexOf('?') > -1 ? '&' : '?') + 'select=' + params.select
  }

  if (params.order) {
    url = url + (url.indexOf('?') > -1 ? '&' : '?') + 'order=' + params.order
  }

  if (params.limit) {
    url = url + (url.indexOf('?') > -1 ? '&' : '?') + 'limit=' + params.limit
  }

  if (params.single) {
    headers['Accept'] = 'application/vnd.pgrst.object+json'
  }

  var fetchOptions = { method: method, headers: headers }
  if (params.body && (method === 'POST' || method === 'PATCH')) {
    fetchOptions.body = JSON.stringify(params.body)
  }

  var res = await fetch(url, fetchOptions)
  var text = await res.text()

  if (!res.ok) {
    console.error('[Supabase] Erreur ' + res.status + ':', text)
    return { data: null, error: text }
  }

  try {
    return { data: JSON.parse(text), error: null }
  } catch (e) {
    return { data: null, error: 'Parse error: ' + text }
  }
}

export async function POST(request) {
  try {
    var body = await request.json()
    var action = body.action

    console.log('[Orders API] Action:', action)

    // ─── CREATE — Créer ou mettre à jour la commande ───
    if (action === 'create') {
      var order = body.order
      var orderId = body.orderId

      if (!order || !order.shop_id) {
        return Response.json({ error: 'Données commande manquantes' }, { status: 400 })
      }

      var result
      if (orderId) {
        result = await supabaseRequest('PATCH', 'orders', {
          filters: { id: orderId },
          body: order,
        })
      } else {
        result = await supabaseRequest('POST', 'orders', {
          body: order,
        })
      }

      if (result.error) {
        return Response.json({ error: result.error }, { status: 500 })
      }

      var savedOrder = Array.isArray(result.data) ? result.data[0] : result.data
      console.log('[Orders API] Commande sauvée:', savedOrder?.id)
      return Response.json({ order: savedOrder })
    }

    // ─── MARK_PAID — Marquer comme payée ───
    if (action === 'mark_paid') {
      var reference = body.reference
      var shopId = body.shopId

      if (!reference || !shopId) {
        return Response.json({ error: 'Référence ou shopId manquant' }, { status: 400 })
      }

      var result2 = await supabaseRequest('PATCH', 'orders', {
        filters: { reference: reference, shop_id: shopId },
        body: { status: 'paid', paid_at: new Date().toISOString() },
      })

      var paidOrder = Array.isArray(result2.data) ? result2.data[0] : result2.data
      console.log('[Orders API] Commande payée:', paidOrder?.id)
      return Response.json({ order: paidOrder })
    }

    // ─── LOOKUP — Chercher une commande par référence ───
    if (action === 'lookup') {
      var ref = body.reference
      var sid = body.shopId

      if (!ref || !sid) {
        return Response.json({ order: null })
      }

      var result3 = await supabaseRequest('GET', 'orders', {
        filters: { reference: ref, shop_id: sid },
        select: '*',
        single: true,
      })

      return Response.json({ order: result3.data || null })
    }

    // ─── GET_CLIENT_ORDERS — Commandes d'un client ───
    if (action === 'get_client_orders') {
      var email = body.email
      var shopId2 = body.shop_id

      if (!email || !shopId2) {
        return Response.json({ orders: [] })
      }

      var result4 = await supabaseRequest('GET', 'orders', {
        filters: { shop_id: shopId2, client_email: email },
        select: '*',
        order: 'created_at.desc',
      })

      return Response.json({ orders: result4.data || [] })
    }

    // ─── UPDATE_STATUS — Mettre à jour le statut d'une commande ───
    if (action === 'update_status') {
      var updateOrderId = body.orderId
      var updateFields = body.fields || {}

      if (!updateOrderId) {
        return Response.json({ error: 'orderId manquant' }, { status: 400 })
      }

      var result7 = await supabaseRequest('PATCH', 'orders', {
        filters: { id: updateOrderId },
        body: updateFields,
      })

      var updatedOrder = Array.isArray(result7.data) ? result7.data[0] : result7.data
      return Response.json({ order: updatedOrder })
    }

    // ─── LIST_SHOP_ORDERS — Toutes les commandes d'un shop (pour dashboard) ───
    if (action === 'list_shop_orders') {
      var shopId3 = body.shop_id

      if (!shopId3) {
        return Response.json({ orders: [] })
      }

      var result5 = await supabaseRequest('GET', 'orders', {
        filters: { shop_id: shopId3 },
        select: '*',
        order: 'created_at.desc',
        limit: body.limit || 200,
      })

      return Response.json({ orders: result5.data || [] })
    }

    // ─── LIST_SHOP_CLIENTS — Tous les clients d'un shop (pour dashboard) ───
    if (action === 'list_shop_clients') {
      var shopId4 = body.shop_id

      if (!shopId4) {
        return Response.json({ clients: [] })
      }

      var result6 = await supabaseRequest('GET', 'clients', {
        filters: { shop_id: shopId4 },
        select: '*',
        order: 'created_at.desc',
      })

      return Response.json({ clients: result6.data || [] })
    }

    return Response.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (error) {
    console.error('[Orders API] Erreur serveur:', error)
    return Response.json({ error: 'Erreur serveur: ' + error.message }, { status: 500 })
  }
}
