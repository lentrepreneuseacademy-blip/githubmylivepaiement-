// ═══════════════════════════════════════════════════════
// /app/api/orders/upsert/route.js
// API Route — Créer ou mettre à jour une commande
// Utilise la service_role_key pour bypasser le RLS
// Appelée par la page de paiement au moment du checkout
// ═══════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, order, orderId, reference, shopId } = body

    const supabase = getSupabase()

    // ─── ACTION: create — Créer ou mettre à jour la commande au checkout ───
    if (action === 'create') {
      if (!order || !order.shop_id) {
        return Response.json({ error: 'Données commande manquantes' }, { status: 400 })
      }

      let resultOrder = null

      if (orderId) {
        // Mettre à jour une commande existante
        const { data, error } = await supabase
          .from('orders')
          .update(order)
          .eq('id', orderId)
          .select()
          .single()

        if (error) {
          console.error('[Orders Upsert] Erreur update:', error.message)
          return Response.json({ error: error.message }, { status: 500 })
        }
        resultOrder = data
      } else {
        // Créer une nouvelle commande
        const { data, error } = await supabase
          .from('orders')
          .insert(order)
          .select()
          .single()

        if (error) {
          console.error('[Orders Upsert] Erreur insert:', error.message)
          return Response.json({ error: error.message }, { status: 500 })
        }
        resultOrder = data
      }

      console.log('[Orders Upsert] Commande sauvée:', resultOrder?.id, resultOrder?.reference)
      return Response.json({ order: resultOrder })
    }

    // ─── ACTION: mark_paid — Marquer comme payée (retour Stripe) ───
    if (action === 'mark_paid') {
      if (!reference || !shopId) {
        return Response.json({ error: 'Référence ou shopId manquant' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('reference', reference)
        .eq('shop_id', shopId)
        .select()
        .single()

      if (error) {
        console.error('[Orders Upsert] Erreur mark_paid:', error.message)
        return Response.json({ error: error.message }, { status: 500 })
      }

      console.log('[Orders Upsert] Commande payée:', data?.id, reference)
      return Response.json({ order: data })
    }

    // ─── ACTION: lookup — Chercher une commande par référence ───
    if (action === 'lookup') {
      if (!reference || !shopId) {
        return Response.json({ order: null })
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('reference', reference)
        .eq('shop_id', shopId)
        .single()

      if (error || !data) {
        return Response.json({ order: null })
      }

      return Response.json({ order: data })
    }

    // ─── ACTION: get_client_orders — Récupérer les commandes d'un client ───
    if (action === 'get_client_orders') {
      const { email, shop_id } = body

      if (!email || !shop_id) {
        return Response.json({ error: 'Email ou shop_id manquant' }, { status: 400 })
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', shop_id)
        .eq('client_email', email)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Orders Upsert] Erreur get_client_orders:', error.message)
        return Response.json({ error: error.message, orders: [] }, { status: 500 })
      }

      return Response.json({ orders: data || [] })
    }

    return Response.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (error) {
    console.error('[Orders Upsert] Erreur serveur:', error)
    return Response.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
