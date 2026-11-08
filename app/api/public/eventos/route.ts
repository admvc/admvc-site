import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { nomeDaReuniao, semReunioesDuplicadas } from '@/lib/agenda-reunioes'

export const dynamic = 'force-dynamic'

// Próximos eventos para a agenda do site público (30 dias). Os cultos regulares
// já estão na agenda semanal do site e as reuniões são internas, por isso ficam
// de fora. As reuniões dos grupos que aparecem no site (ex.: 1.ª segunda, Homens, 20h) entram com o nome do grupo e a hora
// (tipo REUNIAO_GRUPO), sem local nem descrição. A descrição não sai (pode ter notas internas).
const TIPOS_PUBLICOS = ['CULTO_ESPECIAL', 'CONVIVIO', 'CULTO_RUA', 'MISSAO', 'FORMACAO']
const DIAS = 30

export async function GET(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`eventos:${ip}`, 30, 60000)
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        const tenant = await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { id: true } })
        if (!tenant) return NextResponse.json({ ok: true, data: [] })

        const agora = new Date()
        const eventos = await prisma.evento.findMany({
            where: {
                tenant_id: tenant.id,
                tipo: { in: TIPOS_PUBLICOS },
                data: { gte: agora, lte: new Date(agora.getTime() + DIAS * 86400000) },
                OR: [{ congregacao_id: null }, { congregacao: { site_mostrar: true } }],
            },
            select: { id: true, nome: true, data: true, tipo: true, congregacao: { select: { nome: true, cidade: true } } },
            orderBy: { data: 'asc' },
            take: 20,
        })

        // Reuniões dos grupos públicos (nunca o local: pode ser em casa de uma família)
        const de = new Date(`${agora.toISOString().slice(0, 10)}T00:00:00Z`)
        const ate = new Date(agora.getTime() + DIAS * 86400000)
        const reunioes = await prisma.agendaDepartamento.findMany({
            where: { tenant_id: tenant.id, grupo: { publico: true, OR: [{ congregacaoId: null }, { congregacao: { site_mostrar: true } }] }, cancelado_em: null, tipo: 'REUNIAO', inicio: { gte: de, lte: ate } },
            select: { id: true, titulo: true, inicio: true, grupo_id: true, grupo: { select: { nome: true, congregacao: { select: { nome: true, cidade: true } } } } },
            orderBy: { inicio: 'asc' },
            take: 20,
        })
        const doGrupo = await prisma.evento.findMany({ where: { tenant_id: tenant.id, grupo_id: { not: null }, data: { gte: de, lte: ate } }, select: { data: true, grupo_id: true } })
        const reunioesSite = semReunioesDuplicadas(
            reunioes.filter((r) => r.grupo_id && r.grupo && r.inicio.getTime() >= agora.getTime() - 3 * 3600000).map((r) => ({ r, inicio: r.inicio, grupoId: r.grupo_id! })), doGrupo,
        ).map(({ r }) => ({ id: -r.id, nome: nomeDaReuniao(r.titulo, r.grupo!.nome), data: r.inicio, tipo: 'REUNIAO_GRUPO', congregacao: r.grupo!.congregacao }))

        const data = [...eventos, ...reunioesSite].sort((a, b) => a.data.getTime() - b.data.getTime()).slice(0, 20)
        return NextResponse.json({ ok: true, data })
    } catch (error) {
        console.error('[API PUBLIC] Erro ao buscar eventos:', error)
        return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
    }
}
