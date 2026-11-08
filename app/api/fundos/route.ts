// Banco de fundos da Mídia. GET ?categoria= lista (para o seletor); POST envia UM fundo (o ecrã envia um a um).
// Só a Mídia e a administração. JPEG até 2600 px no Blob público <tenant>/fundos/.
import { put } from '@vercel/blob'
import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { categoriaValida, MAX_BYTES_FUNDO, MAX_LADO_FUNDO, nomeLimpo } from '@/lib/fundos'
import { criarFundo, listarFundos } from '@/lib/fundos-dados'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })
    const cat = request.nextUrl.searchParams.get('categoria')
    if (cat && !categoriaValida(cat)) return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 })
    return NextResponse.json({ fundos: await listarFundos(auth.sessao.tenantId, cat) })
}

export async function POST(request: NextRequest) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })

    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    const categoria = form?.get('categoria')
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Nenhuma imagem enviada.' }, { status: 400 })
    if (!categoriaValida(categoria)) return NextResponse.json({ error: 'Escolha uma categoria.' }, { status: 400 })
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return NextResponse.json({ error: 'Use uma imagem JPG, PNG ou WEBP.' }, { status: 400 })
    if (file.size > MAX_BYTES_FUNDO) return NextResponse.json({ error: 'Imagem demasiado grande (máx. 8 MB).' }, { status: 400 })
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Armazenamento de imagens por configurar.' }, { status: 500 })

    const nomeEnviado = form?.get('nome')
    const nome = nomeLimpo(typeof nomeEnviado === 'string' && nomeEnviado ? nomeEnviado : file.name) || 'Fundo'
    try {
        const original = Buffer.from(await file.arrayBuffer())
        const { data, info } = await sharp(original).rotate()
            .resize({ width: MAX_LADO_FUNDO, height: MAX_LADO_FUNDO, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 88 }).toBuffer({ resolveWithObject: true })
        const blob = await put(`${auth.sessao.tenantId}/fundos/${Date.now()}-${randomBytes(3).toString('hex')}.jpg`, data, { access: 'public', contentType: 'image/jpeg' })
        const fundo = await criarFundo(auth.sessao.tenantId, auth.sessao.membroId ?? null, { nome, categoria, url: blob.url, largura: info.width, altura: info.height, bytes: data.length })
        return NextResponse.json({ fundo })
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Não foi possível guardar a imagem.' }, { status: 500 })
    }
}
