import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { enviarEmailNotificacaoEquipa } from '@/lib/mail'
import { sendPushToDepartamento } from '@/lib/web-push'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'unknown'
        const { success } = rateLimit(`visitante:${ip}`, 5, 60000) // 5 requests per minute
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        const body = await request.json()
        const { nome, telefone, pedido_oracao } = body

        if (!nome || !telefone) {
            return NextResponse.json(
                { error: 'Nome e telefone sao obrigatorios.' },
                { status: 400 }
            )
        }

        // Validar formato de telefone (aceita formatos PT, BR e internacionais)
        const telefoneLimpo = telefone.replace(/[\s\-()\.+]/g, '')
        if (!/^\d{9,15}$/.test(telefoneLimpo)) {
            return NextResponse.json(
                { error: 'Formato de telefone invalido.' },
                { status: 400 }
            )
        }

        // Resolver tenant — prioridade para tenant activo
        const tenant = await prisma.tenant.findFirst({
            where: { status: 'ATIVO' },
            orderBy: { id: 'asc' },
        }) ?? await prisma.tenant.findFirst({ orderBy: { id: 'asc' } })

        if (!tenant) {
            return NextResponse.json(
                { error: 'Configuracao nao encontrada.' },
                { status: 500 }
            )
        }
        console.log(`[VISITANTE-API] Tenant resolvido: id=${tenant.id}, nome=${tenant.nome}`)

        const visitante = await prisma.visitante.create({
            data: {
                tenant_id: tenant.id,
                nome,
                telefone,
                pedido_oracao: pedido_oracao || null,
            }
        })

        // Email para equipa (log em caso de falha)
        enviarEmailNotificacaoEquipa({ nome, telefone, pedido: pedido_oracao }).catch((err) => {
            console.error('[VISITANTE-API] Falha ao enviar email de notificação:', err)
        })

        // Push notification para membros do acolhimento
        sendPushToDepartamento(
            ['acolhimento', 'integração', 'Acolhimento'],
            {
                title: 'Novo Visitante!',
                body: `${nome} acabou de se registar. Faca o primeiro contacto.`,
                url: '/departamentos/acolhimento/dashboard',
                tag: 'visitante-novo',
            }
        ).catch((err) => {
            console.error('[VISITANTE-API] Falha ao enviar push notification:', err)
        })

        return NextResponse.json({ ok: true, id: visitante.id })
    } catch (error: any) {
        console.error('[API PUBLIC] Erro ao registar visitante:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        )
    }
}
