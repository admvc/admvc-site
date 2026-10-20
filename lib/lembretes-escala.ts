// lib/lembretes-escala.ts
// Lembretes das escalas (cron diario de manha): quem serve AMANHA recebe um
// aviso na vespera (e, se ainda nao confirmou, o pedido para confirmar); quem
// serve HOJE recebe um aviso no proprio dia. Quem disse "nao posso" nao recebe.
// Os dias contam-se na hora de Portugal. Todas as igrejas (e uma tarefa do sistema).

import prisma from '@/lib/prisma'

export const FUSO = 'Europe/Lisbon'

/** Inicio do dia de `agora` (dia de Portugal) + `mais` dias. As horas dos eventos estao gravadas
 *  como hora de Lisboa "escrita" em UTC (20:00 → 20:00Z), por isso o dia comeca as 00:00Z. */
function inicioDoDia(agora: Date, mais: number) {
    const [a, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' })
        .format(agora).split('-').map(Number)
    return new Date(Date.UTC(a, m - 1, d + mais))
}

const hora = (d: Date) => d.toLocaleTimeString('pt-PT', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })

export interface Lembrete {
    membroId: number
    title: string
    body: string
    url: string
}

/** Os lembretes a enviar hoje (sem enviar nada). */
export async function lembretesDeHoje(agora = new Date()): Promise<Lembrete[]> {
    const hoje = inicioDoDia(agora, 0)
    const amanha = inicioDoDia(agora, 1)
    const depois = inicioDoDia(agora, 2)

    const escalas = await prisma.escala.findMany({
        where: { motivo_recusa: null, evento: { data: { gte: hoje, lt: depois } } },
        select: {
            membro_id: true, confirmado: true, funcao: true, departamento_id: true,
            funcao_ref: { select: { nome: true } },
            evento: { select: { id: true, nome: true, data: true } },
        },
        orderBy: { evento: { data: 'asc' } },
    })

    // Um aviso por pessoa e por culto (pode ter mais de uma funcao)
    const grupos = new Map<string, { membroId: number; evento: { id: number; nome: string; data: Date }; deptoId: number; funcoes: string[]; porConfirmar: boolean }>()
    for (const e of escalas) {
        const chave = `${e.membro_id}-${e.evento.id}`
        const g = grupos.get(chave) ?? { membroId: e.membro_id, evento: e.evento, deptoId: e.departamento_id, funcoes: [], porConfirmar: false }
        const f = e.funcao_ref?.nome || e.funcao
        if (!g.funcoes.includes(f)) g.funcoes.push(f)
        if (!e.confirmado) g.porConfirmar = true
        grupos.set(chave, g)
    }

    // Cultos direcionados a um grupo: lembrete aos membros e líderes do grupo (hoje e amanhã)
    const direcionados = await prisma.evento.findMany({
        where: { grupo_id: { not: null }, data: { gte: hoje, lt: depois } },
        select: { id: true, nome: true, data: true, grupo: { select: { nome: true, membros: { select: { id: true } }, lideres: { select: { id: true } } } } },
    })
    const doGrupo: Lembrete[] = direcionados.flatMap((ev) => {
        const eHoje = ev.data < amanha
        const ids = [...new Set([...(ev.grupo?.membros ?? []), ...(ev.grupo?.lideres ?? [])].map((m) => m.id))]
        return ids.map((membroId) => ({
            membroId,
            title: eHoje ? `Hoje: ${ev.nome}` : `Amanhã: ${ev.nome}`,
            body: `Culto direcionado ao teu grupo (${ev.grupo?.nome}), às ${hora(ev.data)}.`,
            url: '/membros/agenda',
        }))
    })

    const escalaLembretes = [...grupos.values()].map((g) => {
        const eHoje = g.evento.data < amanha
        const funcoes = g.funcoes.join(', ')
        return {
            membroId: g.membroId,
            title: eHoje ? `Hoje serve: ${g.evento.nome}` : `Amanhã serve: ${g.evento.nome}`,
            body: eHoje
                ? `Às ${hora(g.evento.data)} — ${funcoes}.`
                : `Às ${hora(g.evento.data)} — ${funcoes}.${g.porConfirmar ? ' Ainda não confirmou: toque para confirmar.' : ''}`,
            url: `/escalas/culto/${g.evento.id}?equipa=${g.deptoId}`,
        }
    })
    return [...escalaLembretes, ...doGrupo]
}
