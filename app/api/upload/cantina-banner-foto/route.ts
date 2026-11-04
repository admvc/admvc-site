// Foto para o centro dos banners da cantina: guarda no Blob público em <tenant>/cantina/banners/ (só a equipa da Cantina e a
// administração). O browser já a reduziu (lib/reduzir-imagem.ts); aqui roda pela orientação da câmara e limita a 2000 px.
// PNG com transparência fica PNG; o resto vira JPEG.
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerBannersCantina } from '@/lib/cantina-acesso'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerBannersCantina(auth.sessao))) return NextResponse.json({ error: 'Só a equipa da Cantina e a administração.' }, { status: 403 })

    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 })
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ error: 'Use uma foto JPG, PNG ou WEBP.' }, { status: 400 })
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Foto demasiado grande (máx. 8 MB).' }, { status: 400 })
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Armazenamento de fotos por configurar.' }, { status: 500 })

    try {
        const original = Buffer.from(await file.arrayBuffer())
        const transparente = !(await sharp(original, { limitInputPixels: 60_000_000 }).stats()).isOpaque
        const base = sharp(original, { limitInputPixels: 60_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        const { data, info } = await (transparente ? base.png({ compressionLevel: 9 }) : base.jpeg({ quality: 88 })).toBuffer({ resolveWithObject: true })
        const ext = transparente ? 'png' : 'jpg'
        const blob = await put(`${auth.sessao.tenantId}/cantina/banners/${Date.now()}.${ext}`, data, { access: 'public', contentType: transparente ? 'image/png' : 'image/jpeg' })
        return NextResponse.json({ url: blob.url, largura: info.width, altura: info.height })
    } catch {
        return NextResponse.json({ error: 'Não foi possível guardar a foto.' }, { status: 500 })
    }
}
