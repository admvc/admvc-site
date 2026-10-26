// instrumentation.ts — erros do servidor (páginas, ações, rotas) vão para
// erros_app, com o digest que o browser também mostra no ecrã de erro.
// O import fica dentro do `if` para não entrar no pacote do edge (sem pg/fs).
import type { Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { registarErroDoServidor } = await import('./lib/erros-servidor')
        await registarErroDoServidor(err, request, context)
    }
}
