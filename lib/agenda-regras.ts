// Regras repetidas da agenda: "toda a 1.ª segunda, 20h00, Grupo de Homens" (reunião) ou "toda a 3.ª quarta, culto
// direcionado aos Jovens" (culto da igreja). `datasDaRegra` é só contas de calendário; `gerarRegra` cria o que falta
// nos próximos meses, sem mexer no que já existe. Horas = hora de Lisboa ESCRITA em UTC (`${dia}T${hora}:00Z`).
import type { getTenantClient } from '@/lib/prisma'

export const DIAS_DA_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const
export const SEMANAS_DO_MES: { valor: number; nome: string }[] = [
    { valor: 1, nome: '1.ª' }, { valor: 2, nome: '2.ª' }, { valor: 3, nome: '3.ª' }, { valor: 4, nome: '4.ª' }, { valor: 5, nome: '5.ª' }, { valor: -1, nome: 'última' },
]

export type RegraDatas = { dia_semana: number; semana_do_mes: number }

/** "toda a 1.ª segunda", "toda a última quarta" */
export function descreverRegra(r: RegraDatas): string {
    const semana = SEMANAS_DO_MES.find((s) => s.valor === r.semana_do_mes)?.nome ?? `${r.semana_do_mes}.ª`
    return `toda a ${semana} ${DIAS_DA_SEMANA[r.dia_semana]?.toLowerCase() ?? '?'}`
}

/** As datas (AAAA-MM-DD) da regra entre `de` e `ate`, ambos inclusivos. Uma 5.ª semana que não existe nesse mês é saltada. */
export function datasDaRegra(r: RegraDatas, de: string, ate: string): string[] {
    const fim = new Date(`${ate}T00:00:00Z`)
    const datas: string[] = []
    let ano = Number(de.slice(0, 4)), mes = Number(de.slice(5, 7)) - 1
    while (Date.UTC(ano, mes, 1) <= fim.getTime()) {
        const ultimo = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
        // dias do mês que caem no dia da semana pedido, por ordem
        const dias: number[] = []
        for (let d = 1; d <= ultimo; d++) if (new Date(Date.UTC(ano, mes, d)).getUTCDay() === r.dia_semana) dias.push(d)
        const dia = r.semana_do_mes === -1 ? dias[dias.length - 1] : dias[r.semana_do_mes - 1]
        if (dia) {
            const iso = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
            if (iso >= de && iso <= ate) datas.push(iso)
        }
        mes++
        if (mes > 11) { mes = 0; ano++ }
    }
    return datas
}

type Db = ReturnType<typeof getTenantClient>
export type RegraGerar = {
    id: number; alvo: string; departamento_id: number | null; grupo_id: number | null; titulo: string; tipo: string
    dia_semana: number; semana_do_mes: number; hora: string; local: string | null; ativo: boolean
}
export type ResultadoGerar = { criados: number; avisos: string[]; datas: string[] }

/** "Hoje" como AAAA-MM-DD na convenção das horas (Lisboa escrita em UTC). */
export function hojeLisboaISO(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
}

export function somarMeses(dia: string, meses: number): string {
    const [a, m, d] = dia.split('-').map(Number)
    const x = new Date(Date.UTC(a, m - 1 + meses, d))
    return x.toISOString().slice(0, 10)
}

/**
 * Cria o que falta desta regra desde hoje até daqui a `meses` meses. Não repete (uma linha por regra e dia) e não
 * mexe em nada que já exista. Culto: se já há outro culto nessa noite (18h–22h), não cria e devolve um aviso.
 */
export async function gerarRegra(db: Db, tenantId: number, r: RegraGerar, meses = 3, hoje = hojeLisboaISO()): Promise<ResultadoGerar> {
    const resultado: ResultadoGerar = { criados: 0, avisos: [], datas: [] }
    if (!r.ativo) return resultado
    const ate = somarMeses(hoje, meses)
    const datas = datasDaRegra(r, hoje, ate)
    if (datas.length === 0) return resultado

    const existentes = r.alvo === 'CULTO'
        ? await db.evento.findMany({ where: { regra_id: r.id, data: { gte: new Date(`${hoje}T00:00:00Z`) } }, select: { data: true } }).then((l) => l.map((e) => e.data))
        : await db.agendaDepartamento.findMany({ where: { regra_id: r.id, inicio: { gte: new Date(`${hoje}T00:00:00Z`) } }, select: { inicio: true } }).then((l) => l.map((e) => e.inicio))
    const jaTem = new Set(existentes.map((d) => d.toISOString().slice(0, 10)))

    for (const dia of datas) {
        if (jaTem.has(dia)) continue
        const inicio = new Date(`${dia}T${r.hora}:00Z`)
        if (r.alvo === 'CULTO') {
            // outro culto nessa noite (marcado à mão ou por outra regra) → não duplicar
            const noite = await db.evento.findFirst({
                where: { data: { gte: new Date(`${dia}T18:00:00Z`), lte: new Date(`${dia}T22:00:00Z`) } },
                select: { nome: true },
            })
            if (noite) { resultado.avisos.push(`${dia}: já existe "${noite.nome}" nessa noite; não criei outro.`); continue }
            await db.evento.create({ data: { nome: r.titulo, data: inicio, tipo: 'CULTO_REGULAR', grupo_id: r.grupo_id, regra_id: r.id, tenant_id: tenantId } as never })
        } else {
            await db.agendaDepartamento.create({
                data: { titulo: r.titulo, tipo: r.tipo, inicio, local: r.local, departamento_id: r.departamento_id, grupo_id: r.grupo_id, regra_id: r.id, tenant_id: tenantId } as never,
            })
        }
        resultado.criados++
        resultado.datas.push(dia)
    }
    await db.regraAgenda.update({ where: { id: r.id }, data: { gerado_ate: new Date(`${ate}T00:00:00Z`) } })
    return resultado
}

/**
 * Tira o que a regra ainda tem no futuro e ninguém mexeu: encontros por mexer ficam cancelados (não se apagam);
 * cultos sem escalas nem repertório são apagados. Devolve quantos ficaram por terem sido alterados.
 */
export async function desfazerRegraFutura(db: Db, r: { id: number; alvo: string }, hoje = hojeLisboaISO()): Promise<{ removidos: number; ficaram: number }> {
    const desde = new Date(`${hoje}T00:00:00Z`)
    let removidos = 0, ficaram = 0
    if (r.alvo === 'CULTO') {
        const cultos = await db.evento.findMany({
            where: { regra_id: r.id, data: { gte: desde } },
            select: { id: true, _count: { select: { escalas: true, repertorio: true, sermoes: true } } },
        })
        for (const c of cultos) {
            if (c._count.escalas + c._count.repertorio + c._count.sermoes > 0) { ficaram++; continue }
            await db.evento.delete({ where: { id: c.id } })
            removidos++
        }
    } else {
        const enc = await db.agendaDepartamento.findMany({
            where: { regra_id: r.id, inicio: { gte: desde }, cancelado_em: null },
            select: { id: true, criado_em: true, atualizado_em: true },
        })
        for (const e of enc) {
            if (e.atualizado_em.getTime() - e.criado_em.getTime() > 2 * 60 * 1000) { ficaram++; continue }
            await db.agendaDepartamento.update({ where: { id: e.id }, data: { cancelado_em: new Date() } })
            removidos++
        }
    }
    return { removidos, ficaram }
}
