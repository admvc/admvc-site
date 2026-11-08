// Pequenas regras puras da galeria publica de fotos (sem base de dados): emojis, anos, vizinhos.

/** As reaccoes permitidas, por ordem. A primeira e a de antes (coracao). */
export const EMOJIS_FOTOS = ['❤️', '🙏', '🙌', '😂'] as const
export type EmojiFoto = (typeof EMOJIS_FOTOS)[number]

export const EMOJI_NOMES: Record<EmojiFoto, string> = {
    '❤️': 'Coração',
    '🙏': 'Gratidão',
    '🙌': 'Louvor',
    '😂': 'Riso',
}

export function emojiValido(v: unknown): v is EmojiFoto {
    return typeof v === 'string' && (EMOJIS_FOTOS as readonly string[]).includes(v)
}

/** Agrupa por ano (do mais recente para o mais antigo), mantendo a ordem de entrada dentro do ano. `data` e ISO em UTC. */
export function agruparPorAno<T extends { data: string }>(lista: T[]): { ano: number; itens: T[] }[] {
    const grupos = new Map<number, T[]>()
    for (const item of lista) {
        const ano = new Date(item.data).getUTCFullYear()
        grupos.set(ano, [...(grupos.get(ano) ?? []), item])
    }
    return [...grupos.entries()].sort((a, b) => b[0] - a[0]).map(([ano, itens]) => ({ ano, itens }))
}

/** Na lista (do mais recente para o mais antigo): o album seguinte (mais recente) e o anterior (mais antigo). */
export function vizinhosDoAlbum<T extends { slug: string }>(lista: T[], slug: string): { maisRecente: T | null; maisAntigo: T | null } {
    const i = lista.findIndex((a) => a.slug === slug)
    if (i < 0) return { maisRecente: null, maisAntigo: null }
    return { maisRecente: lista[i - 1] ?? null, maisAntigo: lista[i + 1] ?? null }
}

/** Rotacao leve e alternada das capas (em graus), estavel por posicao. */
export function inclinacao(n: number): number {
    return [-1.4, 1.1, -0.7, 1.6, -1.1, 0.8][n % 6]
}
