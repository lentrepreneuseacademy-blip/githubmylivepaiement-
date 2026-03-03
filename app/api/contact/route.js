import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { shopId, name, email, phone, subject, content } = body

    if (!shopId || !content) {
      return NextResponse.json({ error: 'Message requis' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data, error } = await supabase.from('messages').insert({
      shop_id: shopId,
      sender_name: name || 'Anonyme',
      sender_email: email || '',
      sender_phone: phone || '',
      subject: subject || 'Message depuis la page de paiement',
      content: content,
      status: 'new',
    }).select().single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: data?.id })

  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur' }, { status: 500 })
  }
}
