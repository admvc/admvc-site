/**
 * Descarrega a copia completa da base (todas as igrejas) num JSON.
 * O middleware ja so deixa passar o Super Admin; volta a confirmar-se aqui,
 * com o papel, porque isto entrega a base inteira de uma vez.
 */

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { saAdmin, SEM_PERMISSAO_COPIA } from '@/lib/copia/acesso'
import { copiaCompleta, copiaEmJson } from '@/lib/copia/gerar'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET() {
    const eu = await saAdmin()
    if (!eu) return new NextResponse(SEM_PERMISSAO_COPIA, { status: 403 })

    const copia = await copiaCompleta()
    const total = Object.values(copia.contagem).reduce((a, b) => a + b, 0)
    await prisma.superAdminLog.create({
        data: { sa_id: eu.saId, acao: 'DESCARREGAR_COPIA', detalhes: `${total} linhas` },
    })

    const dia = copia.gravadoEm.slice(0, 16).replace(/[:T]/g, '-')
    return new NextResponse(copiaEmJson(copia), {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="admvc-copia-${dia}.json"`,
            'Cache-Control': 'no-store',
        },
    })
}
