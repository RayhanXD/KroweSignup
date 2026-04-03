import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const sessionId = formData.get('sessionId')

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
    }

    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ files: [] })
    }

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const path = `${sessionId}/${file.name}`

        const { error } = await supabase.storage
          .from('interview-uploads')
          .upload(path, buffer, {
            contentType: file.type,
            upsert: true,
          })

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`)
        }

        return {
          name: file.name,
          size: file.size,
          type: file.type,
          path,
        }
      })
    )

    return NextResponse.json({ files: uploaded })
  } catch (err: any) {
    console.error('[interview-upload]', err)
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
