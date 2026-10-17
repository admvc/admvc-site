// Agenda para a Mídia (telão, redes, impressão): os eventos da igreja de uma semana ou de um mês,
// já com o texto curto ("20h", "10h30"). Horas = hora de Lisboa gravada em UTC.
import { getTenantClient } from '@/lib/prisma'
import { isAdmin, type SessionData } from '@/lib/auth-utils'
import { pertenceAEquipa, EQUIPA_MIDIA } from '@/lib/equipas'

export type LinhaAgenda = { dia: string; hora: string; nome: string; tipo: string; casa: string | null }

export const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

/** "20h", "10h30" */
export function horaCurta(d: Date): string {
    const h = d.getUTCHours(), m = d.getUTCMinutes()
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export async function podeFazerAgenda(sessao: SessionData): Promise<boolean> {
    return isAdmin(sessao.role) || await pertenceAEquipa(sessao.membroId, EQUIPA_MIDIA)
}

export async function eventosDaAgenda(tenantId: number, de: Date, ate: Date, congregacaoId?: number | null): Promise<LinhaAgenda[]> {
    const db = getTenantClient(tenantId)
    const eventos = await db.evento.findMany({
        where: { data: { gte: de, lt: ate }, ...(congregacaoId ? { OR: [{ congregacao_id: congregacaoId }, { congregacao_id: null }] } : {}) },
        orderBy: { data: 'asc' },
        select: { nome: true, data: true, tipo: true, congregacao: { select: { nome: true } } },
    })
    return eventos.map((e) => ({ dia: e.data.toISOString().slice(0, 10), hora: horaCurta(e.data), nome: e.nome, tipo: e.tipo, casa: e.congregacao?.nome ?? null }))
}

/** Juntar por dia: [{ dia, linhas }] pela ordem. */
export function porDia(linhas: LinhaAgenda[]): { dia: string; linhas: LinhaAgenda[] }[] {
    const m = new Map<string, LinhaAgenda[]>()
    for (const l of linhas) m.set(l.dia, [...(m.get(l.dia) ?? []), l])
    return [...m.entries()].map(([dia, ls]) => ({ dia, linhas: ls }))
}
