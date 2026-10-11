// app/api/cron/lembretes/route.ts
// Cron job que corre a cada hora e envia push para escalados 2h antes do evento
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendPushToMembros } from '@/lib/web-push'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // Verificar secret para proteger o endpoint
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const agora = new Date()
        const daquiA2h = new Date(agora.getTime() + 2 * 60 * 60 * 1000)
        const daquiA3h = new Date(agora.getTime() + 3 * 60 * 60 * 1000)

        // Buscar eventos que começam entre 2h e 3h a partir de agora
        // (janela de 1h para o cron que corre a cada hora)
        const escalas = await prisma.escala.findMany({
            where: {
                evento: {
                    data: { gte: daquiA2h, lt: daquiA3h }
                },
                confirmado: true,
            },
            include: {
                membro: { select: { id: true, first_name: true } },
                evento: { select: { nome: true, data: true } },
                departamento: { select: { nome: true } },
            }
        })

        if (escalas.length === 0) {
            return NextResponse.json({ ok: true, lembretes: 0 })
        }

        // Agrupar por evento para nao enviar multiplos push ao mesmo membro
        const porEvento = new Map<number, { evento: any; membroIds: number[] }>()
        for (const esc of escalas) {
            const key = esc.evento_id
            if (!porEvento.has(key)) {
                porEvento.set(key, { evento: esc.evento, membroIds: [] })
            }
            const grupo = porEvento.get(key)!
            if (!grupo.membroIds.includes(esc.membro.id)) {
                grupo.membroIds.push(esc.membro.id)
            }
        }

        let totalEnviados = 0
        for (const [, { evento, membroIds }] of porEvento) {
            const hora = new Date(evento.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
            const result = await sendPushToMembros(membroIds, {
                title: 'Lembrete: 2h para o culto!',
                body: `${evento.nome} comeca as ${hora}. Prepara-te!`,
                url: '/membros/dashboard',
                tag: `lembrete-${evento.id}`,
            })
            totalEnviados += result.enviados
        }

        return NextResponse.json({
            ok: true,
            eventos: porEvento.size,
            lembretes: totalEnviados,
        })
    } catch (error: any) {
        console.error('[CRON LEMBRETES] Erro:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
