// lib/inicio-app.ts
// O resto do Inicio (alem das escalas): termos por assinar, aniversariantes do
// mes e os cultos da semana. Recebem a sessao ja verificada.

import { getTenantClient } from '@/lib/prisma'
import type { SessionData } from '@/lib/auth-utils'
import { lerArea, type PontoArea } from '@/lib/area-grupo'
import { agoraLisboa } from '@/lib/alertas-encontros'
import { normalizarReceita, semDestaque } from '@/lib/divulgacao-kit'

/** O membro tem de aceitar (ou renovar) os termos de protecao de dados. */
export async function termosPorAssinar(sessao: SessionData): Promise<boolean> {
    const db = getTenantClient(sessao.tenantId)
    const m = await db.membro.findUnique({ where: { id: sessao.membroId }, select: { gdpr_aceite: true, gdpr_validade: true } })
    if (!m) return false
    return !m.gdpr_aceite || (!!m.gdpr_validade && m.gdpr_validade < new Date())
}

export interface Aniversariante {
    id: number
    nome: string
    avatar: string | null
    dia: number
    hoje: boolean
}

/** Quem faz anos este mes (membros ativos), pelo dia. */
export async function aniversariantesDoMes(sessao: SessionData): Promise<Aniversariante[]> {
    const db = getTenantClient(sessao.tenantId)
    const hoje = new Date()
    const membros = await db.membro.findMany({
        where: { is_active: true, birthdate: { not: null } },
        select: { id: true, first_name: true, last_name: true, avatar_file: true, birthdate: true },
    })
    return membros
        .filter((m) => m.birthdate!.getUTCMonth() === hoje.getMonth())
        .map((m) => ({
            id: m.id,
            nome: `${m.first_name} ${m.last_name}`.trim(),
            avatar: m.avatar_file,
            dia: m.birthdate!.getUTCDate(),
            hoje: m.birthdate!.getUTCDate() === hoje.getDate(),
        }))
        // Primeiro quem faz anos de hoje em diante, depois os que ja passaram
        .sort((a, b) => {
            const d = hoje.getDate()
            const ja = (x: Aniversariante) => (x.dia < d ? 1 : 0)
            return ja(a) - ja(b) || a.dia - b.dia
        })
}

export interface CultoDaSemana {
    id: number
    nome: string
    data: string
    /** culto direcionado a um grupo (ex.: culto de quarta dos Homens) */
    direcionado?: { nome: string; meu: boolean }
}

/** Cultos e eventos dos proximos 7 dias. */
export async function cultosDaSemana(sessao: SessionData): Promise<CultoDaSemana[]> {
    const db = getTenantClient(sessao.tenantId)
    const inicio = new Date(); inicio.setHours(0, 0, 0, 0)
    const eventos = await db.evento.findMany({
        where: { data: { gte: inicio, lt: new Date(inicio.getTime() + 7 * 86400000) } },
        select: { id: true, nome: true, data: true, grupo: { select: { nome: true, membros: { where: { id: sessao.membroId }, select: { id: true } }, lideres: { where: { id: sessao.membroId }, select: { id: true } } } } },
        orderBy: { data: 'asc' },
        take: 8,
    })
    return eventos.map((e) => ({
        id: e.id, nome: e.nome, data: e.data.toISOString(),
        ...(e.grupo ? { direcionado: { nome: e.grupo.nome, meu: e.grupo.membros.length + e.grupo.lideres.length > 0 } } : {}),
    }))
}

/** O próximo culto (nos 7 dias seguintes) com artes publicadas para partilhar: o cartão "Ajuda a divulgar". */
export async function divulgacaoDaSemana(sessao: SessionData): Promise<{ nome: string; data: string } | null> {
    const db = getTenantClient(sessao.tenantId)
    const hoje = new Date(agoraLisboa().toISOString().slice(0, 10) + 'T00:00:00Z')
    const kit = await db.kitDivulgacao.findFirst({
        where: { publicado_em: { not: null }, evento: { data: { gte: hoje, lt: new Date(hoje.getTime() + 8 * 86400000) } } },
        orderBy: { evento: { data: 'asc' } },
        select: { receita: true, evento: { select: { nome: true, data: true } } },
    })
    return kit ? { nome: semDestaque(normalizarReceita(kit.receita).titulo) || kit.evento.nome, data: kit.evento.data.toISOString() } : null
}

