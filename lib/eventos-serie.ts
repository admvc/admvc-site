// Cultos recorrentes: o "contínuo" cria eventos soltos, sem guardar a série.
// A série reconhece-se assim: mesmo nome, tipo e congregação, no mesmo dia da
// semana e à mesma hora (como estão gravados; a hora gravada não muda com a
// hora de verão). Funciona também com os cultos que já existiam.

/** Dia da semana + hora gravados, ex.: "3-20:00" (quarta, 20:00). */
export function marcaHoraria(data: Date): string {
    const d = new Date(data)
    return `${d.getUTCDay()}-${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

type EventoBase = { id: number; nome: string; tipo: string; congregacao_id: number | null; data: Date }

/** Os eventos da mesma série a partir deste (inclusive), por ordem de data. */
export function filtrarSerie<T extends EventoBase>(evento: EventoBase, candidatos: T[]): T[] {
    const marca = marcaHoraria(evento.data)
    return candidatos
        .filter(e => e.nome === evento.nome && e.tipo === evento.tipo && (e.congregacao_id ?? null) === (evento.congregacao_id ?? null))
        .filter(e => new Date(e.data).getTime() >= new Date(evento.data).getTime())
        .filter(e => marcaHoraria(e.data) === marca)
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
}

/** "20:30" → minutos desde a meia-noite (null se inválido). */
export function minutosDe(hhmm: string | null | undefined): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? '').trim())
    if (!m) return null
    const h = Number(m[1]), min = Number(m[2])
    return h < 24 && min < 60 ? h * 60 + min : null
}

/**
 * Mudar a hora de toda a série: aplica a mesma diferença a cada culto
 * (a janela mostra a hora como o browser a vê; a diferença não depende disso).
 */
export function deslocar(data: Date, minutos: number): Date {
    return new Date(new Date(data).getTime() + minutos * 60_000)
}

// ── Base de dados (cliente filtrado pela igreja) ─────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any

export async function serieDoEvento(db: Db, eventoId: number) {
    const evento: (EventoBase & { tenant_id: number }) | null = await db.evento.findUnique({ where: { id: eventoId } })
    if (!evento) return null
    const candidatos: Array<EventoBase & { _count: { escalas: number; repertorio: number; sermoes: number } }> = await db.evento.findMany({
        where: { nome: evento.nome, tipo: evento.tipo, congregacao_id: evento.congregacao_id, data: { gte: evento.data } },
        select: { id: true, nome: true, tipo: true, congregacao_id: true, data: true, _count: { select: { escalas: true, repertorio: true, sermoes: true } } },
    })
    return { evento, serie: filtrarSerie(evento, candidatos) }
}

/** Apaga o evento e o que depende dele (escalas, repertório, mensagem, boleias, cantina, sermões). */
export async function apagarEventoComDependencias(db: Db, id: number) {
    await db.escala.deleteMany({ where: { evento_id: id } })
    await db.repertorioEvento.deleteMany({ where: { evento_id: id } })
    await db.mensagemEvento.deleteMany({ where: { evento_id: id } })
    await db.boleiaOferta.deleteMany({ where: { evento_id: id } })
    await db.preEncomendaCantina.deleteMany({ where: { evento_id: id } })
    const cardapio = await db.cardapioCantina.findUnique({ where: { evento_id: id } })
    if (cardapio) {
        await db.cardapioItem.deleteMany({ where: { cardapio_id: cardapio.id } })
        await db.cardapioCantina.delete({ where: { id: cardapio.id } })
    }
    await db.sermao.deleteMany({ where: { evento_id: id } })
    await db.evento.delete({ where: { id } })
}
