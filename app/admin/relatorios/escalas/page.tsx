// app/admin/relatorios/escalas/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import RelatorioEscalasClient from '@/components/relatorios/RelatorioEscalasClient'

export default async function RelatorioEscalasPage({
    searchParams,
}: {
    searchParams: Promise<{ mes?: string; ano?: string; departamento?: string }>
}) {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const params = await searchParams
    const agora = new Date()
    const mes = params.mes ? Number(params.mes) : agora.getMonth() + 1
    const ano = params.ano ? Number(params.ano) : agora.getFullYear()
    const deptoFiltro = params.departamento ? Number(params.departamento) : undefined

    const inicioMes = new Date(ano, mes - 1, 1)
    const fimMes = new Date(ano, mes, 0, 23, 59, 59)

    const [escalas, departamentos] = await Promise.all([
        db.escala.findMany({
            where: {
                evento: { data: { gte: inicioMes, lte: fimMes } },
                ...(deptoFiltro ? { departamento_id: deptoFiltro } : {}),
            },
            include: {
                membro: {
                    select: { id: true, first_name: true, last_name: true, avatar_file: true }
                },
                departamento: { select: { id: true, nome: true } },
                evento: { select: { id: true, nome: true, data: true } },
                funcao_ref: { select: { nome: true } },
            },
            orderBy: { evento: { data: 'asc' } },
        }),
        db.departamento.findMany({
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' },
        }),
    ])

    // Agrupar por membro
    const porMembro = new Map<number, {
        membro: { id: number; first_name: string; last_name: string; avatar_file: string | null }
        total: number
        confirmadas: number
        recusadas: number
        pendentes: number
        funcoes: Map<string, number>
        departamentos: Map<string, number>
        datas: string[]
    }>()

    for (const esc of escalas) {
        if (!porMembro.has(esc.membro.id)) {
            porMembro.set(esc.membro.id, {
                membro: esc.membro,
                total: 0,
                confirmadas: 0,
                recusadas: 0,
                pendentes: 0,
                funcoes: new Map(),
                departamentos: new Map(),
                datas: [],
            })
        }
        const stats = porMembro.get(esc.membro.id)!
        stats.total++
        if (esc.confirmado) stats.confirmadas++
        else if (esc.motivo_recusa) stats.recusadas++
        else stats.pendentes++

        const nomeFuncao = esc.funcao_ref?.nome || esc.funcao || 'Sem funcao'
        stats.funcoes.set(nomeFuncao, (stats.funcoes.get(nomeFuncao) || 0) + 1)
        stats.departamentos.set(esc.departamento.nome, (stats.departamentos.get(esc.departamento.nome) || 0) + 1)
        stats.datas.push(esc.evento.data.toISOString())
    }

    // Serializar para o client
    const dadosMembros = Array.from(porMembro.values())
        .map(s => ({
            membro: s.membro,
            total: s.total,
            confirmadas: s.confirmadas,
            recusadas: s.recusadas,
            pendentes: s.pendentes,
            funcoes: Object.fromEntries(s.funcoes),
            departamentos: Object.fromEntries(s.departamentos),
            datas: s.datas,
        }))
        .sort((a, b) => b.total - a.total)

    return (
        <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">
            <RelatorioEscalasClient
                dados={dadosMembros}
                departamentos={departamentos}
                mes={mes}
                ano={ano}
                deptoFiltro={deptoFiltro}
                totalEscalas={escalas.length}
            />
        </main>
    )
}
