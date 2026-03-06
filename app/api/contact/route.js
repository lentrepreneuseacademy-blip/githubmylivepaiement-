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
      const { messageId, reply } = body
      if (!messageId || !reply) {
        return NextResponse.json({ error: 'Reponse requise' }, { status: 400 })
      }
      const { data, error } = await supabase.from('messages')
        .update({ reply: reply, replied_at: new Date().toISOString(), status: 'replied' })
        .eq('id', messageId)
        .select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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
