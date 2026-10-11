export function formatarMoeda(valor: number): string {
    return `${valor.toFixed(2)}€`
}

export function calcularPercentagem(parcial: number, total: number): number {
    if (total === 0) return 0
    return Math.round((parcial / total) * 100)
}

export function gerarReferencia(prefix: string, id: number): string {
    const timestamp = Date.now().toString(36)
    return `${prefix}-${id}-${timestamp}`.toUpperCase()
}
