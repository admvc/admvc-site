// ENCERRAMENTO do Holyrics: além das artes "neutras" do kit do culto, o "Sincronizar APP" põe aí, por esta ordem fixa,
//   1. a agenda da semana do culto (imagem do telão, desenhada na hora)
//   2. a arte da Assistência Social publicada para este culto (se houver)
//   3. o banner da Cantina publicado para este culto (se houver)
// As duas últimas guardam-se no Blob público e ficam ligadas ao culto na tabela artes_encerramento.
import { del, put } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { URL_BLOB } from '@/lib/divulgacao-publicacao'

export type TipoEncerramento = 'ASSISTENCIA' | 'CANTINA'
export const TIPOS_ENCERRAMENTO: TipoEncerramento[] = ['ASSISTENCIA', 'CANTINA']
export const lerTipo = (v: unknown): TipoEncerramento | null => (v === 'ASSISTENCIA' || v === 'CANTINA' ? v : null)

export const NOME_NO_HOLYRICS: Record<TipoEncerramento, string> = { ASSISTENCIA: 'Assistência Social', CANTINA: 'Cantina' }
export const FICHEIRO_AGENDA = '90-agenda-semana.png'
const FICHEIRO_DO_TIPO: Record<TipoEncerramento, string> = { ASSISTENCIA: '91-assistencia-social.png', CANTINA: '92-cantina.png' }

export const pastaEncerramento = (tenantId: number, eventoId: number) => `divulgacao/${tenantId}/encerramento/${eventoId}/`

export type ArteDoApp = { nome: string; ficheiro: string; url: string; secao: string }
export type ArteGuardada = { tipo: string; url: string }

/**
 * As artes extra do ENCERRAMENTO, na ordem fixa Agenda → Assistência Social → Cantina.
 * `urlAgenda` vem vazio quando não se sabe o endereço do portal (então a agenda não entra).
 * Só entram ligações do nosso Blob público.
 */
export function artesDeEncerramento(urlAgenda: string | null, guardadas: ArteGuardada[]): ArteDoApp[] {
    const lista: ArteDoApp[] = []
    if (urlAgenda) lista.push({ nome: 'Agenda da semana', ficheiro: FICHEIRO_AGENDA, url: urlAgenda, secao: 'ENCERRAMENTO' })
    for (const t of TIPOS_ENCERRAMENTO) {
        const g = guardadas.find((x) => x.tipo === t)
        if (g && URL_BLOB.test(g.url)) lista.push({ nome: NOME_NO_HOLYRICS[t], ficheiro: FICHEIRO_DO_TIPO[t], url: g.url, secao: 'ENCERRAMENTO' })
    }
    return lista
}

/** Endereço da agenda da semana (imagem) para o Holyrics descarregar: leva a chave do próprio módulo. */
export const urlDaAgendaSemana = (origem: string, chave: string, eventoId: number) =>
    `${origem.replace(/\/+$/, '')}/api/public/holyrics/agenda-semana?chave=${encodeURIComponent(chave)}&evento=${eventoId}`

// ---------------------------------------------------------------------------------------------------------------------
// Base de dados e Blob

export async function artesGuardadas(tenantId: number, eventoId: number): Promise<ArteGuardada[]> {
    return prisma.arteEncerramento.findMany({ where: { tenant_id: tenantId, evento_id: eventoId }, select: { tipo: true, url: true } })
}

/** Os cultos dos próximos `dias` dias (para escolher onde publicar), com a arte deste tipo se já houver. */
export async function cultosParaPublicar(tenantId: number, tipo: TipoEncerramento, dias = 21) {
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const eventos = await prisma.evento.findMany({
        where: { tenant_id: tenantId, data: { gte: hoje, lt: new Date(hoje.getTime() + (dias + 1) * 86400000) } },
        orderBy: { data: 'asc' },
        take: 40,
        select: { id: true, nome: true, data: true },
    })
    const guardadas = eventos.length
        ? await prisma.arteEncerramento.findMany({ where: { tenant_id: tenantId, tipo, evento_id: { in: eventos.map((e) => e.id) } }, select: { evento_id: true, url: true } })
        : []
    const porEvento = new Map(guardadas.map((g) => [g.evento_id, g.url]))
    return eventos.map((e) => ({ id: e.id, nome: e.nome, data: e.data.toISOString(), publicada: porEvento.get(e.id) ?? null }))
}

export type ResultadoPublicar = { ok: true; url: string } | { ok: false; erro: string }

/** Guarda a imagem no Blob e liga-a ao culto (troca a anterior do mesmo tipo). O culto tem de ser da igreja e de hoje em diante. */
export async function publicarNoCulto(o: { tenantId: number; membroId: number; eventoId: number; tipo: TipoEncerramento; nome: string; png: Buffer }): Promise<ResultadoPublicar> {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return { ok: false, erro: 'Armazenamento de imagens por configurar.' }
    if (!Number.isInteger(o.eventoId) || o.eventoId <= 0) return { ok: false, erro: 'Escolha o culto.' }
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const evento = await prisma.evento.findFirst({ where: { id: o.eventoId, tenant_id: o.tenantId, data: { gte: hoje } }, select: { id: true } })
    if (!evento) return { ok: false, erro: 'Esse culto não existe ou já passou.' }

    const anterior = await prisma.arteEncerramento.findUnique({ where: { evento_id_tipo: { evento_id: o.eventoId, tipo: o.tipo } }, select: { url: true, tenant_id: true } })
    if (anterior && anterior.tenant_id !== o.tenantId) return { ok: false, erro: 'Esse culto não existe ou já passou.' }
    const blob = await put(`${pastaEncerramento(o.tenantId, o.eventoId)}${o.tipo.toLowerCase()}-${Date.now()}.png`, o.png, {
        access: 'public', contentType: 'image/png', addRandomSuffix: false,
    })
    await prisma.arteEncerramento.upsert({
        where: { evento_id_tipo: { evento_id: o.eventoId, tipo: o.tipo } },
        create: { tenant_id: o.tenantId, evento_id: o.eventoId, tipo: o.tipo, nome: o.nome.slice(0, 120), url: blob.url, criado_por: o.membroId },
        update: { nome: o.nome.slice(0, 120), url: blob.url, criado_por: o.membroId },
    })
    if (anterior && URL_BLOB.test(anterior.url) && anterior.url !== blob.url) await del(anterior.url).catch(() => undefined)
    return { ok: true, url: blob.url }
}

/** Tira a arte deste tipo do culto (apaga também o ficheiro). */
export async function retirarDoCulto(tenantId: number, eventoId: number, tipo: TipoEncerramento): Promise<void> {
    const g = await prisma.arteEncerramento.findFirst({ where: { tenant_id: tenantId, evento_id: eventoId, tipo }, select: { id: true, url: true } })
    if (!g) return
    await prisma.arteEncerramento.delete({ where: { id: g.id } })
    if (URL_BLOB.test(g.url)) await del(g.url).catch(() => undefined)
}
