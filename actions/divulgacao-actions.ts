'use server'

// Kit de divulgação de um culto: guardar a "receita" (estilo, paleta, peças e textos). As imagens geram-se na hora.

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { normalizarReceita } from '@/lib/divulgacao-kit'

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
