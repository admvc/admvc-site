// lib/obra-tijolos.ts
// A campanha da obra em tijolos (o modelo do VOLTA ADMVC). O dinheiro é o único
// número guardado; os tijolos saem dele, para as duas contas nunca discordarem:
//   200.000 ÷ 1.000 = 200 tijolos · 9.000 ÷ 1.000 = 9 assentados · 4,5 %
// Tijolo parcial não conta. Sem dependências: o site público tem uma cópia igual.

export interface ValoresObra {
    valorObra: number
    valorTijolo: number
    arrecadado: number
}

export interface ContasObra {
    total: number
    colocados: number
    faltam: number
    pct: number
    faltaEur: number
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

export function contasObra({ valorObra, valorTijolo, arrecadado }: ValoresObra): ContasObra {
    const vt = Math.max(1, num(valorTijolo))
    const vo = Math.max(0, num(valorObra))
    const ar = Math.max(0, num(arrecadado))
    const total = Math.max(1, Math.round(vo / vt))
    const colocados = Math.min(total, Math.floor(ar / vt))
    return {
        total,
        colocados,
        faltam: total - colocados,
        pct: vo ? Math.min(100, (ar / vo) * 100) : 0,
        faltaEur: Math.max(0, vo - ar),
    }
}

// ── A silhueta da igreja ─────────────────────────────────────────────────────
// viewBox 0 0 200 196. A grelha de tijolos é procurada para caber o número
// pedido dentro da silhueta (o telhado corta as fileiras de cima; a porta fica livre).

export type Celula = [x: number, y: number, largura: number, altura: number]

export interface DesenhoIgreja {
    celulas: Celula[]
    silhueta: string
    porta: string
    cume: number
}

const CHAO = 176, CUME = 30, ESQ = 16, DIR = 184, OMBRO = 104
const P_ESQ = 86, P_DIR = 114, P_TOPO = 132
const POLIGONO: [number, number][] = [[ESQ, CHAO], [ESQ, OMBRO], [100, CUME], [DIR, OMBRO], [DIR, CHAO]]

/** Ponto dentro do polígono, pelo método do raio. */
function dentro(x: number, y: number) {
    let d = false
    for (let i = 0, j = POLIGONO.length - 1; i < POLIGONO.length; j = i++) {
        const [xi, yi] = POLIGONO[i], [xj, yj] = POLIGONO[j]
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) d = !d
    }
    return d
}

const r1 = (n: number) => Math.round(n * 10) / 10
const cache = new Map<number, DesenhoIgreja>()

export function desenhoIgreja(total: number): DesenhoIgreja {
    const guardado = cache.get(total)
    if (guardado) return guardado

    let melhor: Celula[] | null = null
    for (let larg = 4; larg <= 30; larg += 0.25) {
        const alt = larg * 0.45, junta = Math.max(0.6, larg * 0.09), cels: Celula[] = []
        let fila = 0
        for (let y = CHAO - alt; y > CUME - alt; y -= alt + junta) {
            const off = fila % 2 ? -(larg + junta) / 2 : 0
            for (let x = ESQ + off; x < DIR; x += larg + junta) {
                const cx = x + larg / 2, cy = y + alt / 2
                if (!dentro(cx, cy)) continue
                if (cx > P_ESQ - 1 && cx < P_DIR + 1 && cy > P_TOPO - 8) continue
                cels.push([r1(x), r1(y), r1(larg), r1(alt)])
            }
            fila++
        }
        if (!melhor || Math.abs(cels.length - total) < Math.abs(melhor.length - total)) melhor = cels
        if (melhor.length === total) break
    }

    const r: DesenhoIgreja = {
        celulas: melhor ?? [],
        silhueta: `M${ESQ} ${CHAO} L${ESQ} ${OMBRO} L100 ${CUME} L${DIR} ${OMBRO} L${DIR} ${CHAO} Z`,
        porta: `M${P_ESQ} ${CHAO} L${P_ESQ} ${P_TOPO} A14 14 0 0 1 ${P_DIR} ${P_TOPO} L${P_DIR} ${CHAO}`,
        cume: CUME,
    }
    cache.set(total, r)
    return r
}

/** Quantas células pintar: se a grelha não fechar o total exato, mantém a proporção. */
export function celulasCheias(colocados: number, total: number, celulas: number) {
    return total > 0 ? Math.round((colocados / total) * celulas) : 0
}
