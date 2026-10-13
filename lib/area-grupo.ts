// lib/area-grupo.ts
// A zona que um pequeno grupo abrange: um contorno desenhado no mapa, guardado
// em Grupo.area como [[lat, lng], ...]. Serve ao servidor e ao editor.

export type PontoArea = [number, number]

export const MAX_PONTOS_AREA = 200

/** Le e valida (vem de JSON do formulario ou da base). Menos de 3 pontos = sem area. */
export function lerArea(valor: unknown): PontoArea[] | null {
    let v = valor
    if (typeof v === 'string') {
        if (!v.trim()) return null
        try { v = JSON.parse(v) } catch { return null }
    }
    if (!Array.isArray(v)) return null
    const pontos: PontoArea[] = []
    for (const p of v.slice(0, MAX_PONTOS_AREA)) {
        if (!Array.isArray(p) || p.length < 2) continue
        const lat = Number(p[0]), lng = Number(p[1])
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
        // 6 casas decimais (~10 cm) chegam e poupam espaco
        pontos.push([Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6])
    }
    return pontos.length >= 3 ? pontos : null
}
