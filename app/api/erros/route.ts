// POST /api/erros — o ecrã de erro do browser envia aqui o que aconteceu.
// Aberto (o erro pode ser antes de entrar), por isso: limite por IP e tamanho máximo.
import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { registarErro } from '@/lib/erros-app'
import { COOKIE_MEMBRO } from '@/lib/sessao-core'
import { classificarErro } from '@/lib/erros-tipos'

export async function POST(req: Request) {
    const h = await headers()
    const { success } = await rateLimit(`erros:${ipDoPedido(h)}`, 20, 60_000)
    if (!success) return NextResponse.json({ ok: false }, { status: 429 })

    const texto = await req.text()
    if (texto.length > 20_000) return NextResponse.json({ ok: false }, { status: 413 })
    let corpo: Record<string, unknown>
    try { corpo = JSON.parse(texto) } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
    const s = (k: string) => (typeof corpo[k] === 'string' ? (corpo[k] as string) : undefined)

    const mensagem = s('mensagem') ?? '(sem mensagem)'
    const tipo = classificarErro({ name: s('nome'), message: mensagem, digest: s('digest') }, corpo.online !== false)
    const codigo = await registarErro({
        origem: 'CLIENTE',
        tipo,
        mensagem: s('nome') && !mensagem.startsWith(s('nome')!) ? `${s('nome')}: ${mensagem}` : mensagem,
        stack: s('stack'),
        digest: s('digest'),
        url: s('url'),
        userAgent: h.get('user-agent'),
        codigo: s('codigo'),
        cookieSessao: (await cookies()).get(COOKIE_MEMBRO)?.value,
    })
    return NextResponse.json({ ok: !!codigo, codigo })
}
