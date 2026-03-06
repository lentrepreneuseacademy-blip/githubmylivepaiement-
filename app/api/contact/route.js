import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(request) {
  try {
    const body = await request.json()
    const action = body.action || 'send'
    const supabase = getSupabase()

    // ─── SEND — Client envoie un message ───
    if (action === 'send') {
      const { shopId, name, email, phone, subject, content } = body
      if (!shopId || !content) {
        return NextResponse.json({ error: 'Message requis' }, { status: 400 })
      }
      const { data, error } = await supabase.from('messages').insert({
        shop_id: shopId,
        sender_name: name || 'Anonyme',
        sender_email: email || '',
        sender_phone: phone || '',
        subject: subject || 'Message depuis la page de paiement',
        content: content,
        status: 'new',
      }).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: data?.id })
    }

    // ─── REPLY — Pro repond a un message ───
    if (action === 'reply') {
      const { messageId, reply, shopName } = body
      if (!messageId || !reply) {
        return NextResponse.json({ error: 'Reponse requise' }, { status: 400 })
      }
      // First get the original message to find client email
      const { data: originalMsg } = await supabase.from('messages')
        .select('*')
        .eq('id', messageId)
        .single()

      // Save the reply
      const { data, error } = await supabase.from('messages')
        .update({ reply: reply, replied_at: new Date().toISOString(), status: 'replied' })
        .eq('id', messageId)
        .select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Send email notification to client
      if (originalMsg?.sender_email && process.env.RESEND_API_KEY) {
        try {
          const bName = shopName || 'La boutique'
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
            },
            body: JSON.stringify({
              from: process.env.RESEND_FROM_EMAIL || 'My Live Paiement <onboarding@resend.dev>',
              to: originalMsg.sender_email,
              subject: bName + ' a repondu a ton message',
              html: '<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:20px">'
                + '<h2 style="color:#1A1A1A;margin-bottom:4px">' + bName + '</h2>'
                + '<p style="color:#999;font-size:13px;margin-top:0">a repondu a ton message</p>'
                + '<div style="background:#F8F7F5;border-radius:12px;padding:16px;margin:16px 0">'
                + '<div style="font-size:11px;color:#999;margin-bottom:6px">Ton message :</div>'
                + '<div style="font-size:14px;color:#555">' + (originalMsg.content || '').replace(/</g, '&lt;') + '</div></div>'
                + '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px;margin:16px 0">'
                + '<div style="font-size:11px;color:#10B981;font-weight:700;margin-bottom:6px">Reponse :</div>'
                + '<div style="font-size:14px;color:#333">' + reply.replace(/</g, '&lt;') + '</div></div>'
                + '<p style="font-size:12px;color:#CCC;margin-top:20px">Envoye via My Live Paiement</p></div>',
            })
          })
          console.log('[Contact] Email sent to:', originalMsg.sender_email)
        } catch(emailErr) {
          console.error('[Contact] Email error:', emailErr)
        }
      }

      return NextResponse.json({ ok: true, message: data })
    }

    // ─── LIST — Charger tous les messages d'une boutique ───
    if (action === 'list') {
      const { shopId } = body
      if (!shopId) return NextResponse.json({ messages: [] })
      const { data, error } = await supabase.from('messages')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ messages: data || [] })
    }

    // ─── CLIENT_MESSAGES — Messages d'un client par email ───
    if (action === 'client_messages') {
      const { shopId, email } = body
      if (!shopId || !email) return NextResponse.json({ messages: [] })
      const { data } = await supabase.from('messages')
        .select('*')
        .eq('shop_id', shopId)
        .ilike('sender_email', email.toLowerCase().trim())
        .order('created_at', { ascending: false })
      return NextResponse.json({ messages: data || [] })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur' }, { status: 500 })
  }
}
