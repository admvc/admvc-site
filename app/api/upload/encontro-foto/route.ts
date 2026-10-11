// app/api/upload/encontro-foto/route.ts
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { comprimirImagem } from '@/lib/image-utils'

export async function POST(request: NextRequest) {
    console.log('🟡 [API UPLOAD] Recebido pedido POST')

    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const grupo_id = formData.get('grupo_id') as string

        console.log('🔵 [API UPLOAD] grupo_id:', grupo_id)
        console.log('🔵 [API UPLOAD] file:', file ? `${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)}KB)` : 'null')

        if (!file) {
            console.error('❌ [API UPLOAD] Nenhum ficheiro recebido')
            return NextResponse.json({ error: 'Nenhum ficheiro enviado.' }, { status: 400 })
        }

        // Valida tipo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
        if (!tiposPermitidos.includes(file.type)) {
            console.error('❌ [API UPLOAD] Tipo não permitido:', file.type)
            return NextResponse.json({ error: `Tipo "${file.type}" não permitido. Use JPG, PNG ou WEBP.` }, { status: 400 })
        }

        // Valida tamanho (5MB)
        if (file.size > 5 * 1024 * 1024) {
            console.error('❌ [API UPLOAD] Ficheiro demasiado grande:', file.size)
            return NextResponse.json({ error: 'Ficheiro demasiado grande (máx. 5MB).' }, { status: 400 })
        }

        // Verifica token
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.error('❌ [API UPLOAD] BLOB_READ_WRITE_TOKEN não definido!')
            return NextResponse.json({ error: 'Configuração de storage em falta.' }, { status: 500 })
        }

        // Comprimir imagem antes do upload
        const arrayBuffer = await file.arrayBuffer()
        const compressedBuffer = await comprimirImagem(Buffer.from(arrayBuffer))

        // Gera nome único (sempre .webp após compressão)
        const timestamp = Date.now()
        const filename = `encontros/grupo-${grupo_id || 'unknown'}/${timestamp}.webp`

        console.log('🔵 [API UPLOAD] A fazer upload para Vercel Blob:', filename)

        const blob = await put(filename, compressedBuffer, {
            access: 'public',
            contentType: 'image/webp',
        })

        console.log('✅ [API UPLOAD] Upload concluído! URL:', blob.url)

        return NextResponse.json({ url: blob.url }, { status: 200 })

    } catch (error: any) {
        console.error('❌ [API UPLOAD] Exceção:', error?.message || error)
        return NextResponse.json(
            { error: error?.message || 'Erro interno no upload.' },
            { status: 500 }
        )
    }
}