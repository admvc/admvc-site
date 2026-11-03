// Lado do servidor do álbum: o que a galeria pública pode mostrar, o espaço usado, etiquetas de base,
// "aparelho" das reações (cookie + hash) e o aviso à Mídia. As regras puras (limites) estão em lib/fotos-limites.ts.
import { createHmac, randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { segredoDaSessao } from '@/lib/sessao-core'
import { sendPushToMembros } from '@/lib/web-push'

// ── O que é público ──────────────────────────────────────────────────────────

/** Uma foto só aparece na galeria se não tiver etiqueta que esconde ("Não publicar") nem pedido de retirada pendente. */
export const fotoVisivel: Prisma.FotoAlbumWhereInput = {
    etiquetas: { none: { etiqueta: { esconde: true } } },
    pedidos: { none: { estado: 'PENDENTE' } },
}

// ── Etiquetas ────────────────────────────────────────────────────────────────

export const ETIQUETAS_SEMENTE = [
    { nome: 'Destaque', icone: '⭐', cor: '#b7791f', esconde: false },
    { nome: 'Divulgação', icone: '📣', cor: '#2b6cb0', esconde: false },
    { nome: 'Capa', icone: '🖼️', cor: '#6b46c1', esconde: false },
    { nome: 'Redes', icone: '📱', cor: '#c05621', esconde: false },
    { nome: 'Crianças', icone: '🧒', cor: '#2f855a', esconde: false },
    { nome: 'Não publicar', icone: '🚫', cor: '#c53030', esconde: true },
] as const

/** Cria as etiquetas de base da igreja se ainda não houver nenhuma (repetir não duplica). */
export async function garantirEtiquetas(tenantId: number) {
    const ja = await prisma.etiquetaFoto.count({ where: { tenant_id: tenantId } })
    if (ja === 0) {
        await prisma.etiquetaFoto.createMany({
            data: ETIQUETAS_SEMENTE.map((e, i) => ({ tenant_id: tenantId, ordem: i, ...e })),
            skipDuplicates: true,
        })
    }
    return prisma.etiquetaFoto.findMany({ where: { tenant_id: tenantId }, orderBy: [{ ordem: 'asc' }, { id: 'asc' }] })
}

// ── Espaço usado ─────────────────────────────────────────────────────────────

/** Bytes (versão web + miniaturas) e fotos de toda a igreja. */
export async function espacoUsado(tenantId: number) {
    const r = await prisma.fotoAlbum.aggregate({
        where: { album: { tenant_id: tenantId } },
        _sum: { bytes: true, bytes_mini: true },
        _count: { _all: true },
    })
    return { bytes: (r._sum.bytes ?? 0) + (r._sum.bytes_mini ?? 0), fotos: r._count._all }
}

/** O que um álbum ocupa e quantas fotos tem. */
export async function espacoDoAlbum(albumId: number) {
    const r = await prisma.fotoAlbum.aggregate({
        where: { album_id: albumId },
        _sum: { bytes: true, bytes_mini: true },
        _count: { _all: true },
    })
    return { bytes: (r._sum.bytes ?? 0) + (r._sum.bytes_mini ?? 0), fotos: r._count._all }
}

// ── Aparelho (reações e pedidos, sem login) ──────────────────────────────────

export const COOKIE_APARELHO = 'fotos_ap'

const hash = (dominio: string, valor: string) =>
    createHmac('sha256', segredoDaSessao()).update(`${dominio}:${valor}`).digest('hex')

export const novoAparelho = () => randomUUID()
export const hashDoAparelho = (cookie: string) => hash('fotos-aparelho', cookie)
/** O IP nunca se guarda: só este hash (não dá para voltar ao IP). */
export const hashDoIp = (ip: string) => hash('fotos-ip', ip)

/** O cookie tem de parecer um UUID (nada de lixo a entrar nos hashes). */
export const aparelhoValido = (v: string | undefined | null): v is string =>
    !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

// ── Aviso à Mídia (push) ─────────────────────────────────────────────────────

/** Membros da equipa da Mídia (nome do departamento com "mídia"/"midia"/"comunica") ou administradores com push ligado. */
export async function avisarMidia(tenantId: number, payload: { title: string; body: string; url?: string; tag?: string }) {
    try {
        const termos = ['mídia', 'midia', 'comunica']
        const membros = await prisma.membro.findMany({
            where: {
                tenant_id: tenantId,
                push_subscription: { not: null },
                OR: termos.flatMap((t) => [
                    { ministerios: { some: { departamento: { nome: { contains: t, mode: 'insensitive' as const } } } } },
                    { departamentos_liderados: { some: { nome: { contains: t, mode: 'insensitive' as const } } } },
                ]),
            },
            select: { id: true },
            take: 50,
        })
        if (!membros.length) return { enviados: 0, total: 0 }
        return await sendPushToMembros(membros.map((m) => m.id), payload)
    } catch (e) {
        console.error('[FOTOS] Não consegui avisar a Mídia:', e)
        return { enviados: 0, total: 0 }
    }
}
