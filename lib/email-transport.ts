// lib/email-transport.ts
// Transporte de email unificado: Resend ou Gmail SMTP.
//
// Configuração (variáveis de ambiente):
//   EMAIL_PROVIDER=resend     → usa Resend (precisa de RESEND_API_KEY + domínio verificado)
//   EMAIL_PROVIDER=gmail      → usa Gmail SMTP (precisa de GMAIL_USER + GMAIL_APP_PASSWORD)
//   EMAIL_PROVIDER=           → (vazio/omitido) tenta Resend se tiver chave, senão Gmail
//
// Gmail: ativar 2FA na conta Google e criar App Password em
//   https://myaccount.google.com/apppasswords

import type { Transporter } from 'nodemailer'

interface EmailOpts {
    from: string
    to: string | string[]
    subject: string
    html: string
}

type Resultado = { ok: true; error?: undefined } | { ok: false; error: string }

function provider(): 'resend' | 'gmail' | null {
    const p = (process.env.EMAIL_PROVIDER || '').toLowerCase().trim()
    if (p === 'resend') return 'resend'
    if (p === 'gmail' || p === 'smtp') return 'gmail'
    if (process.env.RESEND_API_KEY) return 'resend'
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return 'gmail'
    return null
}

async function enviarResend(opts: EmailOpts): Promise<Resultado> {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
        from: opts.from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        html: opts.html,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
}

let _transport: Transporter | null = null

async function gmailTransport() {
    if (!_transport) {
        const nm = (await import('nodemailer')).default
        _transport = nm.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        })
    }
    return _transport
}

async function enviarGmail(opts: EmailOpts): Promise<Resultado> {
    const user = process.env.GMAIL_USER
    if (!user || !process.env.GMAIL_APP_PASSWORD) {
        return { ok: false, error: 'GMAIL_USER ou GMAIL_APP_PASSWORD não configurados.' }
    }
    // O Gmail ignora o "from" do envelope e usa a conta autenticada.
    // Mas guardamos o nome para aparecer como display name.
    const nomeMatch = opts.from.match(/^(.+?)\s*</)
    const displayName = nomeMatch ? nomeMatch[1].trim() : 'Igreja ADMVC'
    const from = `${displayName} <${user}>`
    const transport = await gmailTransport()

    await transport.sendMail({
        from,
        to: Array.isArray(opts.to) ? opts.to.join(', ') : opts.to,
        subject: opts.subject,
        html: opts.html,
    })
    return { ok: true }
}

export async function enviarEmail(opts: EmailOpts): Promise<Resultado> {
    const p = provider()
    if (!p) {
        console.warn('[EMAIL] Nenhum provider configurado (EMAIL_PROVIDER, RESEND_API_KEY ou GMAIL_USER/GMAIL_APP_PASSWORD)')
        return { ok: false, error: 'Email não configurado.' }
    }
    try {
        const r = p === 'resend' ? await enviarResend(opts) : await enviarGmail(opts)
        if (!r.ok) console.error(`[EMAIL] Erro (${p}):`, r.error)
        return r
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[EMAIL] Erro (${p}):`, msg)
        return { ok: false, error: msg }
    }
}

export function emailConfigurado(): boolean {
    return provider() !== null
}
