// Uma arte de um culto: do telão (PNG 1920×1080; parâmetros em lib/divulgacao-imagem.tsx) ou, com formato=post|story|youtube,
// das redes sociais (lib/divulgacao-redes.tsx). &download=1 descarrega.
import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { desenharArte } from '@/lib/divulgacao-imagem'
import { desenharRede } from '@/lib/divulgacao-redes'

export const runtime = 'nodejs'

export async function GET(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })

    const q = new URL(request.url).searchParams
    const img = q.get('formato') ? await desenharRede(q) : await desenharArte(q)
    if (q.get('download')) img.headers.set('Content-Disposition', `attachment; filename="${nomeFicheiro(q)}"`)
    img.headers.set('Cache-Control', 'private, no-store')
    return img
}

function nomeFicheiro(q: URLSearchParams) {
    const limpo = (s: string | null) => (s ?? '').replace(/[^a-z0-9-]/gi, '').slice(0, 30)
    if (q.get('formato')) return `redes-${limpo(q.get('formato'))}.png`
    return `telao-${limpo(q.get('peca'))}-${limpo(q.get('estilo'))}-${limpo(q.get('paleta'))}.png`
}
