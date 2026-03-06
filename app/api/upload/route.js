import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const shopId = formData.get('shopId') || 'default'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10MB)' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin'
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 50)
    const fileName = shopId + '/' + Date.now() + '-' + safeName

    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(fileName, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (error) {
      console.error('[Upload] Supabase error:', error)
      return NextResponse.json({ error: 'Erreur upload: ' + error.message }, { status: 500 })
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(fileName)

    console.log('[Upload] Success:', fileName, file.size, 'bytes')

    return NextResponse.json({
      ok: true,
      url: urlData?.publicUrl || '',
      name: file.name,
      size: file.size,
      type: file.type,
    })

  } catch (err) {
    console.error('[Upload] Error:', err)
    return NextResponse.json({ error: 'Erreur serveur: ' + err.message }, { status: 500 })
  }
}
