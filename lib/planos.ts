// lib/planos.ts
// Sistema de planos e módulos para controlo de funcionalidades por igreja

// ── MÓDULOS DISPONÍVEIS ──────────────────────────────────────────────────────
export const MODULOS = {
    ESCALAS: 'escalas',
    GRUPOS: 'grupos',
    LOUVOR: 'louvor',
    FINANCEIRO: 'financeiro',
    CANTINA: 'cantina',
    ACOLHIMENTO: 'acolhimento',
    INVENTARIO: 'inventario',
    GABINETE: 'gabinete',
    MURAL: 'mural',
    PERSONALIZACAO: 'personalizacao',
    RELATORIOS: 'relatorios',
    AUDITORIA: 'auditoria',
    HOLYRICS: 'holyrics',
    MESA_SOM: 'mesa_som',
    CIFRAS: 'cifras',
    LUMIKIT: 'lumikit',
    PREGACAO: 'pregacao',
    EBD: 'ebd',
    BOLEIA: 'boleia',
    ASSISTENCIA: 'assistencia',
} as const

export type Modulo = typeof MODULOS[keyof typeof MODULOS]

// ── DEFINIÇÃO DE PLANOS ──────────────────────────────────────────────────────
export type PlanoId = 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'

export interface PlanoConfig {
    id: PlanoId
    nome: string
    modulos: Modulo[]
    limites: {
        max_membros: number        // 0 = ilimitado
        max_congregacoes: number
        max_departamentos: number
        dias_auditoria: number     // retenção de logs
    }
}

export const PLANOS: Record<PlanoId, PlanoConfig> = {
    FREE: {
        id: 'FREE',
        nome: 'Gratuito',
        modulos: [
            MODULOS.MURAL,
        ],
        limites: {
            max_membros: 50,
            max_congregacoes: 1,
            max_departamentos: 3,
            dias_auditoria: 7,
        },
    },
    BASIC: {
        id: 'BASIC',
        nome: 'Básico',
        modulos: [
            MODULOS.ESCALAS,
            MODULOS.GRUPOS,
            MODULOS.MURAL,
            MODULOS.ACOLHIMENTO,
            MODULOS.RELATORIOS,
            MODULOS.AUDITORIA,
        ],
        limites: {
            max_membros: 200,
            max_congregacoes: 3,
            max_departamentos: 10,
            dias_auditoria: 30,
        },
    },
    PRO: {
        id: 'PRO',
        nome: 'Profissional',
        modulos: [
            MODULOS.ESCALAS,
            MODULOS.GRUPOS,
            MODULOS.LOUVOR,
            MODULOS.FINANCEIRO,
            MODULOS.CANTINA,
            MODULOS.ACOLHIMENTO,
            MODULOS.INVENTARIO,
            MODULOS.GABINETE,
            MODULOS.MURAL,
            MODULOS.PERSONALIZACAO,
            MODULOS.RELATORIOS,
            MODULOS.AUDITORIA,
            MODULOS.CIFRAS,
            MODULOS.HOLYRICS,
            MODULOS.PREGACAO,
            MODULOS.EBD,
            MODULOS.BOLEIA,
            MODULOS.ASSISTENCIA,
        ],
        limites: {
            max_membros: 0, // ilimitado
            max_congregacoes: 10,
            max_departamentos: 0, // ilimitado
            dias_auditoria: 90,
        },
    },
    ENTERPRISE: {
        id: 'ENTERPRISE',
        nome: 'Empresarial',
        modulos: Object.values(MODULOS), // todos os módulos
        limites: {
            max_membros: 0,
            max_congregacoes: 0,
            max_departamentos: 0,
            dias_auditoria: 0, // ilimitado
        },
    },
}

// ── MAPEAMENTO ROTA → MÓDULO ─────────────────────────────────────────────────
// Mapeia o prefixo da rota para o módulo que a controla
export const ROTA_MODULO: Record<string, Modulo> = {
    '/escalas': MODULOS.ESCALAS,
    '/grupos': MODULOS.GRUPOS,
    '/louvor': MODULOS.LOUVOR,
    '/departamentos/financeiro': MODULOS.FINANCEIRO,
    '/departamentos/cantina': MODULOS.CANTINA,
    '/departamentos/acolhimento': MODULOS.ACOLHIMENTO,
    '/inventario': MODULOS.INVENTARIO,
    '/gabinete': MODULOS.GABINETE,
    '/membros/mural': MODULOS.MURAL,
    '/admin/personalizacao': MODULOS.PERSONALIZACAO,
    '/admin/auditoria': MODULOS.AUDITORIA,
    '/admin/midia/x32': MODULOS.MESA_SOM,
    '/admin/midia/lumikit': MODULOS.LUMIKIT,
    '/pregacao': MODULOS.PREGACAO,
    '/ensino': MODULOS.EBD,
    '/boleia': MODULOS.BOLEIA,
    '/assistencia': MODULOS.ASSISTENCIA,
    '/financeiro': MODULOS.FINANCEIRO,
}

/**
 * Dado um pathname, retorna o módulo correspondente (ou null se não for modular).
 */
export function getModuloDaRota(pathname: string): Modulo | null {
    // Ordena por comprimento descendente para matching mais específico primeiro
    const prefixos = Object.keys(ROTA_MODULO).sort((a, b) => b.length - a.length)
    for (const prefixo of prefixos) {
        if (pathname.startsWith(prefixo)) {
            return ROTA_MODULO[prefixo]
        }
    }
    return null
}

/**
 * Verifica se um módulo está incluído num plano.
 */
export function moduloIncluidoNoPlano(planoId: string, modulo: Modulo): boolean {
    const plano = PLANOS[planoId as PlanoId]
    if (!plano) return false
    return plano.modulos.includes(modulo)
}

/**
 * Retorna os módulos activos para um tenant, considerando:
 * 1. Os módulos do plano base
 * 2. Overrides customizados (módulos extra activados/desactivados)
 */
export function getModulosAtivos(
    planoId: string,
    modulosCustom?: string[] | null
): Modulo[] {
    const plano = PLANOS[planoId as PlanoId]
    if (!plano) return []

    // Se há override custom, usa-o directamente
    if (modulosCustom && modulosCustom.length > 0) {
        return modulosCustom as Modulo[]
    }

    return plano.modulos
}

/**
 * Verifica se um módulo específico está activo para um tenant.
 */
export function isModuloAtivo(
    planoId: string,
    modulo: Modulo,
    modulosCustom?: string[] | null
): boolean {
    const activos = getModulosAtivos(planoId, modulosCustom)
    return activos.includes(modulo)
}
