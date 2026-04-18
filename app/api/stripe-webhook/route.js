import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabase } from '../../../lib/supabase'

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  // Deux stripe clients : plateforme + admin (compte perso)
  const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  const adminStripe = process.env.ADMIN_STRIPE_SECRET_KEY
    ? new Stripe(process.env.ADMIN_STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
    : null

  let event = null
  let verifiedWith = null

  // Essayer de verifier avec le secret de la plateforme
  try {
    event = platformStripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
    verifiedWith = 'platform'
  } catch (err) {
    // Essayer avec le secret admin
    if (adminStripe && process.env.ADMIN_STRIPE_WEBHOOK_SECRET) {
      try {
        event = adminStripe.webhooks.constructEvent(body, sig, process.env.ADMIN_STRIPE_WEBHOOK_SECRET)
        verifiedWith = 'admin'
      } catch (err2) {
        console.error('Webhook signature verification failed (both):', err.message, err2.message)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
      }
    } else {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  console.log('[Webhook] Received event', event.type, 'verified with', verifiedWith)

  const supabase = createServerSupabase()

  switch (event.type) {
    // ═══ CLIENT PAYMENT SUCCESS ═══
    case 'checkout.session.completed': {
      const session = event.data.object
      const { order_id, shop_id, shipping_method } = session.metadata || {}

      if (order_id) {
        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent,
          })
          .eq('id', order_id)

        // Increment client order count
        const { data: order } = await supabase
          .from('orders')
          .select('client_email, shop_id')
          .eq('id', order_id)
          .single()

        if (order?.client_email) {
          try {
            await supabase.rpc('increment_client_orders', {
              p_shop_id: order.shop_id,
              p_email: order.client_email,
            })
          } catch(e) { console.log('[Webhook] increment_client_orders skipped:', e.message) }
        }
      }
      break
    }

    // ═══ PRO SUBSCRIPTION EVENTS ═══
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const { shop_id } = subscription.metadata || {}

      if (shop_id) {
        await supabase
          .from('shops')
          .update({
            subscription_status: subscription.status,
            stripe_subscription_id: subscription.id,
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', shop_id)
      }
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      const { shop_id } = subscription.metadata || {}

      if (shop_id) {
        await supabase
          .from('shops')
          .update({
            subscription_status: 'cancelled',
          })
          .eq('id', shop_id)
      }
      break
    }

    // ═══ PAYMENT FAILED ═══
    case 'payment_intent.payment_failed': {
      const intent = event.data.object
      console.error('Payment failed:', intent.id, intent.last_payment_error?.message)
      break
    }
  }

  return NextResponse.json({ received: true })
}
