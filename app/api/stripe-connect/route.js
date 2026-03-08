import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, shopId } = body
    const supabase = getSupabase()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://githubmylivepaiement.vercel.app'

    // ─── CREATE : Créer un compte Connect + lien d'onboarding ───
    if (action === 'create') {
      if (!shopId) return NextResponse.json({ error: 'shopId requis' }, { status: 400 })

      // Check if shop already has a Stripe account
      const { data: shop } = await supabase.from('shops').select('stripe_account_id, name').eq('id', shopId).single()

      let accountId = shop?.stripe_account_id

      if (!accountId) {
        // Create a new Stripe Connect Express account
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'FR',
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: 'individual',
          metadata: {
            shop_id: shopId,
            shop_name: shop?.name || '',
          },
        })
        accountId = account.id
        console.log('[Stripe Connect] Created account:', accountId, 'for shop:', shopId)

        // Save to DB
        await supabase.from('shops').update({ stripe_account_id: accountId }).eq('id', shopId)
      }

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: appUrl + '/dashboard?stripe=refresh',
        return_url: appUrl + '/dashboard?stripe=success',
        type: 'account_onboarding',
      })

      console.log('[Stripe Connect] Onboarding link created for:', accountId)
      return NextResponse.json({ url: accountLink.url, accountId: accountId })
    }

    // ─── STATUS : Vérifier le statut du compte Connect ───
    if (action === 'status') {
      if (!shopId) return NextResponse.json({ error: 'shopId requis' }, { status: 400 })

      const { data: shop } = await supabase.from('shops').select('stripe_account_id').eq('id', shopId).single()

      if (!shop?.stripe_account_id) {
        return NextResponse.json({ connected: false })
      }

      try {
        const account = await stripe.accounts.retrieve(shop.stripe_account_id)
        return NextResponse.json({
          connected: true,
          accountId: shop.stripe_account_id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          email: account.email || '',
        })
      } catch (e) {
        return NextResponse.json({ connected: false, error: e.message })
      }
    }

    // ─── DASHBOARD : Lien vers le dashboard Stripe Express ───
    if (action === 'dashboard') {
      if (!shopId) return NextResponse.json({ error: 'shopId requis' }, { status: 400 })

      const { data: shop } = await supabase.from('shops').select('stripe_account_id').eq('id', shopId).single()

      if (!shop?.stripe_account_id) {
        return NextResponse.json({ error: 'Pas de compte Stripe connecte' }, { status: 400 })
      }

      const loginLink = await stripe.accounts.createLoginLink(shop.stripe_account_id)
      return NextResponse.json({ url: loginLink.url })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  } catch (error) {
    console.error('[Stripe Connect] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
