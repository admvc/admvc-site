// Para o módulo do Holyrics "Iniciar o culto", com a chave gerada em Mídia (sem login; mesma chave das outras rotas holyrics).
//   GET  ?chave=…[&evento=N] → { ok, culto: { id, nome, data } | null, kit: { publicado, publicadoEm, temFundoSemTexto }, config: { musica, video, lumikitAcaoId, lumikitTipo }, bencao: { texto, ref } }
//        (sem evento: o culto de hoje mais próximo da hora atual; `data` = "AAAA-MM-DDTHH:MM", hora de Lisboa)
//   POST ?chave=…  corpo { eventoId, operador, passos: [{ id, nome, ok, mensagem }] } → { ok: true } (grava o registo 'inicio_culto')
// Erros em português: { error } com 401 (chave), 400 (pedido), 404 (culto), 429.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { chaveCerta } from '@/lib/holyrics-chave'
import { tenantPublico } from '@/lib/divulgacao-publica'
import { lerPublicado } from '@/lib/divulgacao-publicacao'
import { bencaoDoCulto, lerPedidoInicio } from '@/lib/rotina-config'
import { configDaIgreja, cultoDeHoje, dataEscrita, registarInicioCulto } from '@/lib/rotina-alertas'

export const dynamic = 'force-dynamic'
const SEM_CACHE = { 'Cache-Control': 'no-store' }

async function autenticar(request: Request, limite: string) {
    const { success } = await rateLimit(`${limite}:${ipDoPedido(request.headers)}`, 20, 60000)
    if (!success) return { erro: NextResponse.json({ error: 'Demasiados pedidos. Tente novamente daqui a pouco.' }, { status: 429 }) }
    const tenantId = await tenantPublico()
    const tenant = tenantId ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { holyrics_chave_hash: true } }) : null
    if (!tenantId || !chaveCerta(new URL(request.url).searchParams.get('chave'), tenant?.holyrics_chave_hash)) {
        return { erro: NextResponse.json({ error: 'Chave inválida.' }, { status: 401 }) }
    }
    return { tenantId }
}

export async function GET(request: Request) {
    try {
        const a = await autenticar(request, 'holyrics-rotina')
        if (a.erro) return a.erro
        const { tenantId } = a
        const pedido = new URL(request.url).searchParams.get('evento')
        const idPedido = Number(pedido)
        if (pedido && (!Number.isInteger(idPedido) || idPedido <= 0)) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })

        const culto = pedido
            ? await prisma.evento.findFirst({ where: { id: idPedido, tenant_id: tenantId }, select: { id: true, nome: true, data: true } })
            : await cultoDeHoje(tenantId)
        if (pedido && !culto) return NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })

        const [cfg, kit] = await Promise.all([
            configDaIgreja(tenantId),
            culto ? prisma.kitDivulgacao.findFirst({ where: { tenant_id: tenantId, evento_id: culto.id }, select: { publicado: true, publicado_em: true } }) : null,
        ])
        const pub = kit?.publicado_em ? lerPublicado(kit.publicado) : null
        // "Fundo sem texto": a arte do telão que o Holyrics põe como papel de parede (padrão 'neutro' ou o item do kit publicado)
        const temFundoSemTexto = !!pub && pub.itens.some((i) => i.tipo === 'telao' && (i.id === 'neutro' || /sem texto/i.test(i.nome)))
        return NextResponse.json({
            ok: true,
            culto: culto ? { id: culto.id, nome: culto.nome, data: dataEscrita(culto.data) } : null,
            kit: { publicado: !!kit?.publicado_em, publicadoEm: kit?.publicado_em ? kit.publicado_em.toISOString() : null, temFundoSemTexto },
            config: { musica: cfg.musica, video: cfg.video, lumikitAcaoId: cfg.lumikitAcaoId, lumikitTipo: cfg.lumikitTipo },
            bencao: bencaoDoCulto(culto?.id),
        }, { headers: SEM_CACHE })
    } catch (error) {
        console.error('[API PUBLIC] Erro na rotina do culto (GET):', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const a = await autenticar(request, 'holyrics-rotina-post')
        if (a.erro) return a.erro
        const { tenantId } = a
        let corpo: unknown
        try { corpo = await request.json() } catch { return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 }) }
        const p = lerPedidoInicio(corpo)
        if (!p) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
        const culto = await prisma.evento.findFirst({ where: { id: p.eventoId, tenant_id: tenantId }, select: { id: true } })
        if (!culto) return NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })
        await registarInicioCulto(tenantId, culto.id, p.operador, p.passos)
        return NextResponse.json({ ok: true }, { headers: SEM_CACHE })
    } catch (error) {
        console.error('[API PUBLIC] Erro na rotina do culto (POST):', error instanceof Error ? error.message : error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}
