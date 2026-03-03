import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { orderId, amount, shopId, customerEmail, reference, shopSlug } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
    }

    // Get shop's Stripe account
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: shop } = await supabase.from('shops').select('stripe_account_id, name').eq('id', shopId).single()

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://mylivepaiement.vercel.app'

    const sessionParams = {
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: customerEmail,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: reference || 'Commande ' + (shop?.name || 'Live Shop'),
            description: 'Commande ' + reference + ' — ' + (shop?.name || ''),
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      success_url: origin + '/pay/' + shopSlug + '?success=true&ref=' + reference,
      cancel_url: origin + '/pay/' + shopSlug + '?cancelled=true',
      metadata: {
        order_id: orderId || '',
        shop_id: shopId || '',
        reference: reference || '',
      },
    }

    // If shop has Stripe Connect, use it
    if (shop?.stripe_account_id) {
      sessionParams.payment_intent_data = {
        application_fee_amount: 0, // 0% commission
        transfer_data: {
          destination: shop.stripe_account_id,
        },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // Update order with checkout session id
    if (orderId) {
      await supabase.from('orders').update({ stripe_checkout_id: session.id }).eq('id', orderId)
    }

    return NextResponse.json({ url: session.url })

  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: err.message || 'Erreur Stripe' }, { status: 500 })
  }
}
