import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripe'
import { createServerSupabase } from '../../../lib/supabase'

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

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
