// ═══════════════════════════════════════════════════════
// /app/api/boxtal/webhook/route.js
// API Route — Webhook Boxtal (callbacks de suivi)
// ═══════════════════════════════════════════════════════

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    var url = new URL(request.url)
    var type = url.searchParams.get('type')
    var ref = url.searchParams.get('ref')
    var etat = url.searchParams.get('etat')
    var text = url.searchParams.get('text')
    var carrierRef = url.searchParams.get('carrier_reference')
    var labelUrl = url.searchParams.get('label_url')

    console.log('[Boxtal Webhook] type=' + type + ' ref=' + ref + ' etat=' + etat)

    if (!ref) {
      return new Response('OK', { status: 200 })
    }

    var SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    var SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Build update payload
    var update = {}
    if (type === 'status') {
      if (carrierRef) update.tracking_number = carrierRef
      if (labelUrl) update.shipping_label_url = labelUrl
    }
    if (type === 'tracking') {
      if (text) update.tracking_text = text
      if (etat === 'LIV') { update.status = 'delivered'; update.delivered_at = new Date().toISOString() }
      else if (etat === 'ENV') { update.status = 'shipped' }
      else if (etat === 'ANN') { update.status = 'cancelled' }
    }

    if (Object.keys(update).length > 0) {
      await fetch(SUPABASE_URL + '/rest/v1/orders?reference=eq.' + encodeURIComponent(ref), {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      })
      console.log('[Boxtal Webhook] Commande ' + ref + ' mise a jour')
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('[Boxtal Webhook] Erreur:', error)
    return new Response('OK', { status: 200 })
  }
}
