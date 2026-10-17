// Agenda: contas do calendário (mês em semanas de segunda a domingo) e os tipos de encontro dos
// departamentos. As datas dos eventos são hora de Lisboa gravada em UTC, por isso tudo aqui é UTC.

export const TIPOS_AGENDA_DEPTO = {
    REUNIAO: 'Reunião', ORACAO: 'Oração', ENSAIO: 'Ensaio', FORMACAO: 'Formação', CONVIVIO: 'Convívio', OUTRO: 'Outro',
} as const
export type TipoAgendaDepto = keyof typeof TIPOS_AGENDA_DEPTO

export function tipoAgendaValido(t: unknown): TipoAgendaDepto {
    return typeof t === 'string' && t in TIPOS_AGENDA_DEPTO ? (t as TipoAgendaDepto) : 'REUNIAO'
}

/** "2026-10" válido, senão o mês de `hoje` (AAAA-MM-DD). */
export function lerMes(q: unknown, hoje: string): string {
    return typeof q === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(q) ? q : hoje.slice(0, 7)
}

export function mesVizinho(mes: string, delta: number): string {
    const [a, m] = mes.split('-').map(Number)
    const d = new Date(Date.UTC(a, m - 1 + delta, 1))
    return d.toISOString().slice(0, 7)
}

/** Limites do mês em UTC: [início, início do mês seguinte). */
export function limitesDoMes(mes: string): { inicio: Date; fim: Date } {
    const [a, m] = mes.split('-').map(Number)
    return { inicio: new Date(Date.UTC(a, m - 1, 1)), fim: new Date(Date.UTC(a, m, 1)) }
}

/** As semanas do calendário (segunda a domingo); dias de fora do mês vêm como null. */
export function semanasDoMes(mes: string): (string | null)[][] {
    const [a, m] = mes.split('-').map(Number)
    const primeiro = new Date(Date.UTC(a, m - 1, 1))
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate()
    const vazios = (primeiro.getUTCDay() + 6) % 7 // segunda = 0
    const dias: (string | null)[] = Array(vazios).fill(null)
    for (let d = 1; d <= ultimo; d++) dias.push(`${mes}-${String(d).padStart(2, '0')}`)
    while (dias.length % 7) dias.push(null)
    const semanas: (string | null)[][] = []
    for (let i = 0; i < dias.length; i += 7) semanas.push(dias.slice(i, i + 7))
    return semanas
}

/** "outubro de 2026" */
export function nomeDoMes(mes: string): string {
    const [a, m] = mes.split('-').map(Number)
    return new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** Segunda-feira da semana de `dia` (AAAA-MM-DD). */
export function segundaDaSemana(dia: string): string {
    const d = new Date(`${dia}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
    return d.toISOString().slice(0, 10)
}
