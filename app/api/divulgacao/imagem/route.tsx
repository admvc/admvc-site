// Uma arte de um culto: do telão (PNG 1920×1080; parâmetros em lib/divulgacao-imagem.tsx) ou, com formato=post|story|youtube,
// das redes sociais (lib/divulgacao-redes.tsx). &download=1 descarrega; &previa=1 devolve uma versão pequena (JPEG, 480 px por omissão,
// &w=N muda a largura entre 200 e 800): desenhada já em ponto pequeno (não se rasteriza 1920×1080 para uma miniatura), com memória
// no servidor por receita (mesmo pedido = resposta na hora), pedidos iguais em curso juntos e uns poucos desenhos de cada vez
// (os pedidos que o browser já abandonou não chegam a ser desenhados).
import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { desenharArte } from '@/lib/divulgacao-imagem'
import { desenharRede } from '@/lib/divulgacao-redes'
import { comoPrevia } from '@/lib/imagem-previa'

export const runtime = 'nodejs'

// --- memória das pré-visualizações (só a receita conta: a imagem depende apenas dos parâmetros) ---
const MAX_MEMORIA = 160
const memoria = new Map<string, Uint8Array>()
const emCurso = new Map<string, { p: Promise<Uint8Array>; n: number }>()   // n = quantos pedidos esperam por este desenho
const guardar = (k: string, v: Uint8Array) => { memoria.delete(k); memoria.set(k, v); if (memoria.size > MAX_MEMORIA) memoria.delete(memoria.keys().next().value as string) }

// --- uns poucos desenhos de cada vez ---
const SIMULTANEOS = 2
let ativos = 0
const espera: (() => void)[] = []
async function vez(): Promise<void> {
    if (ativos < SIMULTANEOS) { ativos++; return }
    await new Promise<void>((ok) => espera.push(ok))
}
function acabou() { const n = espera.shift(); if (n) n(); else ativos-- }

async function desenharPrevia(q: URLSearchParams, largura: number): Promise<Uint8Array> {
    const formato = q.get('formato')
    const img = formato ? await desenharRede(q) : await desenharArte(q)   // sempre em tamanho real (o scale do satori partia modelos); o sharp reduz
    const r = await comoPrevia(img, 'private, max-age=86400', largura)
    return new Uint8Array(await r.arrayBuffer())
}

export async function GET(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })

    const q = new URL(request.url).searchParams
    if (q.get('previa')) {
        const largura = Math.min(800, Math.max(200, Number(q.get('w')) || 480))
        q.delete('w'); q.delete('previa')
        const chave = `${largura}?${q}`
        const cabecalhos = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' }
        const guardada = memoria.get(chave)
        if (guardada) { guardar(chave, guardada); return new Response(guardada as BodyInit, { headers: { ...cabecalhos, 'X-Previa': 'memoria' } }) }
        let e = emCurso.get(chave)
        if (!e) {
            const novo = { p: undefined as unknown as Promise<Uint8Array>, n: 0 }
            novo.p = (async () => {
                await vez()
                try {
                    if (request.signal.aborted && novo.n <= 1) throw new Error('abandonado')   // o browser já desistiu e mais ninguém espera
                    const jpg = await desenharPrevia(q, largura)
                    guardar(chave, jpg)
                    return jpg
                } finally { acabou(); emCurso.delete(chave) }
            })()
            emCurso.set(chave, novo)
            e = novo
        }
        e.n++
        const p = e.p
        try { return new Response((await p) as BodyInit, { headers: cabecalhos }) }
        catch { return new Response(null, { status: request.signal.aborted ? 499 : 500 }) }
    }

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
