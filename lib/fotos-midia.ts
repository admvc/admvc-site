// Consultas do ecrã da Mídia (/midia/fotos). Só se chamam depois de confirmar que a pessoa é da Mídia ou admin.
import prisma from '@/lib/prisma'
import { urlDaFoto } from '@/lib/fotos-armazenamento'

export type AlbumGestao = {
    id: number
    slug: string
    titulo: string
    dia: string            // AAAA-MM-DD
    publicado: boolean
    fotos: number
    bytes: number
    gostos: number
    pendentes: number
    capa: string
}

export async function albunsParaGestao(tenantId: number): Promise<AlbumGestao[]> {
    const [albuns, somas, gostos, pendentes] = await Promise.all([
        prisma.albumFoto.findMany({
            where: { tenant_id: tenantId },
            orderBy: [{ data: 'desc' }, { id: 'desc' }],
            select: {
                id: true, slug: true, titulo: true, data: true, publicado: true, capa_chave: true,
                _count: { select: { fotos: true } },
                fotos: { orderBy: [{ ordem: 'asc' }, { id: 'asc' }], take: 1, select: { chave: true, miniatura: true } },
            },
        }),
        prisma.fotoAlbum.groupBy({ by: ['album_id'], where: { album: { tenant_id: tenantId } }, _sum: { bytes: true, bytes_mini: true } }),
        prisma.fotoReacao.findMany({ where: { tenant_id: tenantId }, select: { foto: { select: { album_id: true } } } }),
        prisma.pedidoRetirarFoto.groupBy({ by: ['album_id'], where: { tenant_id: tenantId, estado: 'PENDENTE' }, _count: { _all: true } }),
    ])
    const capas = albuns.map((a) => a.capa_chave).filter((c): c is string => !!c)
    const miniaturas = capas.length
        ? new Map((await prisma.fotoAlbum.findMany({ where: { chave: { in: capas }, album: { tenant_id: tenantId } }, select: { chave: true, miniatura: true } }))
            .map((f) => [f.chave, f.miniatura ?? f.chave] as const))
        : new Map<string, string>()
    const bytes = new Map(somas.map((s) => [s.album_id, (s._sum.bytes ?? 0) + (s._sum.bytes_mini ?? 0)]))
    const gostosPorAlbum = new Map<number, number>()
    for (const g of gostos) gostosPorAlbum.set(g.foto.album_id, (gostosPorAlbum.get(g.foto.album_id) ?? 0) + 1)
    const pend = new Map(pendentes.map((p) => [p.album_id, p._count._all]))

    return albuns.map((a) => ({
        id: a.id,
        slug: a.slug,
        titulo: a.titulo,
        dia: a.data.toISOString().slice(0, 10),
        publicado: a.publicado,
        fotos: a._count.fotos,
        bytes: bytes.get(a.id) ?? 0,
        gostos: gostosPorAlbum.get(a.id) ?? 0,
        pendentes: pend.get(a.id) ?? 0,
        capa: urlDaFoto((a.capa_chave ? miniaturas.get(a.capa_chave) : null) ?? a.fotos[0]?.miniatura ?? a.fotos[0]?.chave ?? null),
    }))
}

export type FotoGestao = {
    id: number
    mini: string
    grande: string
    largura: number | null
    altura: number | null
    gostos: number
    etiquetas: number[]
    pendente: boolean
    capa: boolean
    albumId?: number
    albumTitulo?: string
}

const selecaoFoto = {
    id: true, chave: true, miniatura: true, largura: true, altura: true, album_id: true,
    _count: { select: { reacoes: true } },
    etiquetas: { select: { etiqueta_id: true } },
    pedidos: { where: { estado: 'PENDENTE' as const }, select: { id: true }, take: 1 },
}

type FotoCrua = {
    id: number; chave: string; miniatura: string | null; largura: number | null; altura: number | null; album_id: number
    _count: { reacoes: number }; etiquetas: { etiqueta_id: number }[]; pedidos: { id: number }[]
}

