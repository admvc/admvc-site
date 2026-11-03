// app/api/musica/pesquisar/route.ts
// Pesquisa YouTube e Spotify no servidor — as chaves ficam seguras no .env
// Também gera URLs directos para CifraClub e Letras.mus.br

import { NextRequest, NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeGerirRepertorio } from '@/lib/louvor-permissoes'
import { csdbConfigurado, obterFaixa } from '@/lib/csdb'
import { mapearLinks } from '@/lib/csdb-dados'

/** A pagina existe? (GET rapido; o CifraClub nao responde bem a HEAD) */
async function existe(url: string): Promise<boolean> {
    try {
        const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ADMVC/1.0)' }, signal: AbortSignal.timeout(5000) })
        return r.ok
    } catch {
        return false
    }
}

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
    const { sessao, erro } = await sessaoDaApi()
    if (erro) return erro

    const { searchParams } = request.nextUrl
    const titulo = searchParams.get('titulo') || ''
    const artista = searchParams.get('artista') || ''
    const tipo = searchParams.get('tipo') || 'todos' // 'spotify' | 'youtube' | 'todos'

    if (!titulo) {
        return NextResponse.json({ erro: 'Título obrigatório' }, { status: 400 })
    }

    console.log(`[MUSICA API] Pesquisar: "${titulo}" - "${artista}" - tipo: ${tipo}`)

    // Se a música já está ligada ao CSDB, os links de cifra e letra vêm de lá (verificados), não adivinhados
    const csdbId = Number(searchParams.get('csdb'))
    let doCsdb: { cifra: string | null; letra: string | null } | null = null
    if (Number.isInteger(csdbId) && csdbId > 0 && csdbConfigurado() && (await podeGerirRepertorio(sessao))) {
        try {
            const l = mapearLinks((await obterFaixa(csdbId, sessao.tenantId)).ligacoes)
            doCsdb = { cifra: l.link_cifra, letra: l.link_letra }
        } catch { /* sem CSDB: fica o recurso de adivinhar */ }
    }

    // URLs directos gerados sem API (CifraClub e Letras.mus.br) — só como recurso
    const artistaSlug = artista ? toSlug(artista) : ''
    const tituloSlug = toSlug(titulo)

    // O endereco adivinhado (artista/musica) nem sempre existe: confirma-se, e
    // se nao existir sugere-se a pesquisa do CifraClub (o lider escolhe la).
    const buscaCifraClub = `https://www.cifraclub.com.br/?q=${encodeURIComponent(`${titulo} ${artista}`.trim())}`
    const adivinhado = artistaSlug ? `https://www.cifraclub.com.br/${artistaSlug}/${tituloSlug}/` : null
    const urlCifraClub = doCsdb?.cifra ?? (adivinhado && (await existe(adivinhado)) ? adivinhado : buscaCifraClub)

    const urlLetras = doCsdb?.letra ?? (artistaSlug
        ? `https://www.letras.mus.br/${artistaSlug}/${tituloSlug}/`
        : `https://www.letras.mus.br/pesquisa.php?q=${encodeURIComponent(titulo)}`)

    // Pesquisas via API (paralelas)
    const [resultadosSpotify, resultadosYoutube] = await Promise.all([
        tipo === 'youtube' ? Promise.resolve([]) : pesquisarSpotify(titulo, artista),
        tipo === 'spotify' ? Promise.resolve([]) : pesquisarYoutube(titulo, artista),
    ])

    return NextResponse.json({
        titulo,
        artista,
        links_directos: {
            do_csdb: !!doCsdb?.cifra || !!doCsdb?.letra,
            cifra: urlCifraClub,
            letra: urlLetras,
        },
        spotify: resultadosSpotify,
        youtube: resultadosYoutube,
    })
}