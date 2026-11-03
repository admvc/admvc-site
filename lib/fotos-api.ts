// Quem pode enviar fotos: o modulo do Holyrics (FotosCulto.exe) com a chave gerada em Midia.
// A mesma chave que o modulo "Trazer as artes do culto" usa; sem contas e sem login.
import prisma from '@/lib/prisma'
import { chaveCerta } from '@/lib/holyrics-chave'
import { tenantPublico } from '@/lib/divulgacao-publica'

export function chaveDoPedido(request: Request) {
    const url = new URL(request.url)
    return url.searchParams.get('chave') || request.headers.get('x-fotos-chave')
}

/** Devolve a igreja dona da chave, ou null se a chave nao presta. */
export async function igrejaDaChave(request: Request): Promise<number | null> {
    const tenantId = await tenantPublico()
    if (!tenantId) return null
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { holyrics_chave_hash: true } })
    return chaveCerta(chaveDoPedido(request), t?.holyrics_chave_hash) ? tenantId : null
}
