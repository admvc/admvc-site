import { NextResponse, after } from 'next/server'
import prisma from '@/lib/prisma'
import { enviarEmailNotificacaoEquipa } from '@/lib/mail'
import { sendPushToDepartamento } from '@/lib/web-push'
import { rateLimit, ipDoPedido } from '@/lib/rate-limit'
import { registarVisita, telefoneValido } from '@/lib/visitante-registo'
import { acharCongregacao } from '@/lib/congregacao-site'

export async function POST(request: Request) {
    try {
        const ip = ipDoPedido(request.headers)
        const { success } = await rateLimit(`visitante:${ip}`, 5, 60000) // 5 requests per minute
        if (!success) {
            return NextResponse.json({ error: 'Demasiados pedidos. Tente novamente mais tarde.' }, { status: 429 })
        }

        const body = await request.json()
        const { nome, telefone, pedido_oracao, consentimento, congregacao: congregacaoPedida } = body
        // De onde veio: QR das boas-vindas (portal) ou site (www). Outro valor = site.
        const origem = body.origem === 'QR' ? 'QR' : 'SITE'

        // Armadilha para robôs: campo escondido que uma pessoa nunca preenche. Responde "ok" e não grava.
        if (typeof body.empresa === 'string' && body.empresa.trim()) {
            console.warn('[VISITANTE-API] Ignorado (campo escondido preenchido)')
            return NextResponse.json({ ok: true })
        }

        // RGPD: sem consentimento explicito nao se guarda nada
        if (consentimento !== true) {
            return NextResponse.json(
                { error: 'Para enviarmos os seus dados, aceite a caixa de consentimento.' },
                { status: 400 }
            )
        }

        if (!nome || !telefone) {
            return NextResponse.json(
                { error: 'Nome e telefone são obrigatórios.' },
                { status: 400 }
            )
        }

        // Validar formato de telefone (aceita formatos PT, BR e internacionais)
        if (!telefoneValido(telefone)) {
            return NextResponse.json(
                { error: 'Formato de telefone inválido.' },
                { status: 400 }
            )
        }
        // O mesmo telefone no máximo 3 vezes por dia (evita encher a lista)
        if (!(await rateLimit(`visitante-tel:${String(telefone).replace(/\D/g, '')}`, 3, 24 * 60 * 60 * 1000)).success) {
            return NextResponse.json({ error: 'Este número já se registou hoje. Obrigado!' }, { status: 429 })
        }
        if (String(nome).length > 120 || (typeof pedido_oracao === 'string' && pedido_oracao.length > 2000)) {
            return NextResponse.json({ error: 'Texto demasiado longo.' }, { status: 400 })
        }

        // Resolver tenant — prioridade para tenant activo
        const tenant = await prisma.tenant.findFirst({
            where: { status: 'ATIVO' },
            orderBy: { id: 'asc' },
        }) ?? await prisma.tenant.findFirst({ orderBy: { id: 'asc' } })

        if (!tenant) {
            return NextResponse.json(
                { error: 'Configuração não encontrada.' },
                { status: 500 }
            )
        }
        console.log(`[VISITANTE-API] Tenant resolvido: id=${tenant.id}, nome=${tenant.nome}`)

        // As mensagens do formulário de contacto do site não são visitas: ficam à parte.
        // Uma visita da mesma pessoa (mesmo telefone) soma-se ao registo que já existe.
        const eContacto = typeof pedido_oracao === 'string' && pedido_oracao.includes('[CONTACTO SITE]')
        const visita = eContacto
            ? null
            : await registarVisita(prisma, {
                tenantId: tenant.id, nome, telefone, pedido: pedido_oracao, origem,
                // QR da congregação (/boasvindas?c=montemor): nome curto ou número; desconhecida = sem
                congregacao: congregacaoPedida
                    ? acharCongregacao(await prisma.congregacao.findMany({ where: { tenant_id: tenant.id }, select: { id: true, nome: true } }), congregacaoPedida)
                    : null,
            })
        const visitante = visita ?? await prisma.visitante.create({
            data: {
                tenant_id: tenant.id,
                nome,
                telefone,
                pedido_oracao: pedido_oracao || null,
                consentimento_em: new Date(),
            }
        })
        if (visita?.repetido) return NextResponse.json({ ok: true, id: visitante.id })
        const voltou = visita && !visita.novo ? visita : null

        // Email para equipa (log em caso de falha); after: no Vercel a função não acaba antes de sair
        after(() => enviarEmailNotificacaoEquipa({ nome, telefone, pedido: pedido_oracao, visitas: voltou?.visitas }).catch((err) => {
            console.error('[VISITANTE-API] Falha ao enviar email de notificação:', err)
        }))

        // Push notification para membros do acolhimento
        after(() => sendPushToDepartamento(
            ['acolhimento', 'integração', 'Acolhimento'],
            {
                title: voltou ? 'Um visitante voltou!' : 'Novo Visitante!',
                body: voltou
                    ? `${voltou.nome} voltou (${voltou.visitas}.ª visita).`
                    : `${nome} acabou de se registar. Faça o primeiro contacto.`,
                url: '/departamentos/acolhimento/dashboard',
                tag: 'visitante-novo',
            }
        ).catch((err) => {
            console.error('[VISITANTE-API] Falha ao enviar push notification:', err)
        }))

        return NextResponse.json({ ok: true, id: visitante.id })
    } catch (error: any) {
        console.error('[API PUBLIC] Erro ao registar visitante:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor.' },
            { status: 500 }
        )
    }
}
