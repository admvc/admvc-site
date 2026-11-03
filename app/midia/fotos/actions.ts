'use server'

// Ações do ecrã da Mídia (/midia/fotos): álbuns, etiquetas e pedidos para retirar fotos.
// Só a Mídia e a administração (lib/equipas.ts). Cada id é conferido contra a igreja da sessão.
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { exigirEquipa, EQUIPA_MIDIA } from '@/lib/equipas'
import { apagarFicheiro } from '@/lib/fotos-armazenamento'
import { diaValido } from '@/lib/fotos'

export type Resultado = { ok: true; aviso?: string } | { ok: false; erro: string }

const falha = (e: unknown): Resultado => ({ ok: false, erro: e instanceof Error ? e.message : 'Não foi possível concluir.' })

const sessaoMidia = () => exigirEquipa(EQUIPA_MIDIA, [], 'a Mídia e a administração')

function atualizar(albumId?: number) {
    revalidatePath('/midia/fotos')
    if (albumId) revalidatePath(`/midia/fotos/${albumId}`)
    revalidatePath('/fotos')
}

const ids = (v: unknown): number[] =>
    Array.isArray(v) ? [...new Set(v.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500) : []

/** Apaga os ficheiros (versão web e miniatura). Se algum falhar, devolve quantos. */
async function apagarFicheirosDe(fotos: { chave: string; miniatura: string | null }[]) {
    let falhas = 0
    for (const f of fotos) {
        if (!(await apagarFicheiro(f.chave))) falhas++
        if (f.miniatura && !(await apagarFicheiro(f.miniatura))) falhas++
    }
    return falhas
}

// ── Álbuns ───────────────────────────────────────────────────────────────────

export async function guardarAlbum(albumId: number, dados: { titulo: string; dia: string; capaFotoId?: number | null }): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const titulo = String(dados.titulo ?? '').trim()
        if (titulo.length < 2 || titulo.length > 120) return { ok: false, erro: 'O título tem de ter entre 2 e 120 letras.' }
        if (!diaValido(String(dados.dia))) return { ok: false, erro: 'A data não é válida.' }
        const album = await prisma.albumFoto.findFirst({ where: { id: albumId, tenant_id: sessao.tenantId }, select: { id: true } })
        if (!album) return { ok: false, erro: 'Álbum não encontrado.' }

        let capa: { capa_chave: string } | Record<string, never> = {}
        if (dados.capaFotoId) {
            const foto = await prisma.fotoAlbum.findFirst({ where: { id: Number(dados.capaFotoId), album_id: album.id }, select: { chave: true } })
            if (!foto) return { ok: false, erro: 'Essa foto não é deste álbum.' }
            capa = { capa_chave: foto.chave }
        }
        await prisma.albumFoto.update({ where: { id: album.id }, data: { titulo, data: new Date(`${dados.dia}T00:00:00Z`), ...capa } })
        atualizar(album.id)
        return { ok: true }
    } catch (e) { return falha(e) }
}

export async function publicarAlbum(albumId: number, publicar: boolean): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const album = await prisma.albumFoto.findFirst({ where: { id: albumId, tenant_id: sessao.tenantId }, select: { id: true, _count: { select: { fotos: true } } } })
        if (!album) return { ok: false, erro: 'Álbum não encontrado.' }
        if (publicar && album._count.fotos === 0) return { ok: false, erro: 'O álbum ainda não tem fotos.' }
        await prisma.albumFoto.update({ where: { id: album.id }, data: { publicado: publicar } })
        atualizar(album.id)
        return { ok: true }
    } catch (e) { return falha(e) }
}

export async function apagarAlbum(albumId: number): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const album = await prisma.albumFoto.findFirst({
            where: { id: albumId, tenant_id: sessao.tenantId },
            select: { id: true, fotos: { select: { chave: true, miniatura: true } } },
        })
        if (!album) return { ok: false, erro: 'Álbum não encontrado.' }
        const falhas = await apagarFicheirosDe(album.fotos)
        if (falhas) return { ok: false, erro: `Não consegui apagar ${falhas} ficheiro(s) do armazenamento. O álbum ficou como estava; tente outra vez.` }
        await prisma.pedidoRetirarFoto.deleteMany({ where: { album_id: album.id, tenant_id: sessao.tenantId } })
        await prisma.albumFoto.delete({ where: { id: album.id } })
        atualizar()
        return { ok: true }
    } catch (e) { return falha(e) }
}

