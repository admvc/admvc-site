// Regras dos albuns de fotos dos cultos (galeria publica /fotos).
// As fotos e as miniaturas vivem no Cloudflare R2; os originais ficam no PC da Media.
// Ver lib/fotos-armazenamento.ts (guardar/ler) e app/api/public/fotos/* (envio pelo FotosCulto.exe).
import prisma from '@/lib/prisma'
import { fotoVisivel } from '@/lib/fotos-gestao'

/** "2026-11-02" + "Culto de Teste" → "2026-11-02-culto-de-teste". */
export function slugDoAlbum(dia: string, titulo: string) {
    const limpo = titulo
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48)
        .replace(/-+$/g, '')
    return `${dia}${limpo ? `-${limpo}` : ''}`
}

export const diaValido = (dia: string) => /^\d{4}-\d{2}-\d{2}$/.test(dia) && !Number.isNaN(Date.parse(`${dia}T00:00:00Z`))

/** "Domingo, 2 de novembro de 2026" (as datas dos cultos são Lisboa escritas em UTC). */
export function dataPorExtenso(iso: string) {
    const t = new Date(iso).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    return t.charAt(0).toUpperCase() + t.slice(1)
}

/** "02 nov 2026" */
export function dataCurta(iso: string) {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).replace(/\./g, '')
}

export type AlbumResumo = {
    slug: string
    titulo: string
    data: string
    descricao: string | null
    capa: string | null
    fotos: number
}

/** Os albuns publicados, do mais recente para o mais antigo. Sem login: so o que esta publicado e visivel (sem "Nao publicar" nem pedidos de retirada). */
export async function albunsPublicos(tenantId: number, limite = 60): Promise<AlbumResumo[]> {
    const albuns = await prisma.albumFoto.findMany({
        where: { tenant_id: tenantId, publicado: true },
        orderBy: [{ data: 'desc' }, { id: 'desc' }],
        take: limite,
        select: {
            id: true, slug: true, titulo: true, data: true, descricao: true, capa_chave: true,
            _count: { select: { fotos: { where: fotoVisivel } } },
            fotos: { where: fotoVisivel, orderBy: [{ ordem: 'asc' }, { id: 'asc' }], take: 1, select: { chave: true, miniatura: true } },
        },
    })
    // A capa escolhida so vale se a foto continuar visivel.
    const capas = albuns.map((a) => a.capa_chave).filter((c): c is string => !!c)
    const capasVisiveis = capas.length
        ? new Map((await prisma.fotoAlbum.findMany({
            where: { album_id: { in: albuns.map((a) => a.id) }, chave: { in: capas }, ...fotoVisivel },
            select: { chave: true, miniatura: true },
        })).map((f) => [f.chave, f.miniatura ?? f.chave] as const))
        : new Map<string, string>()
    return albuns
        .filter((a) => a._count.fotos > 0)
        .map((a) => ({
            slug: a.slug,
            titulo: a.titulo,
            data: a.data.toISOString(),
            descricao: a.descricao,
            capa: (a.capa_chave ? capasVisiveis.get(a.capa_chave) : null) ?? a.fotos[0]?.miniatura ?? a.fotos[0]?.chave ?? null,
            fotos: a._count.fotos,
        }))
}

/** Um album publicado, com as fotos visiveis ja ordenadas e a contagem de coracoes. */
export async function albumPublico(tenantId: number, slug: string) {
    const album = await prisma.albumFoto.findFirst({
        where: { tenant_id: tenantId, slug, publicado: true },
        select: {
            slug: true, titulo: true, data: true, descricao: true, capa_chave: true,
            fotos: {
                where: fotoVisivel,
                orderBy: [{ ordem: 'asc' }, { hora: 'asc' }, { id: 'asc' }],
                select: { id: true, chave: true, miniatura: true, largura: true, altura: true },
            },
        },
    })
    if (!album) return null
    const capaVisivel = album.capa_chave && album.fotos.some((f) => f.chave === album.capa_chave) ? album.capa_chave : null
    return {
        ...album,
        data: album.data.toISOString(),
        capa: capaVisivel ?? album.fotos[0]?.chave ?? null,
    }
}

/** Contagem de reaccoes por foto e por emoji: { fotoId: { '❤️': 3, '🙏': 1 } }. */
export async function contagemReacoes(fotoIds: number[]): Promise<Map<number, Record<string, number>>> {
    const mapa = new Map<number, Record<string, number>>()
    if (!fotoIds.length) return mapa
    const linhas = await prisma.fotoReacao.groupBy({ by: ['foto_id', 'emoji'], where: { foto_id: { in: fotoIds } }, _count: { _all: true } })
    for (const l of linhas) mapa.set(l.foto_id, { ...(mapa.get(l.foto_id) ?? {}), [l.emoji]: l._count._all })
    return mapa
}

/** Que emojis este aparelho ja usou em cada foto: { fotoId: ['❤️', '🙏'] }. */
export async function reacoesDoAparelho(fotoIds: number[], aparelhoHash: string | null): Promise<Map<number, string[]>> {
    const mapa = new Map<number, string[]>()
    if (!aparelhoHash || !fotoIds.length) return mapa
    const r = await prisma.fotoReacao.findMany({ where: { foto_id: { in: fotoIds }, aparelho_hash: aparelhoHash }, select: { foto_id: true, emoji: true } })
    for (const x of r) mapa.set(x.foto_id, [...(mapa.get(x.foto_id) ?? []), x.emoji])
    return mapa
}

/**
 * Cria o album do culto ou devolve o que ja existe (repetir o envio nao duplica nada).
 * `dia` e a data do culto (AAAA-MM-DD), gravada a 00:00 UTC como as datas dos eventos.
 */
export async function criarOuObterAlbum(tenantId: number, dia: string, titulo: string, eventoId?: number | null) {
    const base = slugDoAlbum(dia, titulo)
    let escolhido = ''
    for (let n = 2; n < 100; n++) {
        const slug = n === 2 ? base : `${base}-${n}`
        const existe = await prisma.albumFoto.findUnique({ where: { slug }, select: { id: true, slug: true, titulo: true, tenant_id: true } })
        if (!existe) { escolhido = slug; break }
        if (existe.tenant_id === tenantId && existe.titulo === titulo) return { id: existe.id, slug: existe.slug, novo: false }
        // mesmo endereco mas outro titulo: segue para -2, -3…
    }
    if (!escolhido) throw new Error('Nao consegui arranjar um endereco para o album.')
    const criado = await prisma.albumFoto.create({
        data: {
            tenant_id: tenantId,
            slug: escolhido,
            titulo,
            data: new Date(`${dia}T00:00:00Z`),
            evento_id: eventoId ?? null,
        },
        select: { id: true, slug: true },
    })
    return { ...criado, novo: true }
}
