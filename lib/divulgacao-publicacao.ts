// "Publicar para a igreja": as artes de um culto desenhadas uma vez e guardadas no Blob público, para a página aberta
// /divulgar e para o Holyrics. A lista fica em divulgacao_kits.publicado; a receita desse momento serve para saber se mudou.
import { normalizarReceita } from '@/lib/divulgacao-kit'

export type ItemPublicado = { tipo: 'telao' | 'redes'; id: string; nome: string; url: string }
export type Publicado = { itens: ItemPublicado[]; textos: { legenda: string; whatsapp: string } }

/** Pasta no Blob público onde ficam as artes publicadas deste culto. */
export const pastaPublicada = (tenantId: number, eventoId: number) => `divulgacao/${tenantId}/kits/${eventoId}/`

export const URL_BLOB = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i

/** Lê o que está guardado na base: só itens com ligação do nosso Blob. */
export function lerPublicado(x: unknown): Publicado | null {
    const o = (x && typeof x === 'object' ? x : null) as { itens?: unknown; textos?: { legenda?: unknown; whatsapp?: unknown } } | null
    if (!o || !Array.isArray(o.itens)) return null
    const itens = (o.itens as Record<string, unknown>[])
        .filter((i) => i && (i.tipo === 'telao' || i.tipo === 'redes') && typeof i.id === 'string' && typeof i.nome === 'string' && typeof i.url === 'string' && URL_BLOB.test(i.url))
        .map((i) => ({ tipo: i.tipo as 'telao' | 'redes', id: i.id as string, nome: i.nome as string, url: i.url as string }))
    if (itens.length === 0) return null
    const t = (v: unknown) => (typeof v === 'string' ? v.slice(0, 3000) : '')
    return { itens, textos: { legenda: t(o.textos?.legenda), whatsapp: t(o.textos?.whatsapp) } }
}

/** A receita de agora é igual à do momento da publicação? */
export const estaEmDia = (guardada: unknown, publicada: unknown): boolean =>
    !!publicada && JSON.stringify(normalizarReceita(guardada)) === JSON.stringify(normalizarReceita(publicada))
