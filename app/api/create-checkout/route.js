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
    const { data: shop } = await supabase.from('shops').select('stripe_account_id, name, slug').eq('id', shopId).single()

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://mylivepaiement.vercel.app'

    // ─── ADMIN SHOP : utilise un compte Stripe direct (pas Connect) ───
    const adminShopSlug = (process.env.ADMIN_SHOP_SLUG || '').trim().toLowerCase()
    const currentSlug = (shopSlug || shop?.slug || '').trim().toLowerCase()
    const isAdminShop = adminShopSlug && currentSlug && adminShopSlug === currentSlug

    let stripe
    let sessionParams

    if (isAdminShop && process.env.ADMIN_STRIPE_SECRET_KEY) {
      // Paiement direct sur le compte Stripe personnel (virements immediats preserves)
      console.log('[Checkout] Admin shop detected, using direct Stripe account')
      stripe = new Stripe(process.env.ADMIN_STRIPE_SECRET_KEY)

      sessionParams = {
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
        success_url: origin + '/pay/' + shopSlug + '?success=true&ref=' + reference + '&orderId=' + (orderId || ''),
        cancel_url: origin + '/pay/' + shopSlug + '?cancelled=true',
        metadata: {
          order_id: orderId || '',
          shop_id: shopId || '',
          reference: reference || '',
          admin_shop: 'true',
        },
      }
    } else {
      // Plateforme : paiement via Stripe Connect vers le compte de la cliente
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

      sessionParams = {
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
        success_url: origin + '/pay/' + shopSlug + '?success=true&ref=' + reference + '&orderId=' + (orderId || ''),
        cancel_url: origin + '/pay/' + shopSlug + '?cancelled=true',
        metadata: {
          order_id: orderId || '',
          shop_id: shopId || '',
          reference: reference || '',
        },
      }

      // Si la boutique a un Stripe Connect, on route via Connect
      if (shop?.stripe_account_id) {
        sessionParams.payment_intent_data = {
          application_fee_amount: 0, // 0% commission
          transfer_data: {
            destination: shop.stripe_account_id,
          },
        }
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
