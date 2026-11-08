// Um fundo: PATCH { nome?, categoria?, mover?: -1 | 1 } e DELETE (apaga também o ficheiro do Blob). Só Mídia/administração.
import { NextRequest, NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { categoriaValida, nomeLimpo, type CategoriaFundo } from '@/lib/fundos'
import { apagarFundo, atualizarFundo, moverFundo } from '@/lib/fundos-dados'

export const runtime = 'nodejs'

async function entrada(params: Promise<{ id: string }>) {
    const auth = await sessaoDaApi()
    if (auth.erro) return { erro: auth.erro }
    if (!(await podeFazerAgenda(auth.sessao))) return { erro: NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 }) }
    const id = Number((await params).id)
    if (!Number.isInteger(id) || id <= 0) return { erro: NextResponse.json({ error: 'Fundo inválido.' }, { status: 400 }) }
    return { tenantId: auth.sessao.tenantId, id }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const e = await entrada(params)
    if (e.erro) return e.erro
    const corpo = await request.json().catch(() => null) as { nome?: unknown; categoria?: unknown; mover?: unknown } | null
    if (!corpo) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })

    if (corpo.mover !== undefined) {
        if (corpo.mover !== -1 && corpo.mover !== 1) return NextResponse.json({ error: 'Movimento inválido.' }, { status: 400 })
        const ok = await moverFundo(e.tenantId, e.id, corpo.mover)
        return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Fundo não encontrado.' }, { status: 404 })
    }
    const d: { nome?: string; categoria?: CategoriaFundo } = {}
    if (corpo.nome !== undefined) {
        const nome = typeof corpo.nome === 'string' ? nomeLimpo(corpo.nome) : ''
        if (!nome) return NextResponse.json({ error: 'Escreva um nome.' }, { status: 400 })
        d.nome = nome
    }
    if (corpo.categoria !== undefined) {
        if (!categoriaValida(corpo.categoria)) return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 })
        d.categoria = corpo.categoria
    }
    const fundo = await atualizarFundo(e.tenantId, e.id, d)
    return fundo ? NextResponse.json({ fundo }) : NextResponse.json({ error: 'Fundo não encontrado.' }, { status: 404 })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const e = await entrada(params)
    if (e.erro) return e.erro
    const ok = await apagarFundo(e.tenantId, e.id)
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Fundo não encontrado.' }, { status: 404 })
}
