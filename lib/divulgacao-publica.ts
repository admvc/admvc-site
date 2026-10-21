// Os cultos com artes PUBLICADAS (ver lib/divulgacao-publicacao.ts), para a página aberta /divulgar, o cartão do Início e o
// Holyrics. Sem login: só sai o que a Mídia publicou (redes para toda a gente; telão só para o Holyrics) e o nome do culto.
import prisma from '@/lib/prisma'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { normalizarReceita } from '@/lib/divulgacao-kit'
import { lerPublicado, type ItemPublicado } from '@/lib/divulgacao-publicacao'

export type CultoPublicado = {
    id: number
    nome: string                       // título das artes (o da receita ou o nome do culto)
    data: string                       // ISO, Lisboa "escrita" em UTC
    artes: ItemPublicado[]             // as das redes (post, story, capa)
    telao: ItemPublicado[]             // as do telão (só o Holyrics as pede)
    textos: { legenda: string; whatsapp: string }
}

/** A igreja da página aberta: a primeira ativa (como /api/public/eventos). */
export async function tenantPublico(): Promise<number | null> {
    const t = await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { id: true } })
    return t?.id ?? null
}

/** Cultos de hoje até daqui a `dias` dias com artes publicadas, por ordem de data. */
export async function cultosPublicados(tenantId: number, dias = 14, soEvento?: number): Promise<CultoPublicado[]> {
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const kits = await prisma.kitDivulgacao.findMany({
        where: {
            tenant_id: tenantId, publicado_em: { not: null },
            ...(soEvento ? { evento_id: soEvento } : {}),
            // pedido por id (Holyrics): sem limite de datas; a lista é que tem a janela de `dias`
            ...(soEvento ? {} : { evento: { data: { gte: hoje, lt: new Date(hoje.getTime() + (dias + 1) * 86400000) } } }),
        },
        select: { publicado: true, receita: true, evento: { select: { id: true, nome: true, data: true } } },
        orderBy: { evento: { data: 'asc' } },
        take: 30,
    })
    const saida: CultoPublicado[] = []
    for (const k of kits) {
        const pub = lerPublicado(k.publicado)
        if (!pub) continue
        saida.push({
            id: k.evento.id,
            nome: normalizarReceita(k.receita).titulo || k.evento.nome,
            data: k.evento.data.toISOString(),
            artes: pub.itens.filter((i) => i.tipo === 'redes'),
            telao: pub.itens.filter((i) => i.tipo === 'telao'),
            textos: pub.textos,
        })
    }
    return saida
}
