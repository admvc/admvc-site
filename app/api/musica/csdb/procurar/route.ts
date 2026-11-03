// GET /api/musica/csdb/procurar?q=titulo artista  → lista de faixas do CSDB.
import { NextRequest, NextResponse } from 'next/server'
import { procurarFaixas } from '@/lib/csdb'
import { exigirGestorCsdb, respostaDeErro } from '../_comum'

export async function GET(request: NextRequest) {
    const { sessao, erro } = await exigirGestorCsdb()
    if (erro) return erro
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    if (q.length < 2 || q.length > 100) return NextResponse.json({ error: 'Escreve entre 2 e 100 letras.' }, { status: 400 })
    try {
        const faixas = await procurarFaixas(q, sessao.tenantId)
        return NextResponse.json({ faixas })
    } catch (e) {
        return respostaDeErro(e)
    }
}
