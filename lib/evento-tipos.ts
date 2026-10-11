// lib/evento-tipos.ts
// Tipos de evento com cores e labels

export const TIPOS_EVENTO = {
    CULTO_REGULAR: { label: 'Culto Regular', cor: 'bg-figueira', corTexto: 'text-figueira', corBorda: 'border-figueira/30', corFundo: 'bg-figueira/10', hex: '#3f6b4f' },
    CULTO_ESPECIAL: { label: 'Culto Especial', cor: 'bg-amber-500', corTexto: 'text-amber-500', corBorda: 'border-amber-500/30', corFundo: 'bg-amber-500/10', hex: '#f59e0b' },
    CULTO_RUA: { label: 'Culto de Rua', cor: 'bg-blue-500', corTexto: 'text-blue-500', corBorda: 'border-blue-500/30', corFundo: 'bg-blue-500/10', hex: '#3b82f6' },
    CONVIVIO: { label: 'Convivio', cor: 'bg-purple-500', corTexto: 'text-purple-500', corBorda: 'border-purple-500/30', corFundo: 'bg-purple-500/10', hex: '#8b5cf6' },
    REUNIAO: { label: 'Reuniao', cor: 'bg-gray-500', corTexto: 'text-gray-400', corBorda: 'border-gray-500/30', corFundo: 'bg-gray-500/10', hex: '#6b7280' },
    FORMACAO: { label: 'Formacao', cor: 'bg-indigo-500', corTexto: 'text-indigo-400', corBorda: 'border-indigo-500/30', corFundo: 'bg-indigo-500/10', hex: '#6366f1' },
    MISSAO: { label: 'Missao', cor: 'bg-orange-500', corTexto: 'text-orange-500', corBorda: 'border-orange-500/30', corFundo: 'bg-orange-500/10', hex: '#f97316' },
    OUTRO: { label: 'Outro', cor: 'bg-soft', corTexto: 'text-muted', corBorda: 'border-soft', corFundo: 'bg-soft/30', hex: '#7e948a' },
} as const

export type TipoEvento = keyof typeof TIPOS_EVENTO

export function getTipoEvento(tipo: string) {
    return TIPOS_EVENTO[tipo as TipoEvento] || TIPOS_EVENTO.OUTRO
}

export const LISTA_TIPOS = Object.entries(TIPOS_EVENTO).map(([key, val]) => ({
    value: key,
    ...val,
}))