export interface MeuGrupo {
    id: number
    nome: string
    quando: string
    morada: string
    mapa: string | null
    lideres: string[]
    souLider: boolean
    latitude: number | null
    longitude: number | null
    area: PontoArea[] | null
    /** O próximo encontro marcado na agenda do grupo (ISO; hora de Lisboa escrita em UTC) */
    proximo?: string | null
    /** Imagem (ícone) do grupo ou do departamento de apoio */
    foto?: string | null
    /** Grupo de apoio (departamento sem escala): abre o módulo ou a lista de pessoas */
    apoio?: { href: string; texto: string }
}

/** Para onde abre um grupo de apoio (pelo nome; os módulos decidem por ele). */
function destinoDoApoio(id: number, nome: string) {
    const n = nome.toLowerCase()
    if (n.includes('acolhimento') || n.includes('integra')) return { href: '/departamentos/acolhimento/dashboard', texto: 'Abrir o Acolhimento' }
    if (n.includes('cantina')) return { href: '/cantina', texto: 'Abrir a Cantina' }
    if (n.includes('social') || n.includes('assist')) return { href: '/assistencia', texto: 'Abrir a Assistência social' }
    return { href: `/membros/gestao/equipa/${id}`, texto: 'Ver as pessoas' }
}

/** Grupos em que participo ou que lidero, com quando e onde se juntam. */
export async function meusGrupos(sessao: SessionData): Promise<MeuGrupo[]> {
    const db = getTenantClient(sessao.tenantId)
    const eu = { some: { id: sessao.membroId } }
    const grupos = await db.grupo.findMany({
        where: { OR: [{ membros: eu }, { lideres: eu }] },
        select: {
            id: true, nome: true, dia_semana: true, horario: true, endereco: true, numero: true,
            bairro: true, cidade: true, latitude: true, longitude: true, area: true, mostrar_mapa: true, foto_url: true,
            lideres: { select: { id: true, first_name: true, last_name: true } },
        },
        orderBy: { nome: 'asc' },
    })
    // Grupos de apoio em que estou (ou que lidero)
    const apoio = await db.departamento.findMany({
        where: { tem_escala: false, OR: [{ lider_id: sessao.membroId }, { integrantes: { some: { membro_id: sessao.membroId } } }] },
        select: { id: true, nome: true, lider_id: true, foto_url: true, lider: { select: { first_name: true, last_name: true } } },
        orderBy: { nome: 'asc' },
    })
    const deApoio: MeuGrupo[] = apoio.map((d) => ({
        id: -d.id, nome: d.nome, quando: '', morada: '', mapa: null,
        lideres: d.lider ? [`${d.lider.first_name} ${d.lider.last_name}`.trim()] : [],
        souLider: d.lider_id === sessao.membroId, latitude: null, longitude: null, area: null,
        apoio: destinoDoApoio(d.id, d.nome), foto: d.foto_url,
    }))
    // O próximo encontro de cada grupo (da agenda do grupo), numa só consulta
    const agora = new Date(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'medium' }).format(new Date()).replace(' ', 'T') + 'Z')
    const encontros = grupos.length === 0 ? [] : await db.agendaDepartamento.findMany({
        where: { grupo_id: { in: grupos.map((g) => g.id) }, inicio: { gte: agora }, cancelado_em: null },
        orderBy: { inicio: 'asc' }, select: { grupo_id: true, inicio: true },
    })
    const proximoDe = new Map<number, string>()
    for (const e of encontros) if (e.grupo_id && !proximoDe.has(e.grupo_id)) proximoDe.set(e.grupo_id, e.inicio.toISOString())
    return [...grupos.map((g) => {
        const morada = [[g.endereco, g.numero].filter(Boolean).join(', '), g.bairro, g.cidade]
            .map((p) => p?.trim()).filter(Boolean).join(' · ')
        const destino = g.latitude != null && g.longitude != null ? `${g.latitude},${g.longitude}` : morada
        return {
            id: g.id,
            nome: g.nome,
            proximo: proximoDe.get(g.id) ?? null,
            quando: [g.dia_semana, g.horario].map((p) => p?.trim()).filter(Boolean).join(', às '),
            morada,
            mapa: destino ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}` : null,
            lideres: g.lideres.map((l) => `${l.first_name} ${l.last_name}`.trim()),
            souLider: g.lideres.some((l) => l.id === sessao.membroId),
            // O mapa so aparece nos grupos em que o admin o ligou
            latitude: g.mostrar_mapa ? g.latitude : null,
            longitude: g.mostrar_mapa ? g.longitude : null,
            area: g.mostrar_mapa ? lerArea(g.area) : null,
            foto: g.foto_url,
        }
    }), ...deApoio]
}
