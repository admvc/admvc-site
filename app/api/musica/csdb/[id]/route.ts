// GET /api/musica/csdb/{id}  → a faixa do CSDB já nos campos da música (com os links reais).
import { NextRequest, NextResponse } from 'next/server'
import { obterFaixa } from '@/lib/csdb'
import { dadosDaFaixa } from '@/lib/csdb-dados'
import { exigirGestorCsdb, respostaDeErro } from '../_comum'

export async function GET(_request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { sessao, erro } = await exigirGestorCsdb()
    if (erro) return erro
    const { id } = await ctx.params
    if (!/^\d{1,10}$/.test(id)) return NextResponse.json({ error: 'Faixa inválida.' }, { status: 400 })
    try {
        const faixa = await obterFaixa(Number(id), sessao.tenantId)
        return NextResponse.json({ musica: dadosDaFaixa(faixa) })
    } catch (e) {
        return respostaDeErro(e)
    }
}
