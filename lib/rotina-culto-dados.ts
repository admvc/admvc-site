// Rotina dos cultos: quem pode alterar e os dados das páginas (servidor).
import { getTenantClient } from '@/lib/prisma'
import { podeEditarMensagemDoCulto } from '@/lib/obreiros-permissions'
import { normalizarItens, palavraDe, type ItemRotina, type MembroRotina, type PregacaoFeita } from '@/lib/rotina-culto'
import { podeGerirSermoes } from '@/lib/cursos-permissoes'
import { pregacoesRecentes } from '@/lib/pregacoes'

type Sessao = { membroId: number; role: string; tenantId: number; congregacaoId?: number }

const CAMPOS_MEMBRO = { id: true, first_name: true, last_name: true, church_role: true, gender: true, cargos: { select: { nome: true } } } as const

/**
 * Quem altera a rotina: os administradores e os líderes da Diaconia (como a
 * mensagem do culto). O admin de uma congregação só altera as da sua.
 */
export async function podeEditarRotina(sessao: Sessao, congregacaoId: number | null): Promise<boolean> {
    if (sessao.role === 'CONGREGATION_ADMIN' && sessao.congregacaoId && congregacaoId !== sessao.congregacaoId) return false
    return podeEditarMensagemDoCulto(sessao)
}

/** Pode gerir algum modelo (para mostrar o botão "Modelos"). */
export async function podeGerirModelos(sessao: Sessao): Promise<boolean> {
    return podeEditarMensagemDoCulto(sessao)
}

/** As congregações cujos modelos esta pessoa altera (null = todas). */
export function congregacoesDosModelos(sessao: Sessao): number[] | null {
    return sessao.role === 'CONGREGATION_ADMIN' && sessao.congregacaoId ? [sessao.congregacaoId] : null
}

/** Os membros referidos nos itens (para mostrar nomes e títulos). */
export async function membrosDosItens(tenantId: number, itens: ItemRotina[]): Promise<MembroRotina[]> {
    const ids = [...new Set(itens.map((i) => i.membro_id).filter((x): x is number => !!x))]
    if (!ids.length) return []
    return getTenantClient(tenantId).membro.findMany({ where: { id: { in: ids } }, select: CAMPOS_MEMBRO })
}

/** Os membros que se podem escolher como responsáveis. */
export async function membrosParaEscolher(tenantId: number): Promise<MembroRotina[]> {
    return getTenantClient(tenantId).membro.findMany({
        where: { is_active: true, status: { notIn: ['INATIVO', 'ARQUIVADO'] } },
        select: CAMPOS_MEMBRO,
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }],
    })
}

/** Os próximos cultos/eventos (6 semanas), com o estado da rotina. */
export async function proximosCultos(sessao: Sessao) {
    const db = getTenantClient(sessao.tenantId)
    const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0)
    const eventos = await db.evento.findMany({
        where: { data: { gte: hoje, lte: new Date(hoje.getTime() + 42 * 86400000) } },
        orderBy: { data: 'asc' },
        select: {
            id: true, nome: true, data: true, tipo: true,
            congregacao: { select: { id: true, nome: true } },
            rotina: { select: { itens: true } },
        },
    })
    return eventos.map((e) => ({
        id: e.id, nome: e.nome, data: e.data.toISOString(), tipo: e.tipo,
        congregacao: e.congregacao,
        momentos: e.rotina ? normalizarItens(e.rotina.itens).length : 0,
    }))
}

/** Tudo o que a página de um culto precisa. */
export async function dadosDaRotina(sessao: Sessao, eventoId: number) {
    const db = getTenantClient(sessao.tenantId)
    const evento = await db.evento.findUnique({
        where: { id: eventoId },
        select: {
            id: true, nome: true, data: true, tipo: true, congregacao_id: true,
            congregacao: { select: { id: true, nome: true } },
            rotina: { select: { itens: true, atualizado_em: true } },
        },
    })
    if (!evento) return null
    const itens = evento.rotina ? normalizarItens(evento.rotina.itens) : []
    const podeEditar = await podeEditarRotina(sessao, evento.congregacao_id)

    let modelos: { id: number; nome: string; itens: ItemRotina[] }[] = []
    let anterior: { nome: string; data: string; itens: ItemRotina[] } | null = null
    let membros: MembroRotina[]
    let feitas: PregacaoFeita[] = []
    if (podeEditar) {
        feitas = await pregacoesRecentes(sessao, evento.id)
        const [ms, mods, ant] = await Promise.all([
            membrosParaEscolher(sessao.tenantId),
            db.rotinaModelo.findMany({
                where: { OR: [{ congregacao_id: evento.congregacao_id }, { congregacao_id: null }] },
                orderBy: { nome: 'asc' },
            }),
            // A rotina do último culto com o mesmo nome, na mesma congregação
            db.evento.findFirst({
                where: { nome: evento.nome, congregacao_id: evento.congregacao_id, data: { lt: evento.data }, rotina: { isNot: null } },
                orderBy: { data: 'desc' },
                select: { nome: true, data: true, rotina: { select: { itens: true } } },
            }),
        ])
        // Os responsáveis já escolhidos ficam na lista, mesmo que tenham saído
        const extra = await membrosDosItens(sessao.tenantId, itens.filter((i) => i.membro_id && !ms.some((m) => m.id === i.membro_id)))
        membros = [...ms, ...extra]
        modelos = mods.map((m) => ({ id: m.id, nome: m.nome, itens: normalizarItens(m.itens) }))
        if (ant?.rotina) anterior = { nome: ant.nome, data: ant.data.toISOString(), itens: normalizarItens(ant.rotina.itens) }
    } else {
        membros = await membrosDosItens(sessao.tenantId, itens)
    }

    // O esboço da Palavra: quem prega escreve-o; os outros leem-no depois de publicado
    const palavra = palavraDe(itens)
    const pregadorId = palavra?.membro_id ?? null
    const sermao = pregadorId
        ? await db.sermao.findFirst({ where: { evento_id: evento.id, pregador_id: pregadorId }, select: { id: true, publicado: true } })
        : null
    const podeEscreverEsboco = !!pregadorId
        && (pregadorId === sessao.membroId || podeEditar || (await podeGerirSermoes(sessao.membroId, sessao.role)))
    const esboco = sermao && (sermao.publicado || podeEscreverEsboco) ? sermao : null

    return {
        evento: {
            id: evento.id, nome: evento.nome, data: evento.data.toISOString(), tipo: evento.tipo,
            congregacao: evento.congregacao,
        },
        itens,
        atualizadoEm: evento.rotina?.atualizado_em.toISOString() ?? null,
        podeEditar,
        membros,
        modelos,
        anterior,
        feitas,
        esboco,
        podeEscreverEsboco,
    }
}

export type DadosRotina = NonNullable<Awaited<ReturnType<typeof dadosDaRotina>>>
