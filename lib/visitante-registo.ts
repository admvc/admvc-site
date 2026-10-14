// Registo de visitantes: a mesma pessoa (mesmo telefone) a voltar soma uma visita
// ao registo que já existe, em vez de criar outro. Usado pelo formulário público
// (/api/public/visitante: site e /boasvindas) e pelo botão "Registar visitante".

import type { PrismaClient } from '@prisma/client'

export const ESTADOS_SAIDA = ['NAO_RETORNOU', 'OUTRA_IGREJA', 'DESISTIU']
export const ORIGENS_MANUAIS = ['PRESENCIAL', 'INDICACAO', 'REDES_SOCIAIS'] as const

/** Dois envios seguidos (duplo clique, recarregar) não contam como outra visita. */
const JANELA_REENVIO_MS = 10 * 60 * 1000

/** Só os dígitos, sem o 00 internacional à frente. */
export function digitosTelefone(t: string | null | undefined): string {
    return (t ?? '').replace(/\D/g, '').replace(/^00/, '')
}

/** 9 a 15 dígitos (PT, BR e internacionais), como o formulário público já exigia. */
export function telefoneValido(t: string): boolean {
    return /^\d{9,15}$/.test(t.replace(/[\s\-().+]/g, ''))
}

/**
 * Mesmo número com ou sem indicativo: compara os últimos 9 dígitos
 * ("+351 912 345 678" = "912345678"). Números curtos ou vazios nunca coincidem.
 */
export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
    const da = digitosTelefone(a), db = digitosTelefone(b)
    if (da.length < 9 || db.length < 9) return false
    return da.slice(-9) === db.slice(-9)
}

/** Junta um pedido novo aos anteriores (com a data), sem repetir o mesmo texto. */
export function juntarPedidos(antigo: string | null, novo: string | null | undefined, data: Date): string | null {
    const n = novo?.trim()
    if (!n) return antigo
    if (!antigo?.trim()) return n
    if (antigo.includes(n)) return antigo
    const dia = data.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Lisbon' })
    return `${antigo}\n\n— ${dia} —\n${n}`
}

type Cliente = Pick<PrismaClient, 'visitante' | 'acompanhamentoVisitante'>

export interface DadosVisita {
    tenantId: number
    nome: string
    telefone: string
    email?: string | null
    pedido?: string | null
    origem?: string | null
    /** Onde esteve (QR da congregação ou escolhida pela equipa) */
    congregacao?: { id: number; nome: string } | null
}

export interface ResultadoVisita {
    id: number
    nome: string
    /** true = registo novo; false = já existia e somou-se a visita */
    novo: boolean
    visitas: number
    /** Estava em "saídas" e voltou à fila de novos */
    reativado: boolean
    /** Reenvio em poucos minutos: não contou outra visita */
    repetido: boolean
}

/**
 * Cria o visitante ou soma a visita ao que já existe com o mesmo telefone.
 * A visita fica no histórico: com `autorId` (registo da equipa) ou sem autor
 * (formulário público: site ou QR).
 */
export async function registarVisita(db: Cliente, dados: DadosVisita, autorId?: number, agora = new Date()): Promise<ResultadoVisita> {
    const candidatos = await db.visitante.findMany({
        where: { tenant_id: dados.tenantId, telefone: { not: '' } },
        select: { id: true, telefone: true, data_ultima_visita: true },
        orderBy: { data_ultima_visita: 'desc' },
    })
    const existente = candidatos.find(c => mesmoTelefone(c.telefone, dados.telefone))
    const como = autorId ? 'registada pela equipa' : 'pelo formulário'
    const onde = dados.congregacao ? ` · ${dados.congregacao.nome}` : ''
    const evento = (visitante_id: number, extra: { tipo_evento: string; observacoes: string; status_anterior?: string; status_novo?: string }) =>
        db.acompanhamentoVisitante.create({
            data: { tenant_id: dados.tenantId, visitante_id, membro_id: autorId ?? null, tipo_contacto: 'PRESENCIAL', ...extra },
        })

    if (!existente) {
        const v = await db.visitante.create({
            data: {
                tenant_id: dados.tenantId,
                nome: dados.nome,
                telefone: dados.telefone,
                email: dados.email || null,
                pedido_oracao: dados.pedido?.trim() || null,
                origem: dados.origem || null,
                congregacao_id: dados.congregacao?.id ?? null,
                consentimento_em: agora,
            },
        })
        await evento(v.id, { tipo_evento: 'NOVA_VISITA', observacoes: `1.ª visita (${como})${onde}` })
        return { id: v.id, nome: v.nome, novo: true, visitas: 1, reativado: false, repetido: false }
    }

    const atual = await db.visitante.findUniqueOrThrow({ where: { id: existente.id } })
    const repetido = agora.getTime() - new Date(atual.data_ultima_visita).getTime() < JANELA_REENVIO_MS
    const reativado = ESTADOS_SAIDA.includes(atual.status)
    const visitas = repetido ? atual.quantidade_visitas : atual.quantidade_visitas + 1

    await db.visitante.update({
        where: { id: atual.id },
        data: {
            quantidade_visitas: visitas,
            data_ultima_visita: agora,
            consentimento_em: agora,
            pedido_oracao: juntarPedidos(atual.pedido_oracao, dados.pedido, agora),
            ...(dados.email && !atual.email ? { email: dados.email } : {}),
            ...(reativado ? { status: 'NOVO' } : {}),
            // A congregação passa a ser a da visita mais recente
            ...(dados.congregacao ? { congregacao_id: dados.congregacao.id } : {}),
        },
    })

    if (!repetido) {
        await evento(atual.id, { tipo_evento: 'NOVA_VISITA', observacoes: `Voltou: ${visitas}.ª visita (${como})${onde}` })
    }
    if (reativado) {
        await evento(atual.id, {
            tipo_evento: 'MUDANCA_STATUS', status_anterior: atual.status, status_novo: 'NOVO',
            observacoes: 'Voltou: regressou aos novos registos',
        })
    }

    return { id: atual.id, nome: atual.nome, novo: false, visitas, reativado, repetido }
}
