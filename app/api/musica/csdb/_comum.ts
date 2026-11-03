// Partilhado pelas rotas do CSDB: só quem gere as músicas do Louvor; erros em JSON.
import { NextResponse } from 'next/server'
import { getSessionData, type SessionData } from '@/lib/auth-utils'
import { podeGerirRepertorio } from '@/lib/louvor-permissoes'
import { CsdbErro, csdbConfigurado } from '@/lib/csdb'

export async function exigirGestorCsdb(): Promise<{ sessao: SessionData; erro?: undefined } | { sessao?: undefined; erro: NextResponse }> {
    const sessao = await getSessionData()
    if (!sessao) return { erro: NextResponse.json({ error: 'Sem sessão.' }, { status: 401 }) }
    if (!(await podeGerirRepertorio(sessao))) return { erro: NextResponse.json({ error: 'Sem permissão.' }, { status: 403 }) }
    if (!csdbConfigurado()) return { erro: NextResponse.json({ error: 'CSDB não configurado.' }, { status: 503 }) }
    return { sessao }
}

export function respostaDeErro(e: unknown): NextResponse {
    if (e instanceof CsdbErro) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[CSDB] erro inesperado:', e)
    return NextResponse.json({ error: 'Erro ao falar com o CSDB.' }, { status: 500 })
}