export async function apagarFotos(albumId: number, fotoIds: number[]): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const lista = ids(fotoIds)
        if (!lista.length) return { ok: false, erro: 'Escolha pelo menos uma foto.' }
        const fotos = await prisma.fotoAlbum.findMany({
            where: { id: { in: lista }, album_id: albumId, album: { tenant_id: sessao.tenantId } },
            select: { id: true, chave: true, miniatura: true },
        })
        if (!fotos.length) return { ok: false, erro: 'Fotos não encontradas.' }
        const falhas = await apagarFicheirosDe(fotos)
        if (falhas) return { ok: false, erro: `Não consegui apagar ${falhas} ficheiro(s) do armazenamento. Tente outra vez.` }
        const alvo = fotos.map((f) => f.id)
        await prisma.pedidoRetirarFoto.updateMany({ where: { foto_id: { in: alvo }, estado: 'PENDENTE' }, data: { estado: 'ACEITE', decidido_em: new Date(), decidido_por: sessao.membroId } })
        await prisma.fotoAlbum.deleteMany({ where: { id: { in: alvo } } })
        // se a capa era uma destas, o álbum volta a usar a primeira foto
        await prisma.albumFoto.updateMany({ where: { id: albumId, capa_chave: { in: fotos.map((f) => f.chave) } }, data: { capa_chave: null } })
        atualizar(albumId)
        return { ok: true }
    } catch (e) { return falha(e) }
}

// ── Etiquetas ────────────────────────────────────────────────────────────────

const COR = /^#[0-9a-fA-F]{6}$/

function lerEtiqueta(d: { nome: string; cor: string; icone?: string; esconde?: boolean }) {
    const nome = String(d.nome ?? '').trim()
    if (nome.length < 1 || nome.length > 30) return { erro: 'O nome da etiqueta tem de ter entre 1 e 30 letras.' as const }
    if (!COR.test(String(d.cor))) return { erro: 'A cor não é válida.' as const }
    const icone = String(d.icone ?? '').trim().slice(0, 8) || null
    return { nome, cor: String(d.cor), icone, esconde: !!d.esconde }
}

export async function criarEtiqueta(d: { nome: string; cor: string; icone?: string; esconde?: boolean }): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const v = lerEtiqueta(d)
        if ('erro' in v) return { ok: false, erro: v.erro }
        const ja = await prisma.etiquetaFoto.findUnique({ where: { tenant_id_nome: { tenant_id: sessao.tenantId, nome: v.nome } }, select: { id: true } })
        if (ja) return { ok: false, erro: 'Já existe uma etiqueta com esse nome.' }
        const ultima = await prisma.etiquetaFoto.aggregate({ where: { tenant_id: sessao.tenantId }, _max: { ordem: true } })
        await prisma.etiquetaFoto.create({ data: { tenant_id: sessao.tenantId, ...v, ordem: (ultima._max.ordem ?? 0) + 1 } })
        atualizar()
        return { ok: true }
    } catch (e) { return falha(e) }
}

export async function guardarEtiqueta(etiquetaId: number, d: { nome: string; cor: string; icone?: string; esconde?: boolean }): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const v = lerEtiqueta(d)
        if ('erro' in v) return { ok: false, erro: v.erro }
        const atual = await prisma.etiquetaFoto.findFirst({ where: { id: etiquetaId, tenant_id: sessao.tenantId }, select: { id: true, esconde: true, _count: { select: { fotos: true } } } })
        if (!atual) return { ok: false, erro: 'Etiqueta não encontrada.' }
        if (atual.esconde && !v.esconde && atual._count.fotos > 0) {
            return { ok: false, erro: `Há ${atual._count.fotos} foto(s) com esta etiqueta. Se deixar de esconder, elas passam a aparecer na galeria. Tire-lhes a etiqueta primeiro.` }
        }
        const outra = await prisma.etiquetaFoto.findFirst({ where: { tenant_id: sessao.tenantId, nome: v.nome, NOT: { id: atual.id } }, select: { id: true } })
        if (outra) return { ok: false, erro: 'Já existe uma etiqueta com esse nome.' }
        await prisma.etiquetaFoto.update({ where: { id: atual.id }, data: v })
        atualizar()
        return { ok: true }
    } catch (e) { return falha(e) }
}

