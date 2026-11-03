// GET /api/fotos/ver/<chave> — serve a foto do R2 quando ainda nao ha dominio publico ligado
// (R2_PUBLIC_URL). Depois de ligar o dominio publico, o site usa-o diretamente e esta rota fica so de reserva.
// So serve fotos que a galeria pode mostrar (album publicado, sem "Nao publicar", sem pedido de retirada).
// Quem e da Midia/administracao (com sessao) ve tambem as escondidas e os albuns por publicar.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { lerFicheiro, lerFicheiroDeDesenvolvimento, r2Configurado } from '@/lib/fotos-armazenamento'
import { chaveSegura } from '@/lib/fotos-limites'
import { fotoVisivel } from '@/lib/fotos-gestao'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const nada = (status: number) => new NextResponse(null, { status })

export async function GET(request: Request, { params }: { params: Promise<{ chave: string[] }> }) {
    const { chave } = await params
    const caminho = (chave ?? []).join('/')
    // Segmentos simples (letras, numeros, . _ -), sem ".." e so JPEG.
    if (!chave?.length || !chaveSegura(caminho) || !/\.jpe?g$/i.test(caminho)) return nada(400)

    const { success } = await rateLimit(`fotos-ver:${ipDoPedido(request.headers)}`, 600, 60000)
    if (!success) return nada(429)

    try {
        // O prefixo da chave e o endereco do album: procura-se a foto la dentro.
        const slug = chave.length > 1 ? chave[0] : ''
        const foto = slug
            ? await prisma.fotoAlbum.findFirst({
                where: { album: { slug }, OR: [{ chave: caminho }, { miniatura: caminho }] },
                select: { id: true, album: { select: { tenant_id: true, publicado: true } } },
            })
            : null
        if (!foto) return nada(404)

        let publica = foto.album.publicado
        if (publica) publica = (await prisma.fotoAlbum.count({ where: { id: foto.id, ...fotoVisivel } })) > 0
        let privada = false
        if (!publica) {
            const sessao = await getSessionData().catch(() => null)
            if (!sessao || sessao.tenantId !== foto.album.tenant_id || !(await podeFazerAgenda(sessao))) return nada(404)
            privada = true
        }

        const bytes = r2Configurado() ? await lerFicheiro(caminho) : await lerFicheiroDeDesenvolvimento(caminho)
        if (!bytes) return nada(404)
        return new NextResponse(new Uint8Array(bytes), {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': privada ? 'private, no-store' : 'public, max-age=86400, s-maxage=3600',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    } catch {
        return nada(404)
    }
}
