import { NextResponse } from 'next/server'
import { stripe } from '../../../lib/stripe'
import { createServerSupabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const body = await request.json()
    const { order_id, shop_id, amount, shipping_method, shipping_cost, client, return_url } = body

    const supabase = createServerSupabase()

    // Get shop info for Stripe Connect
    const { data: shop } = await supabase
      .from('shops')
      .select('stripe_account_id, name')
      .eq('id', shop_id)
      .single()

    if (!shop?.stripe_account_id) {
      return NextResponse.json({ error: 'Boutique non configurée pour les paiements' }, { status: 400 })
    }

    // Update order with client info
    await supabase
      .from('orders')
      .update({
        client_email: client.email,
        client_phone: client.phone,
        client_first_name: client.firstName,
        client_last_name: client.lastName,
        delivery_address: client.address,
        delivery_city: client.city,
        delivery_postal_code: client.zip,
        delivery_country: client.country || 'FR',
        shipping_method,
        shipping_cost,
        total: amount,
      })
      .eq('id', order_id)

    // Upsert client in clients table
    await supabase
      .from('clients')
      .upsert({
        shop_id,
        email: client.email,
        phone: client.phone,
        first_name: client.firstName,
        last_name: client.lastName,
        address: client.address,
        city: client.city,
        postal_code: client.zip,
        country: client.country || 'FR',
      }, { onConflict: 'shop_id, email' })

    // Create Stripe Checkout Session
    // Amount in cents
    const amountCents = Math.round(amount * 100)

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Commande ${shop.name}`,
            description: `Réf. ${body.reference || order_id}`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      // Send payment to pro's Stripe account
      payment_intent_data: {
        transfer_data: {
          destination: shop.stripe_account_id,
        },
        // 0% commission — full amount goes to pro
        // Only Stripe processing fees apply
      },
      customer_email: client.email,
      metadata: {
        order_id,
        shop_id,
        shipping_method,
      },
      success_url: return_url,
      cancel_url: return_url.replace('success=true', 'cancelled=true'),
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
