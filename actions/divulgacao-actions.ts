'use server'

// Kit de divulgação de um culto: guardar a "receita" (estilo, paleta, peças e textos). As imagens geram-se na hora.
// "Publicar para a igreja": as artes ficam desenhadas no Blob público para a página /divulgar e para o Holyrics.

import { revalidatePath } from 'next/cache'
import { del } from '@vercel/blob'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth-utils'
import prisma, { getTenantClient } from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { PECAS, REDES } from '@/lib/divulgacao'
import { normalizarReceita } from '@/lib/divulgacao-kit'
import { URL_BLOB, lerPublicado, pastaPublicada, type ItemPublicado } from '@/lib/divulgacao-publicacao'

type R = { ok: true } | { ok: false; error: string }

export async function guardarKitDivulgacao(eventoId: number, receita: unknown): Promise<R> {
    try {
        const sessao = await requireAuth()
        if (!(await podeFazerAgenda(sessao))) return { ok: false, error: 'Só a Mídia e a administração.' }
        if (!Number.isInteger(eventoId) || eventoId <= 0) return { ok: false, error: 'Evento inválido.' }
        const r = normalizarReceita(receita)
        if (r.pecas.length === 0) return { ok: false, error: 'Escolha pelo menos uma arte.' }

        const db = getTenantClient(sessao.tenantId)
        const evento = await db.evento.findFirst({ where: { id: eventoId }, select: { id: true } })
        if (!evento) return { ok: false, error: 'Evento não encontrado.' }

        const ja = await db.kitDivulgacao.findFirst({ where: { evento_id: eventoId }, select: { id: true } })
        if (ja) await db.kitDivulgacao.update({ where: { id: ja.id }, data: { receita: r } })
        else await db.kitDivulgacao.create({ data: { evento_id: eventoId, receita: r } as never })

        revalidatePath('/midia/divulgacao')
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível guardar.' }
    }
}

/**
 * Fim da publicação: as artes já foram desenhadas e enviadas (/api/divulgacao/publicar, uma a uma). Aqui grava-se a lista,
 * os textos e a receita desse momento, e apagam-se os ficheiros da publicação anterior que já não servem.
 */
export async function concluirPublicacao(
    eventoId: number, lote: string, itens: { tipo: string; id: string; url: string }[], textos: { legenda?: string; whatsapp?: string },
): Promise<R> {
    try {
        const sessao = await requireAuth()
        if (!(await podeFazerAgenda(sessao))) return { ok: false, error: 'Só a Mídia e a administração.' }
        if (!Number.isInteger(eventoId) || eventoId <= 0 || !/^\d{10,14}$/.test(lote)) return { ok: false, error: 'Pedido inválido.' }

        const db = getTenantClient(sessao.tenantId)
        const kit = await db.kitDivulgacao.findFirst({ where: { evento_id: eventoId }, select: { id: true, receita: true, publicado: true } })
        if (!kit) return { ok: false, error: 'Guarde as artes antes de as publicar.' }
        const receita = normalizarReceita(kit.receita)

        // Só ficheiros desta publicação, na pasta deste culto, de artes que o kit guardado realmente tem
        const pasta = `/${pastaPublicada(sessao.tenantId, eventoId)}${lote}-`
        const lista: ItemPublicado[] = []
        for (const i of Array.isArray(itens) ? itens : []) {
            const telao = i.tipo === 'peca' && receita.pecas.includes(i.id as never)
            const redes = i.tipo === 'rede' && receita.redes.includes(i.id as never)
            let ok = false
            try { ok = (telao || redes) && URL_BLOB.test(i.url) && new URL(i.url).pathname.startsWith(`${pasta}${i.tipo}-${i.id}`) } catch { /* ligação inválida */ }
            if (!ok) return { ok: false, error: 'Uma das artes publicadas não é válida. Tente publicar outra vez.' }
            if (telao) lista.push({ tipo: 'telao', id: i.id, nome: PECAS.find((p) => p.id === i.id)?.nome ?? i.id, url: i.url })
            else lista.push({ tipo: 'redes', id: i.id, nome: REDES.find((p) => p.id === i.id)?.nome ?? i.id, url: i.url })
        }
        if (lista.length === 0) return { ok: false, error: 'Não há artes para publicar.' }
        // pela ordem do kit: telão (como no Holyrics) e depois as redes
        const ordem = (x: ItemPublicado) => (x.tipo === 'telao' ? receita.pecas.indexOf(x.id as never) : 100 + receita.redes.indexOf(x.id as never))
        lista.sort((a, b) => ordem(a) - ordem(b))
        const texto = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 3000) : '')

        const antigas = lerPublicado(kit.publicado)?.itens.map((i) => i.url).filter((u) => !lista.some((n) => n.url === u)) ?? []
        await db.kitDivulgacao.update({
            where: { id: kit.id },
            data: { publicado: { itens: lista, textos: { legenda: texto(textos?.legenda), whatsapp: texto(textos?.whatsapp) } }, publicado_em: new Date(), publicado_receita: receita },
        })
        if (antigas.length > 0) await del(antigas).catch(() => { /* ficheiros antigos que não saíram: não impede a publicação */ })

        revalidatePath('/midia/divulgacao'); revalidatePath('/divulgar')
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível publicar.' }
    }
}

/** Tira o culto da página "Divulgar" e apaga as artes publicadas (o kit guardado fica). */
export async function retirarPublicacao(eventoId: number): Promise<R> {
    try {
        const sessao = await requireAuth()
        if (!(await podeFazerAgenda(sessao))) return { ok: false, error: 'Só a Mídia e a administração.' }
        const db = getTenantClient(sessao.tenantId)
        const kit = await db.kitDivulgacao.findFirst({ where: { evento_id: eventoId }, select: { id: true, publicado: true } })
        if (!kit) return { ok: true }
        const urls = lerPublicado(kit.publicado)?.itens.map((i) => i.url) ?? []
        await db.kitDivulgacao.update({ where: { id: kit.id }, data: { publicado: Prisma.DbNull, publicado_em: null, publicado_receita: Prisma.DbNull } })
        if (urls.length > 0) await del(urls).catch(() => { /* idem */ })
        revalidatePath('/midia/divulgacao'); revalidatePath('/divulgar')
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível retirar.' }
    }
}

/** "Usar como padrão da igreja": os kits novos começam com este estilo, cores, redes e fundo. */
export async function guardarPadraoDivulgacao(receita: unknown): Promise<R> {
    try {
        const sessao = await requireAuth()
        if (!(await podeFazerAgenda(sessao))) return { ok: false, error: 'Só a Mídia e a administração.' }
        const r = normalizarReceita(receita)
        const padrao = { estilo: r.estilo, paleta: r.paleta, redes: r.redes, fundo: r.fundo, tinta: r.tinta, modeloRedes: r.modeloRedes }
        await prisma.tenant.update({ where: { id: sessao.tenantId }, data: { divulgacao_padrao: padrao } })
        revalidatePath('/midia/divulgacao')
        return { ok: true }
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Não foi possível guardar o padrão.' }
    }
}
