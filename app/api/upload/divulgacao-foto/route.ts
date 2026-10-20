// Foto do preletor ou fundo para as artes de divulgação: guarda no Blob público (só a Mídia e a administração).
// tipo=fundo: JPEG até 2600 px. Foto: se tiver fundo transparente (recorte) fica PNG, sem margens vazias;
// senão JPEG. Até 2000 px. O browser já reduziu as fotos grandes (lib/reduzir-imagem.ts mantém PNG pequenos).
// tirarBranco=1: foto de estúdio com fundo branco → recorte (lib/tirar-fundo.ts). A resposta diz se a foto tem fundo claro.
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { temFundoClaro, tirarFundoBranco } from '@/lib/tirar-fundo'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })

    const form = await request.formData()
    const file = form.get('file')
    const fundo = form.get('tipo') === 'fundo'
    const tirarBranco = !fundo && form.get('tirarBranco') === '1'
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 })
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ error: 'Use uma foto JPG, PNG ou WEBP.' }, { status: 400 })
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Foto demasiado grande (máx. 8 MB).' }, { status: 400 })
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Armazenamento de fotos por configurar.' }, { status: 500 })

    try {
        let original: Buffer = Buffer.from(await file.arrayBuffer())
        if (tirarBranco) original = await tirarFundoBranco(original)
        const recorte = !fundo && !(await sharp(original).stats()).isOpaque
        const fundoClaro = !fundo && !recorte && await temFundoClaro(original)
        let img = sharp(original).rotate()
        if (recorte) img = sharp(await img.png().toBuffer()).trim()   // tira a margem transparente à volta da pessoa
        const max = fundo ? 2600 : 2000
        img = img.resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true })
        const { data, info } = await (recorte ? img.png({ compressionLevel: 9 }) : img.jpeg({ quality: 88 })).toBuffer({ resolveWithObject: true })
        const ext = recorte ? 'png' : 'jpg'
        const blob = await put(`divulgacao/${auth.sessao.tenantId}/${fundo ? 'fundos/' : ''}${Date.now()}.${ext}`, data, { access: 'public', contentType: recorte ? 'image/png' : 'image/jpeg' })
        return NextResponse.json({ url: blob.url, largura: info.width, altura: info.height, recorte, fundoClaro })
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Não foi possível guardar a foto.' }, { status: 500 })
    }
}
