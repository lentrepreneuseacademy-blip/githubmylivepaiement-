// ═══════════════════════════════════════════════════════
// /app/api/boxtal/label/route.js
// API Route — Proxy téléchargement étiquette PDF
// Télécharge l'étiquette depuis Boxtal avec l'auth,
// et la renvoie au navigateur de la pro en PDF
// ═══════════════════════════════════════════════════════

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const labelUrl = searchParams.get('url')
    const auth = searchParams.get('auth')

    if (!labelUrl) {
      return new Response('URL manquante', { status: 400 })
    }

    // ─── Télécharger l'étiquette depuis Boxtal ───
    const headers = {
      'Accept': 'application/pdf, image/*, */*',
    }

    if (auth) {
      headers['Authorization'] = `Basic ${auth}`
    }

    console.log('[Boxtal Label] Téléchargement:', labelUrl)

    const res = await fetch(labelUrl, { headers })

    if (!res.ok) {
      console.error(`[Boxtal Label] Erreur ${res.status}`)
      return new Response(`Erreur lors du téléchargement de l'étiquette (${res.status})`, { status: res.status })
    }

    // ─── Renvoyer le PDF au navigateur ───
    const contentType = res.headers.get('content-type') || 'application/pdf'
    const buffer = await res.arrayBuffer()

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="etiquette-expedition.pdf"',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[Boxtal Label] Erreur:', error)
    return new Response('Erreur serveur', { status: 500 })
  }
}
