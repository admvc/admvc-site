// app/api/cron/acolhimento-lembretes/route.ts
// Cron diário: notifica membros/líderes sobre visitantes com acompanhamento atrasado (+48h)
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendPushToMembros } from '@/lib/web-push'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const limite48h = new Date(Date.now() - 48 * 60 * 60 * 1000)

        // Visitantes activos com último contacto > 48h
        const atrasados = await prisma.visitante.findMany({
            where: {
                status: { in: ['NOVO', 'EM_CONTACTO'] },
            },
            include: {
                responsavel: { select: { id: true, first_name: true } },
                acompanhamentos: {
                    orderBy: { data_contacto: 'desc' },
                    take: 1,
                    select: { data_contacto: true }
                },
                tenant: {
                    select: {
                        id: true,
                        departamentos: {
                            where: { nome: { contains: 'colhimento', mode: 'insensitive' } },
                            include: {
                                lider: { select: { id: true } }
                            }
                        }
                    }
                }
            }
        })

        const visitantesAtrasados = atrasados.filter(v => {
            const ultima = v.acompanhamentos[0]?.data_contacto || v.data_primeira_visita
            return new Date(ultima) < limite48h
        })

        if (visitantesAtrasados.length === 0) {
            return NextResponse.json({ ok: true, notificados: 0 })
        }

        // Agrupar por destinatário
        const notificacoes = new Map<number, string[]>()

        for (const v of visitantesAtrasados) {
            // Notificar responsável se existir, senão líder do departamento
            const destinatarioId = v.responsavel?.id
                || v.tenant?.departamentos?.[0]?.lider?.id

            if (destinatarioId) {
                const lista = notificacoes.get(destinatarioId) || []
                lista.push(v.nome)
                notificacoes.set(destinatarioId, lista)
            }
        }

        // Enviar push notifications
        const membroIds = Array.from(notificacoes.keys())
        if (membroIds.length > 0) {
            for (const [membroId, nomes] of notificacoes) {
                const plural = nomes.length > 1
                const corpo = plural
                    ? `${nomes.length} visitantes aguardam contacto ha mais de 48h`
                    : `${nomes[0]} aguarda contacto ha mais de 48h`

                try {
                    await sendPushToMembros(
                        [membroId],
                        {
                            title: 'Acolhimento — Atraso',
                            body: corpo,
                            url: '/departamentos/acolhimento/dashboard',
                            tag: 'acolhimento-atraso'
                        }
                    )
                } catch (err) {
                    console.error(`[CRON-ACOLHIMENTO] Falha push membro ${membroId}:`, err)
                }
            }
        }

        return NextResponse.json({
            ok: true,
            visitantesAtrasados: visitantesAtrasados.length,
            notificados: membroIds.length
        })
    } catch (error) {
        console.error('[CRON-ACOLHIMENTO] Erro:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
