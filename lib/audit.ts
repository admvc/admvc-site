// lib/audit.ts
// Helper central para registar eventos de auditoria
// Uso: await audit({ ... })

import prisma from '@/lib/prisma'
import { headers } from 'next/headers'
import { getSessionData } from '@/lib/auth-utils'
import { createHash } from 'crypto'

// ── TIPOS ─────────────────────────────────────────────────────────────────────

export type AuditAcao =
    | 'CRIAR'
    | 'EDITAR'
    | 'APAGAR'
    | 'LOGIN'
    | 'LOGIN_FALHOU'
    | 'LOGOUT'
    | 'VINCULAR'
    | 'DESVINCULAR'
    | 'APROVAR'
    | 'REJEITAR'
    | 'EXPORT'
    | 'IMPORTAR'
    | 'VER_PERFIL'
    | 'RESET_SENHA'
    | 'ALTERAR_ROLE'
    | 'ALTERAR_STATUS'
    | 'PUBLICAR'
    | 'UPLOAD'
    | 'CONFIG'
    | 'ASSINAR'
    | 'ARQUIVAR'

export type AuditCategoria =
    | 'MEMBROS'
    | 'FAMILIAS'
    | 'ESCALAS'
    | 'FINANCEIRO'
    | 'ACESSO'
    | 'DOCUMENTOS'
    | 'CANTINA'
    | 'SISTEMA'
    | 'DEPARTAMENTOS'
    | 'GRUPOS'
    | 'INVENTARIO'
    | 'CONFIGURACAO'
    | 'LOUVOR'
    | 'AGENDA'
    | 'VISITANTES'
    | 'MURAL'

export type AuditAlvoTipo =
    | 'MEMBRO'
    | 'FAMILIA'
    | 'ESCALA'
    | 'EVENTO'
    | 'LANCAMENTO'
    | 'CONTRIBUICAO'
    | 'RIFA'
    | 'CARNE'
    | 'SISTEMA'
    | 'DEPARTAMENTO'
    | 'GRUPO'
    | 'ITEM_INVENTARIO'
    | 'AGENDA'
    | 'VISITANTE'
    | 'MUSICA'
    | 'CONFIG'
    | 'AVISO'

interface AuditParams {
    // Contexto (obrigatorio)
    tenant_id: number
    categoria: AuditCategoria
    acao: AuditAcao

    // Quem fez (opcional — se nao passar, tenta ler da sessao)
    actor_id?: number
    actor_nome?: string

    // Sobre quem / o que
    alvo_id?: number
    alvo_nome?: string
    alvo_tipo?: AuditAlvoTipo

    // Detalhes
    descricao?: string
    dados_antes?: Record<string, any>
    dados_apos?: Record<string, any>
}

// ── FUNCAO PRINCIPAL ──────────────────────────────────────────────────────────

export async function audit(params: AuditParams): Promise<void> {
    try {
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')
            || headersList.get('x-real-ip')
            || 'desconhecido'
        const userAgent = headersList.get('user-agent') || null

        // Tenta preencher actor se nao for passado
        let actorId = params.actor_id
        let actorNome = params.actor_nome

        if (!actorId) {
            try {
                const session = await getSessionData()
                if (session) {
                    actorId = session.membroId
                }
            } catch {
                // Pode nao ter sessao (ex: login falhado)
            }
        }

        // Auto-preencher nome do actor se temos ID mas nao nome
        if (actorId && !actorNome) {
            try {
                const actor = await prisma.membro.findUnique({
                    where: { id: actorId },
                    select: { first_name: true, last_name: true }
                })
                if (actor) actorNome = `${actor.first_name} ${actor.last_name}`
            } catch { /* nao bloqueia o audit */ }
        }

        const dadosAntes = params.dados_antes
            ? JSON.stringify(sanitizar(params.dados_antes))
            : null
        const dadosApos = params.dados_apos
            ? JSON.stringify(sanitizar(params.dados_apos))
            : null
        const ipLimpo = ip.split(',')[0].trim()

        // Hash de integridade — garante que o registo nao foi adulterado
        const integrityPayload = [
            params.tenant_id,
            actorId || 0,
            params.acao,
            params.categoria,
            params.alvo_id || 0,
            params.descricao || '',
            dadosAntes || '',
            dadosApos || '',
            ipLimpo,
        ].join('|')
        const hash = createHash('sha256').update(integrityPayload).digest('hex').slice(0, 16)

        await prisma.auditLog.create({
            data: {
                tenant_id: params.tenant_id,
                actor_id: actorId || null,
                actor_nome: actorNome || null,
                alvo_id: params.alvo_id || null,
                alvo_nome: params.alvo_nome || null,
                alvo_tipo: params.alvo_tipo || null,
                acao: params.acao,
                categoria: params.categoria,
                descricao: params.descricao || null,
                dados_antes: dadosAntes,
                dados_apos: dadosApos,
                ip: ipLimpo,
                user_agent: userAgent,
                hash,
            }
        })
    } catch (err: any) {
        // Nunca deixa o audit quebrar o fluxo principal
        console.error('[AUDIT] Erro ao registar evento:', err.message)
    }
}

// ── HELPERS ESPECIFICOS ───────────────────────────────────────────────────────

// Para registar apenas os campos que mudaram (evita guardar dados desnecessarios)
export function diffCampos(
    antes: Record<string, any>,
    depois: Record<string, any>,
    camposIgnorar: string[] = ['password', 'updatedAt', 'updated_at']
): { antes: Record<string, any>; depois: Record<string, any> } | null {
    const camposMudaram: string[] = []

    Object.keys(depois).forEach(key => {
        if (camposIgnorar.includes(key)) return
        if (JSON.stringify(antes[key]) !== JSON.stringify(depois[key])) {
            camposMudaram.push(key)
        }
    })

    if (camposMudaram.length === 0) return null

    const snapAntes: Record<string, any> = {}
    const snapDepois: Record<string, any> = {}

    camposMudaram.forEach(key => {
        snapAntes[key] = antes[key]
        snapDepois[key] = depois[key]
    })

    return { antes: snapAntes, depois: snapDepois }
}

// Para sanitizar dados sensiveis antes de guardar no log
export function sanitizar(dados: Record<string, any>): Record<string, any> {
    const CAMPOS_SENSIVEIS = [
        'password', 'nova_senha', 'token', 'secret',
        'holyrics_token', 'api_key', 'cookie', 'session',
    ]
    const resultado = { ...dados }
    CAMPOS_SENSIVEIS.forEach(campo => {
        if (campo in resultado) resultado[campo] = '[OCULTO]'
    })
    return resultado
}

// ── LIMPEZA POR RETENCAO ────────────────────────────────────────────────────

export async function limparLogsAntigos(): Promise<{ removidos: number }> {
    try {
        const tenants = await prisma.tenant.findMany({
            select: { id: true, plano: true }
        })

        const RETENCAO: Record<string, number> = {
            FREE: 7,
            BASIC: 30,
            PRO: 90,
            ENTERPRISE: 0, // 0 = ilimitado
        }

        let totalRemovidos = 0

        for (const t of tenants) {
            const dias = RETENCAO[t.plano] ?? 30
            if (dias === 0) continue // ilimitado

            const limite = new Date()
            limite.setDate(limite.getDate() - dias)

            const { count } = await prisma.auditLog.deleteMany({
                where: {
                    tenant_id: t.id,
                    criado_em: { lt: limite },
                },
            })
            totalRemovidos += count
        }

        return { removidos: totalRemovidos }
    } catch (err: any) {
        console.error('[AUDIT CLEANUP] Erro:', err.message)
        return { removidos: 0 }
    }
}
