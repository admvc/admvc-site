// lib/api-auth.ts
// Sessao nas rotas da API: devolve a sessao verificada ou uma resposta
// 401/403 em JSON para devolver logo.

import { NextResponse } from 'next/server'
import { getSessionData, type Role, type SessionData } from '@/lib/auth-utils'

export async function sessaoDaApi(
    papeis?: Role[],
): Promise<{ sessao: SessionData; erro?: undefined } | { sessao?: undefined; erro: NextResponse }> {
    const sessao = await getSessionData()
    if (!sessao) return { erro: NextResponse.json({ error: 'Sem sessão.' }, { status: 401 }) }
    if (papeis && !papeis.includes(sessao.role as Role)) {
        return { erro: NextResponse.json({ error: 'Sem permissão.' }, { status: 403 }) }
    }
    return { sessao }
}
