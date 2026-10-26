// Desenha UMA arte do kit guardado em resolução total e guarda-a no Blob público (a página chama item a item, com
// progresso, por isso não há limite de tempo). Depois a action concluirPublicacao grava a lista.
// POST { evento, item: 'peca:<id>' | 'rede:<id>', lote }
import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { getTenantClient } from '@/lib/prisma'
import { desenharArte } from '@/lib/divulgacao-imagem'
import { desenharRede } from '@/lib/divulgacao-redes'
import { normalizarReceita, paramsDaPeca, paramsDaRede } from '@/lib/divulgacao-kit'
import { pastaPublicada } from '@/lib/divulgacao-publicacao'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })
    if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: 'Armazenamento de imagens por configurar.' }, { status: 500 })

    const corpo = await request.json().catch(() => ({})) as { evento?: unknown; item?: unknown; lote?: unknown }
    const eventoId = Number(corpo.evento)
    const [tipo, id] = String(corpo.item ?? '').split(':')
    const lote = String(corpo.lote ?? '')
    if (!Number.isInteger(eventoId) || eventoId <= 0 || !/^\d{10,14}$/.test(lote) || (tipo !== 'peca' && tipo !== 'rede') || !id) {
        return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
    }

    const kit = await getTenantClient(auth.sessao.tenantId).kitDivulgacao.findFirst({
        where: { evento_id: eventoId },
        select: { receita: true, evento: { select: { nome: true, data: true } } },
    })
    if (!kit) return NextResponse.json({ error: 'Guarde as artes antes de as publicar.' }, { status: 404 })
    const receita = normalizarReceita(kit.receita)
    const dia = kit.evento.data.toISOString().slice(0, 10)

    let img: Response
    if (tipo === 'peca') {
        const peca = receita.pecas.find((p) => p === id)
        if (!peca) return NextResponse.json({ error: 'Esta arte não está no kit guardado.' }, { status: 400 })
        img = await desenharArte(paramsDaPeca(receita, peca, dia, kit.evento))
    } else {
        const rede = receita.redes.find((p) => p === id)
        if (!rede) return NextResponse.json({ error: 'Esta arte não está no kit guardado.' }, { status: 400 })
        img = await desenharRede(paramsDaRede(receita, rede, kit.evento))
    }
    const blob = await put(`${pastaPublicada(auth.sessao.tenantId, eventoId)}${lote}-${tipo}-${id}.png`, Buffer.from(await img.arrayBuffer()), {
        access: 'public', contentType: 'image/png', addRandomSuffix: false, allowOverwrite: true,
    })
    return NextResponse.json({ url: blob.url })
}
