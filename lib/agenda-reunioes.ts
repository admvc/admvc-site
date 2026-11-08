// Reuniões dos grupos (ex.: 1.ª segunda Homens, 2.ª Mulheres, 3.ª Casais, 20h00) para as agendas que a igreja vê:
// a Agenda para divulgar (semana e mês), a API pública do site e o portal. Vêm de `agenda_departamento` com grupo
// (criadas pelas regras da agenda, lib/agenda-regras.ts). Horas = hora de Lisboa ESCRITA em UTC.
// Um culto "direcionado" a um grupo já é um evento; se o mesmo grupo já tem um evento nesse dia, a reunião não se repete.
import { getTenantClient } from '@/lib/prisma'

export type ReuniaoGrupo = { id: number; titulo: string; inicio: Date; grupoId: number; grupoNome: string; casa: string | null }
export type EventoComGrupo = { data: Date; grupo_id?: number | null }

/** "Grupo de Homens" (o título da regra já diz o grupo) ou "Homens · Reunião" (quando não diz). */
export function nomeDaReuniao(titulo: string, grupoNome: string): string {
    const t = titulo.trim(), g = grupoNome.trim()
    if (!g) return t
    if (!t) return g
    return t.toLowerCase().includes(g.toLowerCase()) ? t : `${g} · ${t}`
}

/** Tira as reuniões cujo grupo já tem um evento (culto direcionado) no mesmo dia. */
export function semReunioesDuplicadas<T extends { inicio: Date; grupoId: number }>(reunioes: T[], eventos: EventoComGrupo[]): T[] {
    const ocupados = new Set(eventos.filter((e) => e.grupo_id).map((e) => `${e.grupo_id}|${e.data.toISOString().slice(0, 10)}`))
    return reunioes.filter((r) => !ocupados.has(`${r.grupoId}|${r.inicio.toISOString().slice(0, 10)}`))
}

/** As reuniões de grupos (não canceladas) entre `de` (incl.) e `ate` (excl.). `soPublicos`: só grupos que aparecem no site. */
export async function reunioesDeGrupos(tenantId: number, de: Date, ate: Date, opcoes: { congregacaoId?: number | null } = {}): Promise<ReuniaoGrupo[]> {
    const db = getTenantClient(tenantId)
    const cong = opcoes.congregacaoId
    const linhas = await db.agendaDepartamento.findMany({
        where: {
            grupo_id: { not: null }, cancelado_em: null, tipo: 'REUNIAO', inicio: { gte: de, lt: ate },
            ...(cong ? { grupo: { OR: [{ congregacaoId: cong }, { congregacaoId: null }] } } : {}),
        },
        orderBy: { inicio: 'asc' },
        select: { id: true, titulo: true, inicio: true, grupo_id: true, grupo: { select: { nome: true, congregacao: { select: { nome: true } } } } },
    })
    const eventos = await db.evento.findMany({ where: { grupo_id: { not: null }, data: { gte: de, lt: ate } }, select: { data: true, grupo_id: true } })
    const reunioes = linhas.filter((l) => l.grupo_id && l.grupo).map((l) => ({
        id: l.id, titulo: nomeDaReuniao(l.titulo, l.grupo!.nome), inicio: l.inicio, grupoId: l.grupo_id!, grupoNome: l.grupo!.nome, casa: l.grupo!.congregacao?.nome ?? null,
    }))
    return semReunioesDuplicadas(reunioes, eventos)
}
