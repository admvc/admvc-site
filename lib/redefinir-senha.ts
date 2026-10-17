// lib/redefinir-senha.ts
// Links de "definir palavra-passe": assinados (lib/sessao-core.ts), 1 hora,
// e de uso unico — levam a impressao da senha atual, que muda quando a senha
// e definida (e ai o link, e todas as sessoes abertas, deixam de valer).
//
// Fora de actions/ de proposito: envia sem verificar quem pede. Quem chama
// (actions/senha-actions.ts, logins, importacao) decide se pode.

import { assinarSessao, impressaoDaSenha, lerLinkRedefinir } from '@/lib/sessao-core'
import { enviarEmailNovaSenha } from '@/lib/mail'

export const VALIDADE_LINK_SEGUNDOS = 60 * 60

/** Endereco publico do portal. Nunca o Host do pedido (podia ser forjado).
 *  Aceita APP_URL sem "https://" (ja aconteceu no Vercel e os links sairam relativos). */
export function urlDoPortal() {
    const url = (process.env.APP_URL || '').trim().replace(/\/+$/, '')
    if (!url) return 'https://app.igrejaadmvc.org'
    return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export async function criarLinkRedefinir(m: { id: number; password: string | null }) {
    const token = await assinarSessao({
        t: 'r',
        id: m.id,
        pw: await impressaoDaSenha(m.password),
        exp: Math.floor(Date.now() / 1000) + VALIDADE_LINK_SEGUNDOS,
    })
    return `${urlDoPortal()}/membros/nova-senha?t=${encodeURIComponent(token)}`
}

/**
 * O link ainda serve para este membro? (assinatura, validade, e a senha nao
 * mudou desde que foi criado).
 */
export async function linkValidoPara(token: string, m: { id: number; password: string | null }) {
    const p = await lerLinkRedefinir(token)
    return !!p && p.id === m.id && p.pw === (await impressaoDaSenha(m.password))
}

export async function lerIdDoLink(token: string) {
    return (await lerLinkRedefinir(token))?.id ?? null
}

/**
 * Envia o link por email. Em desenvolvimento escreve-o na consola em vez de
 * enviar (para testar sem mandar emails a membros reais).
 */
export async function enviarLinkRedefinir(
    m: { id: number; password: string | null; first_name: string; email: string },
    motivo: 'pedido' | 'senha-conhecida' | 'convite',
) {
    const link = await criarLinkRedefinir(m)
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[NOVA SENHA] (desenvolvimento, nao enviado) membro ${m.id}, motivo ${motivo}: ${link}`)
        return { ok: true }
    }
    return enviarEmailNovaSenha(m.first_name, m.email, link, motivo)
}
