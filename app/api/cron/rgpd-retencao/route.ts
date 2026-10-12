// app/api/cron/rgpd-retencao/route.ts
// Vercel Cron (diario) — prazos de retencao do RGPD (lib/rgpd.ts):
//  - pedidos de oracao de visitantes com mais de 3 meses → apagados;
//  - visitantes sem visita nem contacto ha 12 meses → anonimizados.
// `?ensaio=1` so conta, nao altera nada.

import { NextResponse } from 'next/server'
import { cronAutorizado } from '@/lib/cron'
import prisma from '@/lib/prisma'
import { audit } from '@/lib/audit'
import {
    CAMPOS_ANONIMOS_VISITANTE,
    filtroPedidosExpirados,
    filtroVisitantesExpirados,
    limitesDeRetencao,
} from '@/lib/rgpd'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    if (!cronAutorizado(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ensaio = new URL(request.url).searchParams.get('ensaio') === '1'
    const limites = limitesDeRetencao()
    const filtroPedidos = filtroPedidosExpirados(limites.pedidoOracao)
    const filtroVisitantes = filtroVisitantesExpirados(limites.visitante)

    if (ensaio) {
        const [pedidos, visitantes] = await Promise.all([
            prisma.visitante.count({ where: filtroPedidos }),
            prisma.visitante.count({ where: filtroVisitantes }),
        ])
        return NextResponse.json({ ensaio: true, limites, pedidosOracaoAApagar: pedidos, visitantesAAnonimizar: visitantes })
    }

    const pedidos = await prisma.visitante.updateMany({ where: filtroPedidos, data: { pedido_oracao: null } })

    const expirados = await prisma.visitante.findMany({ where: filtroVisitantes, select: { id: true, tenant_id: true } })
    const ids = expirados.map((v) => v.id)
    if (ids.length) {
        await prisma.$transaction([
            prisma.visitante.updateMany({ where: { id: { in: ids } }, data: CAMPOS_ANONIMOS_VISITANTE as any }),
            prisma.acompanhamentoVisitante.updateMany({ where: { visitante_id: { in: ids } }, data: { observacoes: null } }),
        ])
    }

    // Resumo na auditoria de cada igreja (so contagens, sem nomes)
    const porIgreja = new Map<number, number>()
    for (const v of expirados) porIgreja.set(v.tenant_id, (porIgreja.get(v.tenant_id) ?? 0) + 1)
    for (const [tenant_id, n] of porIgreja) {
        await audit({
            tenant_id,
            categoria: 'RGPD',
            acao: 'ANONIMIZAR',
            descricao: `Retencao automatica: ${n} visitante(s) anonimizado(s) (12 meses sem visitas nem contactos)`,
        })
    }

    return NextResponse.json({
        ok: true,
        pedidosOracaoApagados: pedidos.count,
        visitantesAnonimizados: ids.length,
        timestamp: new Date().toISOString(),
    })
}
