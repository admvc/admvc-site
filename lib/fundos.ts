// Banco de fundos da Mídia: imagens de fundo por categoria (Blob público <tenant>/fundos/) para as artes de divulgação.
// Parte pura (categorias, nomes, ordem): serve o browser e o servidor; testada em tests/fundos.test.ts. A base está em lib/fundos-dados.ts.

export const CATEGORIAS_FUNDO = [
    { id: 'MULHERES', texto: 'Mulheres' },
    { id: 'JOVENS', texto: 'Jovens' },
    { id: 'HOMENS', texto: 'Homens' },
    { id: 'FAMILIA', texto: 'Família' },
    { id: 'LOUVOR', texto: 'Louvor' },
    { id: 'ADMVC', texto: 'ADMVC' },
] as const

export type CategoriaFundo = (typeof CATEGORIAS_FUNDO)[number]['id']

export type Fundo = { id: number; nome: string; categoria: CategoriaFundo; url: string; largura: number; altura: number; bytes: number; ordem: number }

export const MAX_BYTES_FUNDO = 8 * 1024 * 1024
export const MAX_LADO_FUNDO = 2600

export function categoriaValida(c: unknown): c is CategoriaFundo {
    return typeof c === 'string' && CATEGORIAS_FUNDO.some((x) => x.id === c)
}

export function textoDaCategoria(c: string): string {
    return CATEGORIAS_FUNDO.find((x) => x.id === c)?.texto ?? c
}

/** Nome para mostrar: sem extensão nem sublinhados do ficheiro, espaços limpos, até 60 letras. */
export function nomeLimpo(bruto: string): string {
    const s = bruto.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim()
    return s.slice(0, 60)
}

/** Troca a posição de um item com o vizinho (-1 = antes, 1 = depois) e devolve os ids pela nova ordem. */
export function moverNaLista(ids: number[], id: number, dir: -1 | 1): number[] {
    const i = ids.indexOf(id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= ids.length) return ids
    const r = [...ids]
    ;[r[i], r[j]] = [r[j], r[i]]
    return r
}

/** O endereço é do nosso Blob público (para só apagar ficheiros nossos). */
export function urlDoBlob(url: string): boolean {
    try { return new URL(url).hostname.endsWith('.public.blob.vercel-storage.com') } catch { return false }
}
