// lib/email-escalas.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface NotificacaoEscalaParams {
    membroNome: string
    eventoNome: string
    eventoData: string
    departamentoNome: string
    funcao: string
    tipo: 'CONFIRMADO' | 'RECUSADO'
    motivo?: string
    liderEmail?: string
    liderNome?: string
}

export async function enviarNotificacaoEscala(params: NotificacaoEscalaParams) {
    if (!params.liderEmail || !process.env.RESEND_API_KEY) return

    const isConfirmado = params.tipo === 'CONFIRMADO'
    const cor = isConfirmado ? '#22c55e' : '#ef4444'
    const emoji = isConfirmado ? '✅' : '❌'
    const status = isConfirmado ? 'Confirmou' : 'Recusou'

    try {
        await resend.emails.send({
            from: 'Sistema ADMVC <escalas@igrejaadmvc.org>',
            to: params.liderEmail,
            subject: `${emoji} ${params.membroNome} ${status.toLowerCase()} escala — ${params.eventoNome}`,
            html: `
                <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; background: #0a0a0a; color: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #222;">
                    <div style="background: ${cor}; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; color: #fff;">
                            Escala ${status}
                        </h1>
                    </div>
                    <div style="padding: 24px;">
                        <p style="font-size: 14px; color: #ccc; margin: 0 0 20px;">
                            Ola, <strong style="color: #fff;">${params.liderNome || 'Lider'}</strong>!
                        </p>
                        <div style="background: #111; border: 1px solid #333; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                            <p style="margin: 0 0 8px; font-size: 12px;">
                                <span style="color: ${cor}; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Membro</span><br/>
                                <strong style="font-size: 16px;">${params.membroNome}</strong>
                            </p>
                            <p style="margin: 0 0 8px; font-size: 12px;">
                                <span style="color: #666; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Evento</span><br/>
                                ${params.eventoNome} — ${params.eventoData}
                            </p>
                            <p style="margin: 0 0 ${params.motivo ? '8px' : '0'}; font-size: 12px;">
                                <span style="color: #666; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Funcao</span><br/>
                                ${params.funcao} (${params.departamentoNome})
                            </p>
                            ${params.motivo ? `
                            <p style="margin: 0; font-size: 12px;">
                                <span style="color: #ef4444; font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Motivo da Recusa</span><br/>
                                <em style="color: #a1a1aa;">"${params.motivo}"</em>
                            </p>` : ''}
                        </div>
                        <a href="https://app.igrejaadmvc.org/admin/escalas" target="_blank" style="display: block; background: #1a1a1a; border: 1px solid #333; color: #fff; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                            Ver Escalas no Painel
                        </a>
                    </div>
                    <div style="background: #111; padding: 12px; text-align: center; font-size: 10px; color: #666; border-top: 1px solid #222;">
                        Notificacao automatica — Sistema ADMVC
                    </div>
                </div>
            `
        })
    } catch (err) {
        console.error('Erro ao enviar email de escala:', err)
    }
}
