// Quando um visitante está "atrasado" (o painel e o lembrete diário usam a mesma regra).
//
// - Com próximo contacto marcado: atrasado quando esse dia já passou.
// - Sem data marcada: atrasado 48h depois do último contacto (ou da 1.ª visita).

export const HORAS_SEM_CONTACTO = 48

const DIA = 24 * 60 * 60 * 1000

export function estaAtrasado(
    v: { proximo_contacto: Date | string | null; data_primeira_visita: Date | string },
    ultimoContacto: Date | string | null | undefined,
    agora: Date = new Date()
): boolean {
    if (v.proximo_contacto) {
        // A data marcada é um dia (guardado à meia-noite): conta o dia inteiro.
        return agora.getTime() >= new Date(v.proximo_contacto).getTime() + DIA
    }
    const ultima = new Date(ultimoContacto ?? v.data_primeira_visita)
    return agora.getTime() - ultima.getTime() > HORAS_SEM_CONTACTO * 60 * 60 * 1000
}

/** "2026-10-20" (do <input type="date">) → Date à meia-noite UTC; '' → null. Lança erro se inválida. */
export function lerDataContacto(texto: string): Date | null {
    const t = texto.trim()
    if (!t) return null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error('Data inválida.')
    const d = new Date(`${t}T00:00:00.000Z`)
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t) throw new Error('Data inválida.')
    return d
}

/** Pesquisa por nome ou telefone (escrito como está guardado, ou só os dígitos). */
export function filtroPesquisa(q: string) {
    const texto = q.trim()
    if (!texto) return {}
    const digitos = texto.replace(/\D/g, '')
    const telefones = digitos.length >= 3 ? [...new Set([texto, digitos])] : []
    return {
        OR: [
            { nome: { contains: texto, mode: 'insensitive' as const } },
            ...telefones.map(t => ({ telefone: { contains: t } })),
        ],
    }
}
