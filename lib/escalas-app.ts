// lib/escalas-app.ts
// Consultas do ecra de Escalas no telemovel (membro e lider). Recebem a
// sessao ja verificada; tudo passa pelo cliente da igreja (getTenantClient).

import { getTenantClient } from '@/lib/prisma'
import { isAdmin, type SessionData } from '@/lib/auth-utils'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { motivoIndisponivel } from '@/lib/indisponibilidade'

export type EstadoEscala = 'CONFIRMADA' | 'POR_CONFIRMAR' | 'NAO_PODE'

export function estadoDaEscala(e: { confirmado: boolean; motivo_recusa: string | null }): EstadoEscala {
    if (e.confirmado) return 'CONFIRMADA'
    if (e.motivo_recusa) return 'NAO_PODE'
    return 'POR_CONFIRMAR'
}

function inicioDeHoje() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
}

// ── MEMBRO ────────────────────────────────────────────────────────────────────

export interface MinhaEscala {
    id: number
    funcao: string
    estado: EstadoEscala
    motivo: string | null
    evento: { id: number; nome: string; data: string }
    departamento: { id: number; nome: string }
}

/** As minhas proximas escalas (de hoje em diante), por data. */
export async function minhasEscalas(sessao: SessionData, limite = 12): Promise<MinhaEscala[]> {
    const db = getTenantClient(sessao.tenantId)
    const escalas = await db.escala.findMany({
        where: { membro_id: sessao.membroId, evento: { data: { gte: inicioDeHoje() } } },
        include: {
            evento: { select: { id: true, nome: true, data: true } },
            departamento: { select: { id: true, nome: true } },
            funcao_ref: { select: { nome: true } },
        },
        orderBy: { evento: { data: 'asc' } },
        take: limite,
    })
    return escalas.map((e) => ({
        id: e.id,
        funcao: e.funcao_ref?.nome || e.funcao,
        estado: estadoDaEscala(e),
        motivo: e.motivo_recusa,
        evento: { id: e.evento.id, nome: e.evento.nome, data: e.evento.data.toISOString() },
        departamento: e.departamento,
    }))
}

export interface MinhaIndisponibilidade {
    id: number
    texto: string
}

/** As datas em que disse que nao pode (so as que ainda nao passaram). */
export async function minhasIndisponibilidades(sessao: SessionData): Promise<MinhaIndisponibilidade[]> {
    const db = getTenantClient(sessao.tenantId)
    const hoje = inicioDeHoje()
    const lista = await db.indisponibilidadeMembro.findMany({
        where: { membro_id: sessao.membroId },
        orderBy: { data_inicio: 'asc' },
    })
    const DIAS = ['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados']
    const fmt = (d: Date) => d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
    return lista
        .filter((i) => {
            if (i.tipo === 'DATA_ESPECIFICA') return !!i.data_inicio && i.data_inicio >= hoje
            if (i.tipo === 'INTERVALO') return !!i.data_fim && i.data_fim >= hoje
            return true
        })
        .map((i) => ({
            id: i.id,
            texto:
                i.tipo === 'DIA_SEMANA' ? `Todas as ${DIAS[i.dia_semana ?? 0]}` :
                i.tipo === 'INTERVALO' ? `De ${fmt(i.data_inicio!)} a ${fmt(i.data_fim!)}` :
                fmt(i.data_inicio!),
        }))
}

// ── LIDER ─────────────────────────────────────────────────────────────────────

export interface EquipaQueGiro {
    id: number
    nome: string
}

/** Departamentos cujas escalas a pessoa gere. */
export async function equipasQueGiro(sessao: SessionData): Promise<EquipaQueGiro[]> {
    const db = getTenantClient(sessao.tenantId)
    if (isAdmin(sessao.role)) {
        // Admin: so os departamentos que tem funcoes (os que fazem escalas)
        return db.departamento.findMany({
            where: { funcoes: { some: {} } },
            select: { id: true, nome: true },
            orderBy: { nome: 'asc' },
        })
    }
    const candidatos = await db.departamento.findMany({
        where: {
            OR: [
                { lider_id: sessao.membroId },
                { integrantes: { some: { membro_id: sessao.membroId } } },
            ],
        },
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
    })
    const geridos: EquipaQueGiro[] = []
    for (const d of candidatos) {
        if (await podeGerirEscalasDoDepartamento(sessao, d.id)) geridos.push(d)
    }
    return geridos
}