const paraGestao = (f: FotoCrua, capaChave: string | null, titulo?: string): FotoGestao => ({
    id: f.id,
    mini: urlDaFoto(f.miniatura ?? f.chave),
    grande: urlDaFoto(f.chave),
    largura: f.largura,
    altura: f.altura,
    gostos: f._count.reacoes,
    etiquetas: f.etiquetas.map((e) => e.etiqueta_id),
    pendente: f.pedidos.length > 0,
    capa: !!capaChave && capaChave === f.chave,
    albumId: f.album_id,
    albumTitulo: titulo,
})

/** O álbum com todas as fotos (também as escondidas), para a gestão. */
export async function albumParaGestao(tenantId: number, albumId: number) {
    const album = await prisma.albumFoto.findFirst({
        where: { id: albumId, tenant_id: tenantId },
        select: {
            id: true, slug: true, titulo: true, data: true, publicado: true, capa_chave: true,
            fotos: { orderBy: [{ ordem: 'asc' }, { hora: 'asc' }, { id: 'asc' }], select: selecaoFoto },
        },
    })
    if (!album) return null
    const bytes = await prisma.fotoAlbum.aggregate({ where: { album_id: album.id }, _sum: { bytes: true, bytes_mini: true } })
    return {
        id: album.id, slug: album.slug, titulo: album.titulo, dia: album.data.toISOString().slice(0, 10), publicado: album.publicado,
        bytes: (bytes._sum.bytes ?? 0) + (bytes._sum.bytes_mini ?? 0),
        fotos: album.fotos.map((f) => paraGestao(f, album.capa_chave)),
    }
}

/** Todas as fotos com uma etiqueta, em todos os álbuns (para escolher a foto na Divulgação sem procurar no PC). */
export async function fotosComEtiqueta(tenantId: number, etiquetaId: number, limite = 200): Promise<FotoGestao[]> {
    const fotos = await prisma.fotoAlbum.findMany({
        where: { album: { tenant_id: tenantId }, etiquetas: { some: { etiqueta_id: etiquetaId } } },
        orderBy: [{ album: { data: 'desc' } }, { ordem: 'asc' }, { id: 'asc' }],
        take: limite,
        select: { ...selecaoFoto, album: { select: { titulo: true, capa_chave: true } } },
    })
    return fotos.map((f) => paraGestao(f, f.album.capa_chave, f.album.titulo))
}

export type PedidoGestao = {
    id: number
    estado: string
    motivo: string | null
    criado_em: string
    decidido_em: string | null
    albumId: number
    albumTitulo: string
    mini: string | null
}

export async function pedidosParaGestao(tenantId: number) {
    const [pendentes, recentes] = await Promise.all([
        prisma.pedidoRetirarFoto.findMany({
            where: { tenant_id: tenantId, estado: 'PENDENTE' },
            orderBy: { criado_em: 'asc' },
            take: 100,
            select: { id: true, estado: true, motivo: true, criado_em: true, decidido_em: true, album_id: true, foto: { select: { chave: true, miniatura: true } } },
        }),
        prisma.pedidoRetirarFoto.findMany({
            where: { tenant_id: tenantId, NOT: { estado: 'PENDENTE' } },
            orderBy: { decidido_em: 'desc' },
            take: 10,
            select: { id: true, estado: true, motivo: true, criado_em: true, decidido_em: true, album_id: true, foto: { select: { chave: true, miniatura: true } } },
        }),
    ])
    const albumIds = [...new Set([...pendentes, ...recentes].map((p) => p.album_id))]
    const albuns = albumIds.length
        ? new Map((await prisma.albumFoto.findMany({ where: { id: { in: albumIds }, tenant_id: tenantId }, select: { id: true, titulo: true } })).map((a) => [a.id, a.titulo]))
        : new Map<number, string>()
    const paraLinha = (p: (typeof pendentes)[number]): PedidoGestao => ({
        id: p.id, estado: p.estado, motivo: p.motivo,
        criado_em: p.criado_em.toISOString(), decidido_em: p.decidido_em?.toISOString() ?? null,
        albumId: p.album_id, albumTitulo: albuns.get(p.album_id) ?? 'Álbum apagado',
        mini: p.foto ? urlDaFoto(p.foto.miniatura ?? p.foto.chave) : null,
    })
    return { pendentes: pendentes.map(paraLinha), recentes: recentes.map(paraLinha) }
}
