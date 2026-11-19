'use server'

// Procura de preletores para as artes. Só a Mídia e a administração (a mesma regra da página da Divulgação).
// Devolve só o nome e o título: nada de contactos nem ids.
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { procurarMembros, type SugestaoPreletor } from '@/lib/preletor'
import { ErroYoutube } from '@/lib/youtube'
import { lerEstadoCapa } from '@/lib/youtube-capa-dados'
import { aplicarLive, ultimosRegistos, verLive, type RespostaVer, type ResultadoAplicar } from '@/lib/youtube-live'

export async function procurarPreletor(texto: string): Promise<SugestaoPreletor[]> {
    if (typeof texto !== 'string') return []
    const q = texto.trim().slice(0, 60)
    if (q.length < 2) return []
    const sessao = await getSessionData()
    if (!sessao || !(await podeFazerAgenda(sessao))) return []
    const membros = await getTenantClient(sessao.tenantId).membro.findMany({
        where: { is_active: true, status: { notIn: ['INATIVO', 'ARQUIVADO'] } },
        select: { first_name: true, last_name: true, church_role: true, cargos: { select: { nome: true } } },
        take: 5000,
    })
    return procurarMembros(membros, q, 8)
}

// ---- Capa na live do YouTube (Mídia e administração) ---------------------------------------------------------------------
type Erro = { erro: string }

async function sessaoDaMidia() {
    const sessao = await getSessionData()
    return sessao && (await podeFazerAgenda(sessao)) ? sessao : null
}

/** A live do culto, as lives do canal ligadas aos cultos e os últimos registos. Nunca lança: devolve { erro } em português. */
export async function verLiveYoutube(eventoId: number): Promise<{ ver: RespostaVer; registos: Awaited<ReturnType<typeof ultimosRegistos>> } | Erro> {
    const sessao = await sessaoDaMidia()
    if (!sessao) return { erro: 'Só a Mídia e a administração.' }
    if (!Number.isInteger(eventoId) || eventoId <= 0) return { erro: 'Culto inválido.' }
    try {
        return { ver: await verLive(sessao.tenantId, eventoId), registos: await ultimosRegistos(sessao.tenantId, eventoId) }
    } catch (e) {
        return { erro: e instanceof ErroYoutube ? e.message : 'Não foi possível ver a live agora.' }
    }
}

/** Troca a capa e o título da live do culto para o estado escolhido e regista quem o fez. */
export async function aplicarLiveYoutube(eventoId: number, estado: string): Promise<{ ok: ResultadoAplicar; registos: Awaited<ReturnType<typeof ultimosRegistos>> } | Erro> {
    const sessao = await sessaoDaMidia()
    if (!sessao) return { erro: 'Só a Mídia e a administração.' }
    const e = lerEstadoCapa(estado)
    if (!Number.isInteger(eventoId) || eventoId <= 0 || !e) return { erro: 'Pedido inválido.' }
    const membro = await getTenantClient(sessao.tenantId).membro.findFirst({ where: { id: sessao.membroId }, select: { first_name: true, last_name: true } })
    const por = membro ? `${membro.first_name} ${membro.last_name ?? ''}`.trim() : null
    try {
        const ok = await aplicarLive(sessao.tenantId, eventoId, e, { origem: 'portal', por })
        return { ok, registos: await ultimosRegistos(sessao.tenantId, eventoId) }
    } catch (err) {
        return { erro: err instanceof ErroYoutube ? err.message : 'Não foi possível aplicar a capa agora.' }
    }
}