export interface PessoaDaEquipa {
    membroId: number
    nome: string
    avatar: string | null
    funcoes: number[]          // funcoes que sabe fazer
    indisponivel: string | null
    noutraFuncao: string | null // ja escalado neste culto (noutra funcao/departamento)
    ultimaVez: string | null    // ultima vez que serviu nesta equipa
}

export interface MontarEscalaDados {
    evento: { id: number; nome: string; data: string }
    departamento: { id: number; nome: string }
    funcoes: { id: number; nome: string; escalados: { escalaId: number; membroId: number; nome: string; estado: EstadoEscala; motivo: string | null }[] }[]
    equipa: PessoaDaEquipa[]
}

/** Tudo o que o lider precisa para montar a escala de um culto. null se nao encontrar. */
export async function dadosMontarEscala(sessao: SessionData, deptoId: number, eventoId: number): Promise<MontarEscalaDados | null> {
    const db = getTenantClient(sessao.tenantId)
    const [depto, evento] = await Promise.all([
        db.departamento.findUnique({ where: { id: deptoId }, select: { id: true, nome: true } }),
        db.evento.findUnique({ where: { id: eventoId }, select: { id: true, nome: true, data: true } }),
    ])
    if (!depto || !evento) return null

    const [funcoes, escalasDoCulto, integrantes] = await Promise.all([
        db.funcaoDepartamento.findMany({ where: { departamento_id: deptoId }, select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
        db.escala.findMany({
            where: { evento_id: eventoId },
            include: { membro: { select: { first_name: true, last_name: true } }, departamento: { select: { nome: true } }, funcao_ref: { select: { nome: true } } },
        }),
        db.integranteDepartamento.findMany({
            where: { departamento_id: deptoId, membro: { is_active: true } },
            include: {
                membro: { select: { id: true, first_name: true, last_name: true, avatar_file: true } },
                funcoes: { select: { funcao_id: true } },
            },
        }),
    ])

    const ids = integrantes.map((i) => i.membro_id)
    const [indisponibilidades, ultimas] = await Promise.all([
        db.indisponibilidadeMembro.findMany({ where: { membro_id: { in: ids } } }),
        db.escala.findMany({
            where: { membro_id: { in: ids }, departamento_id: deptoId, motivo_recusa: null, evento: { data: { lt: inicioDeHoje() } } },
            select: { membro_id: true, evento: { select: { data: true } } },
            orderBy: { evento: { data: 'desc' } },
            take: 500,
        }),
    ])

    const nome = (m: { first_name: string; last_name: string }) => `${m.first_name} ${m.last_name}`.trim()
    const dataEvento = evento.data

    const equipa: PessoaDaEquipa[] = integrantes.map((i) => {
        const outra = escalasDoCulto.find((e) => e.membro_id === i.membro_id)
        const ult = ultimas.find((u) => u.membro_id === i.membro_id)?.evento.data
        return {
            membroId: i.membro_id,
            nome: nome(i.membro),
            avatar: i.membro.avatar_file,
            funcoes: i.funcoes.map((f) => f.funcao_id),
            indisponivel: motivoIndisponivel(indisponibilidades.filter((x) => x.membro_id === i.membro_id), dataEvento),
            noutraFuncao: outra ? `${outra.funcao_ref?.nome || outra.funcao}${outra.departamento_id !== deptoId ? ` (${outra.departamento.nome})` : ''}` : null,
            ultimaVez: ult ? ult.toISOString() : null,
        }
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))

    return {
        evento: { id: evento.id, nome: evento.nome, data: evento.data.toISOString() },
        departamento: depto,
        funcoes: funcoes.map((f) => ({
            id: f.id,
            nome: f.nome,
            escalados: escalasDoCulto
                .filter((e) => e.departamento_id === deptoId && e.funcao_id === f.id)
                .map((e) => ({ escalaId: e.id, membroId: e.membro_id, nome: nome(e.membro), estado: estadoDaEscala(e), motivo: e.motivo_recusa })),
        })),
        equipa,
    }
}
