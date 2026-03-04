// ═══════════════════════════════════════════════════════
// /app/api/boxtal/webhook/route.js
// API Route — Webhook Boxtal (callbacks de suivi)
// Reçoit les mises à jour de tracking et met à jour
// le statut de la commande dans Supabase
// ═══════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const ref = searchParams.get('ref')
    const etat = searchParams.get('etat')
    const text = searchParams.get('text')
    const carrierRef = searchParams.get('carrier_reference')
    const labelUrl = searchParams.get('label_url')
    const envoi = searchParams.get('envoi')

    console.log(`[Boxtal Webhook] type=${type} ref=${ref} etat=${etat} text=${text}`)

    if (!ref) {
      return new Response('OK', { status: 200 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // ─── Callback type "status" : documents et référence transporteur ───
    if (type === 'status') {
      const update = {}
      if (carrierRef) update.tracking_number = carrierRef
      if (labelUrl) update.shipping_label_url = labelUrl

      if (Object.keys(update).length > 0) {
        await supabase
          .from('orders')
          .update(update)
          .eq('reference', ref)
        console.log(`[Boxtal Webhook] Commande ${ref} mise à jour (tracking/label)`)
      }
    }

    // ─── Callback type "tracking" : mise à jour du suivi ───
    if (type === 'tracking') {
      const update = { tracking_text: text || '' }

      // Mettre à jour le statut selon l'état Boxtal
      if (etat === 'LIV') {
        update.status = 'delivered'
        update.delivered_at = new Date().toISOString()
      } else if (etat === 'ENV') {
        update.status = 'shipped'
      } else if (etat === 'ANN') {
        update.status = 'cancelled'
      }

      await supabase
        .from('orders')
        .update(update)
        .eq('reference', ref)
      console.log(`[Boxtal Webhook] Commande ${ref} tracking: ${etat} - ${text}`)
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('[Boxtal Webhook] Erreur:', error)
    return new Response('OK', { status: 200 }) // Toujours retourner 200 pour éviter les retries
  }
}
