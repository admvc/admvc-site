// "Receber o culto do portal" (módulo do Holyrics): o que o portal sabe de um culto — músicas do repertório, artes do telão
// publicadas (cada uma com a secção da lista do Holyrics onde entra), escala por equipa e rotina — para o módulo montar a
// lista de mídia, a de letras e o texto da escala. Sem login, só com a chave do Holyrics (ver /api/public/holyrics/culto).
import prisma from '@/lib/prisma'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { lerPublicado } from '@/lib/divulgacao-publicacao'
import { horasPrevistas, minutosPorExtenso, normalizarItens, responsavel, type MembroRotina } from '@/lib/rotina-culto'

/** A secção (título colorido da lista do Holyrics) onde cada arte do telão entra. */
export const SECAO_DA_PECA: Record<string, string> = {
    oracao: 'ABERTURA', 'boas-vindas': 'ABERTURA', 'oracao-dirigida': 'ORACOES', oferta: 'OFERTORIO', palavra: 'MENSAGEM', neutro: 'ENCERRAMENTO',
}

export type CultoDoApp = { id: number; data: string; nome: string; musicas: number; artes: number }
export type CultoCompleto = {
    culto: { id: number; nome: string; data: string }
    musicas: { titulo: string; artista: string; holyricsId: string; tom: string }[]
    artes: { nome: string; ficheiro: string; url: string; secao: string }[]
    escala: string[]
    rotina: string[]
}

const nomeCompleto = (m: { first_name: string; last_name: string | null }) => [m.first_name, m.last_name].filter(Boolean).join(' ')

/** Os cultos de hoje até daqui a `dias` dias (hora de Lisboa "escrita" em UTC), com o que cada um já tem. */
export async function cultosDoApp(tenantId: number, dias = 14): Promise<CultoDoApp[]> {
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const eventos = await prisma.evento.findMany({
        where: { tenant_id: tenantId, data: { gte: hoje, lt: new Date(hoje.getTime() + (dias + 1) * 86400000) } },
        orderBy: { data: 'asc' },
        take: 40,
        select: { id: true, nome: true, data: true, kitDivulgacao: { select: { publicado: true } }, _count: { select: { repertorio: true } } },
    })
    return eventos.map((e) => ({
        id: e.id, nome: e.nome, data: e.data.toISOString(), musicas: e._count.repertorio,
        artes: (lerPublicado(e.kitDivulgacao?.publicado)?.itens ?? []).filter((i) => i.tipo === 'telao').length,
    }))
}

export async function cultoCompleto(tenantId: number, eventoId: number): Promise<CultoCompleto | null> {
    const e = await prisma.evento.findFirst({
        where: { id: eventoId, tenant_id: tenantId },
        select: {
            id: true, nome: true, data: true,
            repertorio: { orderBy: { ordem: 'asc' }, select: { tom_tocado: true, musica: { select: { titulo: true, artista: true, tom: true, holyrics_id: true } } } },
            kitDivulgacao: { select: { publicado: true } },
            rotina: { select: { itens: true } },
            escalas: {
                where: { motivo_recusa: null },
                select: { funcao: true, confirmado: true, departamento: { select: { nome: true } }, membro: { select: { first_name: true, last_name: true } } },
            },
        },
    })
    if (!e) return null
    const data = e.data.toISOString()

    const telao = (lerPublicado(e.kitDivulgacao?.publicado)?.itens ?? []).filter((i) => i.tipo === 'telao')
    const artes = telao.map((a, n) => ({ nome: a.nome, ficheiro: `${String(n + 1).padStart(2, '0')}-${a.id}.png`, url: a.url, secao: SECAO_DA_PECA[a.id] ?? 'AVISOS' }))

    // escala: uma linha por equipa ("Louvor: Vocalista Fulano · Baterista Sicrano")
    const porEquipa = new Map<string, string[]>()
    for (const s of e.escalas) {
        const lista = porEquipa.get(s.departamento.nome) ?? []
        lista.push(`${s.funcao} ${nomeCompleto(s.membro)}${s.confirmado ? '' : ' (por confirmar)'}`)
        porEquipa.set(s.departamento.nome, lista)
    }
    const escala = [...porEquipa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt')).map(([equipa, pessoas]) => `${equipa}: ${pessoas.join(' · ')}`)

    // rotina: "19:00 Louvor (20 min) — Pastor Fulano"
    const itens = e.rotina ? normalizarItens(e.rotina.itens) : []
    const ids = [...new Set(itens.map((i) => i.membro_id).filter((x): x is number => !!x))]
    const membros = new Map<number, MembroRotina>()
    if (ids.length) {
        const lista = await prisma.membro.findMany({
            where: { tenant_id: tenantId, id: { in: ids } },
            select: { id: true, first_name: true, last_name: true, church_role: true, gender: true, cargos: { select: { nome: true } } },
        })
        for (const m of lista) membros.set(m.id, m)
    }
    const horas = horasPrevistas(data, itens)
    const rotina = itens.map((it, i) => {
        const quem = responsavel(it, membros)
        return `${horas[i] ? `${horas[i]} ` : ''}${it.momento}${it.duracao ? ` (${minutosPorExtenso(it.duracao)})` : ''}${quem ? ` — ${quem}` : ''}${it.nota ? ` — ${it.nota}` : ''}${it.texto ? ` (${it.texto})` : ''}`
    })

    return {
        culto: { id: e.id, nome: e.nome, data },
        musicas: e.repertorio.map((r) => ({ titulo: r.musica.titulo, artista: r.musica.artista ?? '', holyricsId: r.musica.holyrics_id ?? '', tom: r.tom_tocado || r.musica.tom || '' })),
        artes, escala, rotina,
    }
}
