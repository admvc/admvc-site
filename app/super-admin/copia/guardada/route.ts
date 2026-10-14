/**
 * Descarrega uma copia guardada pela app (`?c=copias/....json`): a que se
 * grava antes de cada restauro. So um Super Admin ADMIN.
 */

import { NextResponse } from 'next/server'
import { saAdmin, SEM_PERMISSAO_COPIA } from '@/lib/copia/acesso'
import { lerCopiaGuardada } from '@/lib/copia/guardadas'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    if (!(await saAdmin())) return new NextResponse(SEM_PERMISSAO_COPIA, { status: 403 })

    const caminho = new URL(req.url).searchParams.get('c') ?? ''
    const f = await lerCopiaGuardada(caminho)
    if (!f) return new NextResponse('Cópia não encontrada.', { status: 404 })

    const nome = caminho.slice(caminho.lastIndexOf('/') + 1)
    return new NextResponse(f as BodyInit, {
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="admvc-${nome}"`,
            'Cache-Control': 'no-store',
        },
    })
}
