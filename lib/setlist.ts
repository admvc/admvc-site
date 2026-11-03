// lib/setlist.ts
// Lógica PURA da setlist de um culto: duração total do louvor e avisos discretos.
// Sem rede nem base de dados (tests/setlist.test.ts).

export interface ItemSetlist {
    titulo: string
    /** Tom em que vai ser tocada neste culto */
    tom: string | null
    bpm: number | null
    duracaoSeg: number | null
}

export interface ResumoSetlist {
    /** Soma das durações conhecidas, em segundos */
    totalSeg: number
    /** Quantas músicas não têm duração conhecida (contam como "?") */
    semDuracao: number
    avisos: string[]
}

/** Salto de bpm a partir do qual se avisa entre duas músicas seguidas. */
export const SALTO_BPM = 40
/** Quantas músicas seguidas no mesmo tom já merecem um aviso. */
export const MESMO_TOM_SEGUIDAS = 3

const tomNorm = (t: string | null | undefined) => (t ?? '').trim().toLowerCase()

/** 1500 -> "25:00"; passa a h:mm:ss a partir de uma hora. */
export function formatarTempo(seg: number): string {
    const s = Math.max(0, Math.round(seg))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const r = String(s % 60).padStart(2, '0')
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
}

/** "Duração total" para mostrar: "27:35", "27:35 + ?" (uma sem duração) ou "27:35 + 2 ?". null se não há nenhuma conhecida. */
export function textoDuracaoTotal(r: Pick<ResumoSetlist, 'totalSeg' | 'semDuracao'>): string | null {
    if (r.totalSeg <= 0) return r.semDuracao > 0 ? '?' : null
    if (r.semDuracao === 0) return formatarTempo(r.totalSeg)
    return `${formatarTempo(r.totalSeg)} + ${r.semDuracao === 1 ? '' : `${r.semDuracao} `}?`
}

export function resumirSetlist(itens: ItemSetlist[]): ResumoSetlist {
    let totalSeg = 0
    let semDuracao = 0
    for (const i of itens) {
        if (i.duracaoSeg != null && i.duracaoSeg > 0) totalSeg += i.duracaoSeg
        else semDuracao++
    }

    const avisos: string[] = []

    // Mesmo tom N vezes seguidas (um aviso por sequência)
    let inicio = 0
    for (let k = 1; k <= itens.length; k++) {
        const igual = k < itens.length && tomNorm(itens[k].tom) !== '' && tomNorm(itens[k].tom) === tomNorm(itens[inicio].tom)
        if (igual) continue
        const tam = k - inicio
        if (tam >= MESMO_TOM_SEGUIDAS && tomNorm(itens[inicio].tom) !== '') {
            avisos.push(`${tam} músicas seguidas em ${itens[inicio].tom!.trim()} (n.º ${inicio + 1} a ${k}).`)
        }
        inicio = k
    }

    // Salto grande de bpm entre músicas seguidas
    for (let k = 1; k < itens.length; k++) {
        const a = itens[k - 1].bpm
        const b = itens[k].bpm
        if (a != null && b != null && Math.abs(a - b) >= SALTO_BPM) {
            avisos.push(`Salto de ${a} para ${b} bpm entre a ${k} e a ${k + 1}.`)
        }
    }

    return { totalSeg, semDuracao, avisos }
}
