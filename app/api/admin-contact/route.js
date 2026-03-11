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
    const { action } = body
    const supabase = getSupabase()

    // ─── SEND — Visitor sends a contact message ───
    if (action === 'send') {
      const { name, email, message, subject } = body
      if (!email || !message) {
        return NextResponse.json({ error: 'Email et message requis' }, { status: 400 })
      }

      const { data, error } = await supabase.from('contact_messages').insert({
        name: name || 'Anonyme',
        email: email,
        subject: subject || 'Aucun sujet',
        message: message,
        status: 'unread',
        created_at: new Date().toISOString(),
      }).select()

      if (error) {
        // If table doesn't exist, try creating via messages table with special shop_id
        console.error('[Admin Contact] Insert error:', error.message)
        // Fallback: use messages table with shop_id = 'admin-contact'
        const { data: d2, error: e2 } = await supabase.from('messages').insert({
          shop_id: '00000000-0000-0000-0000-000000000000',
          sender_name: name || 'Anonyme',
          sender_email: email,
          subject: subject || 'Contact site',
          content: message,
          is_from_client: true,
        }).select()

        if (e2) {
          console.error('[Admin Contact] Fallback error:', e2.message)
          return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
        }
        return NextResponse.json({ success: true, id: d2?.[0]?.id })
      }

      return NextResponse.json({ success: true, id: data?.[0]?.id })
    }

    // ─── GET — Admin fetches all contact messages ───
    if (action === 'get_messages') {
      // Try contact_messages table first
      let messages = []
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (!error && data) {
        messages = data
      } else {
        // Fallback: messages table with admin shop_id
        const { data: d2 } = await supabase
          .from('messages')
          .select('*')
          .eq('shop_id', '00000000-0000-0000-0000-000000000000')
          .order('created_at', { ascending: false })
          .limit(200)

        messages = (d2 || []).map(m => ({
          id: m.id,
          name: m.sender_name,
          email: m.sender_email,
          subject: m.subject,
          message: m.content,
          status: m.is_read ? 'read' : 'unread',
          created_at: m.created_at,
        }))
      }

      return NextResponse.json({ messages })
    }

    // ─── MARK READ ───
    if (action === 'mark_read') {
      const { id } = body
      // Try contact_messages
      await supabase.from('contact_messages').update({ status: 'read' }).eq('id', id)
      // Also try messages fallback
      await supabase.from('messages').update({ is_read: true }).eq('id', id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err) {
    console.error('[Admin Contact]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
