// Memória das pré-visualizações geradas no servidor: o mesmo pedido responde na hora, pedidos iguais em curso juntam-se,
// só uns poucos desenhos de cada vez e os pedidos que o browser já abandonou não chegam a ser desenhados.
// (Mesma ideia de app/api/divulgacao/imagem/route.tsx; uma instância por rota.)

export function criarPrevias(max = 120, simultaneos = 2) {
    const memoria = new Map<string, Uint8Array>()
    const emCurso = new Map<string, { p: Promise<Uint8Array>; n: number }>()
    const espera: (() => void)[] = []
    let ativos = 0
    const vez = async () => { if (ativos < simultaneos) { ativos++; return } await new Promise<void>((ok) => espera.push(ok)) }
    const acabou = () => { const n = espera.shift(); if (n) n(); else ativos-- }
    const guardar = (k: string, v: Uint8Array) => { memoria.delete(k); memoria.set(k, v); if (memoria.size > max) memoria.delete(memoria.keys().next().value as string) }

    /** `desenhar` só corre se ninguém tiver já o resultado; `abandonado()` diz se quem pediu já desistiu. Devolve os bytes e se vieram da memória. */
    async function obter(chave: string, desenhar: () => Promise<Uint8Array>, abandonado: () => boolean): Promise<{ bytes: Uint8Array; memoria: boolean }> {
        const guardada = memoria.get(chave)
        if (guardada) { guardar(chave, guardada); return { bytes: guardada, memoria: true } }
        let e = emCurso.get(chave)
        if (!e) {
            const novo = { p: undefined as unknown as Promise<Uint8Array>, n: 0 }
            novo.p = (async () => {
                await vez()
                try {
                    if (abandonado() && novo.n <= 1) throw new Error('abandonado')
                    const bytes = await desenhar()
                    guardar(chave, bytes)
                    return bytes
                } finally { acabou(); emCurso.delete(chave) }
            })()
            emCurso.set(chave, novo)
            e = novo
        }
        e.n++
        return { bytes: await e.p, memoria: false }
    }
    return { obter, tamanho: () => memoria.size }
}
