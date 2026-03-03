import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripe'
import { createServerSupabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { shop_id, email } = body

    const supabase = createServerSupabase()

    // Get or create Stripe customer
    const { data: shop } = await supabase
      .from('shops')
      .select('stripe_customer_id, name')
      .eq('id', shop_id)
      .single()

    let customerId = shop?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: shop?.name,
        metadata: { shop_id },
      })
      customerId = customer.id

      await supabase
        .from('shops')
        .update({ stripe_customer_id: customerId })
        .eq('id', shop_id)
    }

    // Create checkout session for subscription (27€/month)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'MY LIVE PAIEMENT — Abonnement Pro',
            description: '0% commission · Toutes les fonctionnalités incluses',
          },
          unit_amount: 2700, // 27€
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: { shop_id },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Subscription error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