export async function apagarEtiqueta(etiquetaId: number): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const atual = await prisma.etiquetaFoto.findFirst({ where: { id: etiquetaId, tenant_id: sessao.tenantId }, select: { id: true, esconde: true, _count: { select: { fotos: true } } } })
        if (!atual) return { ok: false, erro: 'Etiqueta não encontrada.' }
        if (atual.esconde && atual._count.fotos > 0) {
            return { ok: false, erro: `Há ${atual._count.fotos} foto(s) escondidas com esta etiqueta. Apagá-la fá-las-ia aparecer na galeria. Tire-lhes a etiqueta primeiro.` }
        }
        await prisma.etiquetaFoto.delete({ where: { id: atual.id } })
        atualizar()
        return { ok: true }
    } catch (e) { return falha(e) }
}

/** Põe ou tira uma etiqueta a várias fotos de uma vez. */
export async function marcarFotos(fotoIds: number[], etiquetaId: number, por: boolean): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const lista = ids(fotoIds)
        if (!lista.length) return { ok: false, erro: 'Escolha pelo menos uma foto.' }
        const etiqueta = await prisma.etiquetaFoto.findFirst({ where: { id: Number(etiquetaId), tenant_id: sessao.tenantId }, select: { id: true } })
        if (!etiqueta) return { ok: false, erro: 'Etiqueta não encontrada.' }
        const fotos = await prisma.fotoAlbum.findMany({ where: { id: { in: lista }, album: { tenant_id: sessao.tenantId } }, select: { id: true, album_id: true } })
        if (!fotos.length) return { ok: false, erro: 'Fotos não encontradas.' }
        if (por) {
            await prisma.fotoEtiqueta.createMany({
                data: fotos.map((f) => ({ foto_id: f.id, etiqueta_id: etiqueta.id, membro_id: sessao.membroId })),
                skipDuplicates: true,
            })
        } else {
            await prisma.fotoEtiqueta.deleteMany({ where: { foto_id: { in: fotos.map((f) => f.id) }, etiqueta_id: etiqueta.id } })
        }
        atualizar([...new Set(fotos.map((f) => f.album_id))].length === 1 ? fotos[0].album_id : undefined)
        return { ok: true }
    } catch (e) { return falha(e) }
}

// ── Pedidos para retirar ─────────────────────────────────────────────────────

export async function decidirPedido(pedidoId: number, aceitar: boolean): Promise<Resultado> {
    try {
        const sessao = await sessaoMidia()
        const pedido = await prisma.pedidoRetirarFoto.findFirst({
            where: { id: pedidoId, tenant_id: sessao.tenantId },
            select: { id: true, estado: true, album_id: true, foto: { select: { id: true, chave: true, miniatura: true } } },
        })
        if (!pedido) return { ok: false, erro: 'Pedido não encontrado.' }
        if (pedido.estado !== 'PENDENTE') return { ok: false, erro: 'Este pedido já foi decidido.' }

        if (aceitar && pedido.foto) {
            const falhas = await apagarFicheirosDe([pedido.foto])
            if (falhas) return { ok: false, erro: 'Não consegui apagar a foto do armazenamento. Tente outra vez.' }
        }
        await prisma.pedidoRetirarFoto.update({
            where: { id: pedido.id },
            data: { estado: aceitar ? 'ACEITE' : 'RECUSADO', decidido_em: new Date(), decidido_por: sessao.membroId },
        })
        if (aceitar && pedido.foto) {
            await prisma.fotoAlbum.delete({ where: { id: pedido.foto.id } })
            await prisma.albumFoto.updateMany({ where: { id: pedido.album_id, capa_chave: pedido.foto.chave }, data: { capa_chave: null } })
        }
        atualizar(pedido.album_id)
        return { ok: true }
    } catch (e) { return falha(e) }
}
