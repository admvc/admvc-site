// Pregações: o histórico (a "Palavra" de cada rotina + os esboços escritos) e
// quem pode ver e alterar cada esboço.
import { getTenantClient } from '@/lib/prisma'
import { podeGerirSermoes } from '@/lib/cursos-permissoes'
import {
    chaveDeComparacao, ePalavra, normalizarItens, responsavel,
    type ItemRotina, type MembroRotina, type PregacaoFeita,
} from '@/lib/rotina-culto'

type Sessao = { membroId: number; role: string; tenantId: number; congregacaoId?: number }

const CAMPOS_MEMBRO = { id: true, first_name: true, last_name: true, church_role: true, gender: true, cargos: { select: { nome: true } } } as const

/** Altera o esboço: quem gere as pregações, ou o próprio pregador. */
export async function podeEditarSermao(sessao: Sessao, sermao: { pregador_id: number }): Promise<boolean> {
    if (sermao.pregador_id === sessao.membroId) return true
    return podeGerirSermoes(sessao.membroId, sessao.role)
}

/** Lê o esboço: publicado (todos), ou quem o pode alterar. */
export async function podeLerSermao(sessao: Sessao, sermao: { pregador_id: number; publicado: boolean }): Promise<boolean> {
    return sermao.publicado || podeEditarSermao(sessao, sermao)
}

export type Pregacao = PregacaoFeita & {
    eventoId: number | null
    pregadorId: number | null
    congregacao: string | null
    futura: boolean
    esboco: { id: string; publicado: boolean; meu: boolean } | null
}

/**
 * Todas as pregações: a "Palavra" de cada rotina (passadas e marcadas) e os
 * esboços sem rotina. Os esboços por publicar só aparecem a quem os pode alterar.
 */
export async function historicoDePregacoes(sessao: Sessao): Promise<Pregacao[]> {
    const db = getTenantClient(sessao.tenantId)
    const [rotinas, sermoes, gere] = await Promise.all([
        db.rotinaCulto.findMany({
            select: {
                itens: true,
                evento: { select: { id: true, nome: true, data: true, congregacao: { select: { nome: true } } } },
            },
        }),
        db.sermao.findMany({
            select: {
                id: true, titulo: true, publicado: true, data_pregacao: true, pregador_id: true, evento_id: true,
                referencias_biblicas: true,
                evento: { select: { nome: true, congregacao: { select: { nome: true } } } },
            },
        }),
        podeGerirSermoes(sessao.membroId, sessao.role),
    ])

    // A Palavra de cada rotina
    const palavras: { evento: (typeof rotinas)[number]['evento']; item: ItemRotina }[] = []
    for (const r of rotinas) {
        for (const item of normalizarItens(r.itens)) if (ePalavra(item.momento)) palavras.push({ evento: r.evento, item })
    }
    const ids = new Set<number>([
        ...palavras.map((p) => p.item.membro_id).filter((x): x is number => !!x),
        ...sermoes.map((s) => s.pregador_id),
    ])
    const membros = ids.size
        ? await db.membro.findMany({ where: { id: { in: [...ids] } }, select: CAMPOS_MEMBRO })
        : []
    const mapa = new Map<number, MembroRotina>(membros.map((m) => [m.id, m]))

    const visivel = (s: (typeof sermoes)[number]) => s.publicado || gere || s.pregador_id === sessao.membroId
    const esbocoDe = (s: (typeof sermoes)[number]) => ({ id: s.id, publicado: s.publicado, meu: s.pregador_id === sessao.membroId })
    const agora = Date.now()
    const usados = new Set<string>()
    const lista: Pregacao[] = []

    for (const { evento, item } of palavras) {
        const s = sermoes.find((x) => x.evento_id === evento.id && (!item.membro_id || x.pregador_id === item.membro_id))
        if (s) usados.add(s.id)
        lista.push({
            data: evento.data.toISOString(),
            culto: evento.nome,
            congregacao: evento.congregacao?.nome ?? null,
            quem: responsavel(item, mapa),
            pregadorId: item.membro_id ?? null,
            tema: item.nota ?? null,
            texto: item.texto ?? null,
            eventoId: evento.id,
            futura: evento.data.getTime() > agora,
            esboco: s && visivel(s) ? esbocoDe(s) : null,
        })
    }
    // Esboços sem rotina (ex.: escritos antes, ou de um culto sem rotina)
    for (const s of sermoes) {
        if (usados.has(s.id) || !visivel(s)) continue
        const refs = Array.isArray(s.referencias_biblicas) ? (s.referencias_biblicas as { livro?: string; capitulo?: number; versiculo_inicio?: number; versiculo_fim?: number }[]) : []
        lista.push({
            data: s.data_pregacao.toISOString(),
            culto: s.evento?.nome ?? 'Esboço',
            congregacao: s.evento?.congregacao?.nome ?? null,
            quem: responsavel({ momento: '', membro_id: s.pregador_id }, mapa),
            pregadorId: s.pregador_id,
            tema: s.titulo,
            texto: refs.map(formatarReferencia).filter(Boolean).join('; ') || null,
            eventoId: s.evento_id,
            futura: s.data_pregacao.getTime() > agora,
            esboco: esbocoDe(s),
        })
    }
    return lista.sort((a, b) => b.data.localeCompare(a.data))
}

export function formatarReferencia(r: { livro?: string; capitulo?: number; versiculo_inicio?: number; versiculo_fim?: number | null }): string {
    if (!r?.livro) return ''
    if (!r.capitulo) return r.livro
    return `${r.livro} ${r.capitulo}${r.versiculo_inicio ? `:${r.versiculo_inicio}` : ''}${r.versiculo_fim ? `-${r.versiculo_fim}` : ''}`
}

/** Filtra o histórico por pregador e por texto (tema, texto bíblico, culto, pregador). */
export function filtrarPregacoes(lista: Pregacao[], filtros: { pregador?: number; q?: string }): Pregacao[] {
    const q = chaveDeComparacao(filtros.q)
    return lista.filter((p) =>
        (!filtros.pregador || p.pregadorId === filtros.pregador)
        && (!q || chaveDeComparacao([p.tema, p.texto, p.culto, p.quem].filter(Boolean).join(' ')).includes(q)))
}

/** As pregações dos últimos 12 meses, sem a deste culto (para o aviso de repetição). */
export async function pregacoesRecentes(sessao: Sessao, excluirEventoId: number): Promise<PregacaoFeita[]> {
    const desde = Date.now() - 365 * 86400000
    return (await historicoDePregacoes(sessao))
        .filter((p) => p.eventoId !== excluirEventoId && new Date(p.data).getTime() >= desde && (p.tema || p.texto))
        .map(({ data, culto, quem, tema, texto }) => ({ data, culto, quem, tema, texto }))
}
