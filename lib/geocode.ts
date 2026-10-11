// lib/geocode.ts
// Converte morada em coordenadas GPS usando Nominatim (OpenStreetMap)
// Gratuito, sem chave de API, sem limites para uso interno

export interface Coordenadas {
    latitude: number
    longitude: number
    displayName?: string
}

/**
 * Geocodifica uma morada para coordenadas GPS.
 * Usa a API Nominatim do OpenStreetMap — gratuita e sem chave.
 * Rate limit: 1 pedido/segundo — adequado para uso administrativo.
 */
export async function geocodificarMorada(
    morada: string,
    cidade: string,
    pais = 'Portugal'
): Promise<Coordenadas | null> {
    try {
        const partes = [morada, cidade, pais].filter(Boolean).join(', ')
        const query = encodeURIComponent(partes)

        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=pt`,
            {
                headers: {
                    'User-Agent': 'ADMVC-Igreja/1.0 (contacto@admvc.pt)',
                    'Accept-Language': 'pt-PT,pt;q=0.9'
                },
                next: { revalidate: 86400 } // cache 24h — a morada nao muda
            }
        )

        if (!res.ok) {
            console.error(`[GEOCODE] Erro HTTP ${res.status}`)
            return null
        }

        const data = await res.json()

        if (!data || data.length === 0) {
            console.warn(`[GEOCODE] Morada nao encontrada: "${partes}"`)
            return null
        }

        const resultado = data[0]
        console.log(`[GEOCODE] OK: ${resultado.display_name} → ${resultado.lat}, ${resultado.lon}`)

        return {
            latitude: parseFloat(resultado.lat),
            longitude: parseFloat(resultado.lon),
            displayName: resultado.display_name
        }
    } catch (err: any) {
        console.error('[GEOCODE] Erro ao geocodificar:', err.message)
        return null
    }
}

/**
 * Tenta geocodificar com morada completa.
 * Se falhar, tenta apenas com cidade.
 */
export async function geocodificarComFallback(
    endereco: string | null,
    cidade: string | null,
    pais = 'Portugal'
): Promise<Coordenadas | null> {
    if (endereco && cidade) {
        const resultado = await geocodificarMorada(endereco, cidade, pais)
        if (resultado) return resultado
    }
    // Fallback: só a cidade
    if (cidade) {
        return geocodificarMorada('', cidade, pais)
    }
    return null
}