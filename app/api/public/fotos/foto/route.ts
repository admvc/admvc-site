// POST /api/public/fotos/foto?chave=…  (multipart/form-data)
//   album=<id>  origem=<nome do ficheiro> (ou nome=)  ordem=<n>  hora=<ISO>
//   web=<JPEG ate 2560 px>   mini=<JPEG 640 px, opcional>
// Grava as duas versoes no R2 e regista a foto. Repetir o envio da mesma origem substitui-a
// em vez de duplicar (o exe pode ser interrompido e retomado sem medo).
// Travoes (ver lib/fotos-limites.ts): contados ANTES de aceitar; recusa = HTTP 413 { error, limite, maximo }.
import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import sharp from 'sharp'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { igrejaDaChave } from '@/lib/fotos-api'
import { apagarFicheiro, guardarFicheiro, r2Configurado } from '@/lib/fotos-armazenamento'
import { avisoDeEspaco, formatarBytes, LIMITES_FOTOS, origemLimpa, verificarTravoes } from '@/lib/fotos-limites'
import { espacoDoAlbum, espacoUsado } from '@/lib/fotos-gestao'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const eJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff

/** Confirma que e mesmo uma imagem JPEG (e nao so o inicio) e devolve as medidas verdadeiras. */
async function medidas(b: Buffer) {
    try {
        const m = await sharp(b, { limitInputPixels: 40_000_000 }).metadata()
        if (m.format !== 'jpeg' || !m.width || !m.height) return null
        if (m.width > LIMITES_FOTOS.ladoMaximo || m.height > LIMITES_FOTOS.ladoMaximo) return null
        return { largura: m.width, altura: m.height }
    } catch { return null }
}

const grande = (maximo: number) => NextResponse.json({
    error: `Uma das imagens passa os ${formatarBytes(maximo)} permitidos por ficheiro. Envie a foto mais leve.`,
    limite: 'ficheiro', maximo,
}, { status: 413 })

export async function POST(request: Request) {
    try {
        const { success } = await rateLimit(`fotos-envio:${ipDoPedido(request.headers)}`, 120, 60000)
        if (!success) return NextResponse.json({ error: 'Demasiados envios seguidos.' }, { status: 429 })

        // Corpo inteiro grande de mais: recusa antes de o ler (a Vercel corta acima de ~4,5 MB).
        const tamanho = Number(request.headers.get('content-length') ?? 0)
        if (tamanho > LIMITES_FOTOS.pedido) return grande(LIMITES_FOTOS.pedido)

        const tenantId = await igrejaDaChave(request)
        if (!tenantId) return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })

        // Em producao sem R2 configurado nao ha onde guardar: 503 claro (e nao um 500).
        if (process.env.NODE_ENV === 'production' && !r2Configurado()) {
            return NextResponse.json({ error: 'O armazenamento das fotos ainda não está configurado no portal. Fale com a administração.' }, { status: 503 })
        }

        const form = await request.formData().catch(() => null)
        if (!form) return NextResponse.json({ error: 'O pedido tem de ser multipart/form-data com os campos album, origem e web.' }, { status: 400 })
        const albumId = Number(form.get('album'))
        const origem = origemLimpa(form.get('origem') ?? form.get('nome'))
        if (!Number.isInteger(albumId) || albumId <= 0 || !origem) {
            return NextResponse.json({ error: 'Álbum ou nome do ficheiro em falta.' }, { status: 400 })
        }

        const album = await prisma.albumFoto.findFirst({ where: { id: albumId, tenant_id: tenantId }, select: { id: true, slug: true } })
        if (!album) return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })

        const ficheiro = (v: FormDataEntryValue | null) => (v && typeof v !== 'string' ? v : null)
        const webF = ficheiro(form.get('web'))
        const miniF = ficheiro(form.get('mini'))
        if (!webF) return NextResponse.json({ error: 'A foto não é um JPEG válido.' }, { status: 400 })
        if (webF.size > LIMITES_FOTOS.ficheiro || (miniF && miniF.size > LIMITES_FOTOS.ficheiro)) return grande(LIMITES_FOTOS.ficheiro)

        const web = Buffer.from(await webF.arrayBuffer())
        const mini = miniF ? Buffer.from(await miniF.arrayBuffer()) : null
        const medidasWeb = eJpeg(web) ? await medidas(web) : null
        if (!medidasWeb) return NextResponse.json({ error: 'A foto não é um JPEG válido (ou tem lados acima de 4000 px).' }, { status: 400 })
        if (mini && !(eJpeg(mini) && await medidas(mini))) return NextResponse.json({ error: 'A miniatura não é um JPEG válido.' }, { status: 400 })

        // ── Travões de custo: contados antes de aceitar ──
        const existente = await prisma.fotoAlbum.findUnique({
            where: { album_id_origem: { album_id: album.id, origem } },
            select: { id: true, chave: true, miniatura: true, bytes: true, bytes_mini: true },
        })
        const [doAlbum, daIgreja] = await Promise.all([espacoDoAlbum(album.id), espacoUsado(tenantId)])
        const novos = web.length + (mini?.length ?? 0)
        const recusa = verificarTravoes({
            fotosNoAlbum: doAlbum.fotos,
            bytesAlbum: doAlbum.bytes,
            bytesTotal: daIgreja.bytes,
            novos,
            substitui: existente ? (existente.bytes ?? 0) + (existente.bytes_mini ?? 0) : undefined,
        })
        if (recusa) return NextResponse.json(recusa, { status: 413 })

        // Chave nova e imprevisivel a cada envio (nao se adivinha pelo nome do ficheiro e nao fica em cache velha).
        const marca = randomBytes(9).toString('hex')
        const chave = `${album.slug}/${marca}-web.jpg`
        const chaveMini = mini ? `${album.slug}/${marca}-mini.jpg` : null

        try {
            await guardarFicheiro(chave, web)
            if (mini && chaveMini) await guardarFicheiro(chaveMini, mini)
        } catch (e) {
            console.error('[API FOTOS] Armazenamento indisponivel:', e)
            return NextResponse.json({ error: 'O armazenamento das fotos não está a responder. Tente mais tarde ou fale com a administração.' }, { status: 503 })
        }

        const hora = String(form.get('hora') ?? '').trim()
        const quando = hora && !Number.isNaN(Date.parse(hora)) ? new Date(hora) : null
        const ordem = Number.isFinite(Number(form.get('ordem'))) ? Math.trunc(Number(form.get('ordem'))) : 0
        const dados = {
            chave, miniatura: chaveMini, largura: medidasWeb.largura, altura: medidasWeb.altura,
            bytes: web.length, bytes_mini: mini?.length ?? null, hora: quando, ordem,
        }
        const foto = await prisma.fotoAlbum.upsert({
            where: { album_id_origem: { album_id: album.id, origem } },
            create: { album_id: album.id, origem, ...dados },
            update: dados,
            select: { id: true },
        })
        if (existente) {   // a versao anterior ja nao serve
            if (existente.chave !== chave) await apagarFicheiro(existente.chave)
            if (existente.miniatura && existente.miniatura !== chaveMini) await apagarFicheiro(existente.miniatura)
        }

        const usado = daIgreja.bytes - (existente ? (existente.bytes ?? 0) + (existente.bytes_mini ?? 0) : 0) + novos
        const aviso = avisoDeEspaco(usado)
        return NextResponse.json({ ok: true, id: foto.id, chave, usado, ...(aviso ? { aviso } : {}) })
    } catch (error) {
        console.error('[API FOTOS] Erro ao receber a foto:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}
