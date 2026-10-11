// app/api/musica/pesquisar/route.ts
// Pesquisa YouTube e Spotify no servidor — as chaves ficam seguras no .env
// Também gera URLs directos para CifraClub e Letras.mus.br

import { NextRequest, NextResponse } from 'next/server'

// ── HELPERS: gerar slugs para URLs directos ───────────────────────────────────
function toSlug(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
}

// ── SPOTIFY: token via Client Credentials (sem login do utilizador) ───────────
async function getSpotifyToken(): Promise<string | null> {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.warn('[MUSICA API] SPOTIFY_CLIENT_ID ou SPOTIFY_CLIENT_SECRET não configurados')
        return null
    }

    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials',
            next: { revalidate: 3500 } // cache ~1h (token expira em 3600s)
        })
        const data = await res.json()
        return data.access_token || null
    } catch (err: any) {
        console.error('[MUSICA API] Erro ao obter token Spotify:', err.message)
        return null
    }
}

async function pesquisarSpotify(titulo: string, artista: string) {
    const token = await getSpotifyToken()
    if (!token) return []

    try {
        const q = encodeURIComponent(`track:${titulo}${artista ? ` artist:${artista}` : ''}`)
        const res = await fetch(
            `https://api.spotify.com/v1/search?q=${q}&type=track&limit=5&market=PT`,
            { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const data = await res.json()
        const tracks = data.tracks?.items || []

        return tracks.map((t: any) => ({
            id: t.id,
            titulo: t.name,
            artista: t.artists.map((a: any) => a.name).join(', '),
            album: t.album.name,
            url: t.external_urls.spotify,
            preview_url: t.preview_url,
            imagem: t.album.images[2]?.url || t.album.images[0]?.url,
            duracao_ms: t.duration_ms,
        }))
    } catch (err: any) {
        console.error('[MUSICA API] Erro Spotify:', err.message)
        return []
    }
}

async function pesquisarYoutube(titulo: string, artista: string) {
    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) {
        console.warn('[MUSICA API] YOUTUBE_API_KEY não configurado')
        return []
    }

    try {
        const q = encodeURIComponent(`${titulo} ${artista} letra oficial`)
        const res = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${q}&type=video&maxResults=5&key=${apiKey}&relevanceLanguage=pt`,
        )
        const data = await res.json()
        const items = data.items || []

        return items.map((item: any) => ({
            id: item.id.videoId,
            titulo: item.snippet.title,
            canal: item.snippet.channelTitle,
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            imagem: item.snippet.thumbnails.default?.url,
        }))
    } catch (err: any) {
        console.error('[MUSICA API] Erro YouTube:', err.message)
        return []
    }
}

// ── HANDLER PRINCIPAL ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
    const { searchParams } = request.nextUrl
    const titulo = searchParams.get('titulo') || ''
    const artista = searchParams.get('artista') || ''
    const tipo = searchParams.get('tipo') || 'todos' // 'spotify' | 'youtube' | 'todos'

    if (!titulo) {
        return NextResponse.json({ erro: 'Titulo obrigatorio' }, { status: 400 })
    }

    console.log(`[MUSICA API] Pesquisar: "${titulo}" - "${artista}" - tipo: ${tipo}`)

    // URLs directos gerados sem API (CifraClub e Letras.mus.br)
    const artistaSlug = artista ? toSlug(artista) : ''
    const tituloSlug = toSlug(titulo)

    const urlCifraClub = artistaSlug
        ? `https://www.cifraclub.com.br/${artistaSlug}/${tituloSlug}/`
        : `https://www.cifraclub.com.br/busca/?q=${encodeURIComponent(titulo)}`

    const urlLetras = artistaSlug
        ? `https://www.letras.mus.br/${artistaSlug}/${tituloSlug}/`
        : `https://www.letras.mus.br/pesquisa.php?q=${encodeURIComponent(titulo)}`

    // Pesquisas via API (paralelas)
    const [resultadosSpotify, resultadosYoutube] = await Promise.all([
        tipo === 'youtube' ? Promise.resolve([]) : pesquisarSpotify(titulo, artista),
        tipo === 'spotify' ? Promise.resolve([]) : pesquisarYoutube(titulo, artista),
    ])

    return NextResponse.json({
        titulo,
        artista,
        links_directos: {
            cifra: urlCifraClub,
            letra: urlLetras,
        },
        spotify: resultadosSpotify,
        youtube: resultadosYoutube,
    })
}