// Todas as artes guardadas de um culto, num ZIP: /api/divulgacao/zip?evento=<id>
import { NextResponse } from 'next/server'
import { sessaoDaApi } from '@/lib/api-auth'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { getTenantClient } from '@/lib/prisma'
import { desenharArte } from '@/lib/divulgacao-imagem'
import { desenharRede } from '@/lib/divulgacao-redes'
import { nomeDaPeca, nomeDaRede, normalizarReceita, paramsDaPeca, paramsDaRede } from '@/lib/divulgacao-kit'
import { criarZip } from '@/lib/zip'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(request: Request) {
    const auth = await sessaoDaApi()
    if (auth.erro) return auth.erro
    if (!(await podeFazerAgenda(auth.sessao))) return NextResponse.json({ error: 'Só a Mídia e a administração.' }, { status: 403 })

    const eventoId = Number(new URL(request.url).searchParams.get('evento'))
    if (!Number.isInteger(eventoId) || eventoId <= 0) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 })

    const kit = await getTenantClient(auth.sessao.tenantId).kitDivulgacao.findFirst({
        where: { evento_id: eventoId },
        select: { receita: true, evento: { select: { nome: true, data: true } } },
    })
    if (!kit) return NextResponse.json({ error: 'Este culto ainda não tem artes guardadas.' }, { status: 404 })

    const receita = normalizarReceita(kit.receita)
    const dia = kit.evento.data.toISOString().slice(0, 10)
    const ficheiros: { nome: string; dados: Uint8Array }[] = []
    for (const [i, peca] of receita.pecas.entries()) {
        const img = await desenharArte(paramsDaPeca(receita, peca, dia))
        ficheiros.push({ nome: nomeDaPeca(receita, peca, i + 1), dados: new Uint8Array(await img.arrayBuffer()) })
    }

    for (const formato of receita.redes) {
        const img = await desenharRede(paramsDaRede(receita, formato, kit.evento))
        ficheiros.push({ nome: nomeDaRede(formato), dados: new Uint8Array(await img.arrayBuffer()) })
    }

    return new NextResponse(new Uint8Array(criarZip(ficheiros)), {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="artes-culto-${dia}.zip"`,
            'Cache-Control': 'private, no-store',
        },
    })
}
