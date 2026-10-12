// lib/sessao-core.ts
// Assinatura das sessoes (HMAC-SHA256 com Web Crypto). Sem dependencias de
// Node nem de next/headers: corre no middleware (edge) e no servidor.
//
// Cookie = base64url(JSON) + "." + base64url(assinatura).
// O conteudo NAO e secreto (qualquer um o le), mas ninguem o altera sem o
// SESSION_SECRET. O papel e a igreja que la vao servem so para o middleware
// encaminhar; o servidor volta a confirmar tudo na base (lib/auth-utils.ts).

export const COOKIE_MEMBRO = 'admvc_session'
export const COOKIE_SA = 'admvc_sa_session'

export interface PayloadMembro {
    t: 'm'
    id: number
    tid: number
    role: string
    plano: string
    cong?: number
    /** Impressao digital da senha: mudar a senha invalida as sessoes. */
    pw: string
    /** Validade em segundos desde 1970. */
    exp: number
}

export interface PayloadSA {
    t: 'sa'
    sa: number
    pw: string
    exp: number
}

/** Link de "definir palavra-passe" (1 hora). Nunca vale como sessao. */
export interface PayloadRedefinir {
    t: 'r'
    id: number
    pw: string
    exp: number
}

export type Payload = PayloadMembro | PayloadSA

const enc = new TextEncoder()
const dec = new TextDecoder()

function paraBase64url(bytes: Uint8Array): string {
    let bin = ''
    for (const b of bytes) bin += String.fromCharCode(b)
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64url(texto: string): Uint8Array {
    const b64 = texto.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texto.length % 4)) % 4)
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
}

export function segredoDaSessao(): string {
    const s = process.env.SESSION_SECRET
    if (!s || s.length < 32) {
        throw new Error('SESSION_SECRET em falta ou curto (minimo 32 caracteres). Configure-o nas variaveis de ambiente.')
    }
    return s
}

async function chave(segredo: string) {
    return crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function assinarSessao(payload: Payload | PayloadRedefinir, segredo = segredoDaSessao()): Promise<string> {
    const corpo = paraBase64url(enc.encode(JSON.stringify(payload)))
    const assinatura = await crypto.subtle.sign('HMAC', await chave(segredo), enc.encode(corpo))
    return `${corpo}.${paraBase64url(new Uint8Array(assinatura))}`
}

async function verificar(valor: string | undefined | null, tipos: string[], segredo?: string): Promise<any | null> {
    if (!valor) return null
    let s: string
    try {
        s = segredo ?? segredoDaSessao()
    } catch {
        return null
    }
    const partes = valor.split('.')
    if (partes.length !== 2) return null
    try {
        const ok = await crypto.subtle.verify('HMAC', await chave(s), deBase64url(partes[1]) as BufferSource, enc.encode(partes[0]))
        if (!ok) return null
        const payload = JSON.parse(dec.decode(deBase64url(partes[0])))
        if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
        if (!tipos.includes(payload.t)) return null
        return payload
    } catch {
        return null
    }
}

/**
 * Devolve o conteudo da sessao se a assinatura e a validade estiverem certas;
 * senao null. Sem segredo configurado, nenhuma sessao e valida.
 * Um link de redefinicao de senha nunca passa aqui.
 */
export async function lerSessao(valor: string | undefined | null, segredo?: string): Promise<Payload | null> {
    return verificar(valor, ['m', 'sa'], segredo)
}

/** Le um link de redefinicao de senha (e so isso: uma sessao nao serve). */
export async function lerLinkRedefinir(valor: string | undefined | null, segredo?: string): Promise<PayloadRedefinir | null> {
    return verificar(valor, ['r'], segredo)
}

/** Primeiros 16 caracteres do SHA-256 do hash bcrypt guardado. */
export async function impressaoDaSenha(hash: string | null | undefined): Promise<string> {
    const d = await crypto.subtle.digest('SHA-256', enc.encode(hash ?? ''))
    return paraBase64url(new Uint8Array(d)).slice(0, 16)
}
