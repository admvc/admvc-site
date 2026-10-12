// lib/senhas.ts
// Regras para senhas novas e a lista de senhas conhecidas (as que o sistema
// antigo punha por omissao, e as mais usadas). Uma conta com uma senha
// conhecida nao entra: recebe um link para definir uma nova.

import bcrypt from 'bcryptjs'

export const SENHA_MINIMO = 10

/** Senhas que o sistema antigo dava a contas novas, ou demasiado comuns. */
const CONHECIDAS = [
    'admvc123', 'admin123', 'superadmin123',
    '12345678', '123456789', '1234567890', 'password', 'password1', 'qwerty123',
    'senha123', 'senha1234', 'igreja123', 'jesus123', 'deusefiel',
]

function normalizar(s: string) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Devolve o motivo da recusa, ou null se a senha serve. */
export function validarSenhaNova(senha: string, email?: string | null): string | null {
    const s = senha ?? ''
    if (s.length < SENHA_MINIMO) return `A palavra-passe tem de ter pelo menos ${SENHA_MINIMO} caracteres.`
    const n = normalizar(s)
    if (CONHECIDAS.includes(n) || /^(.)\1+$/.test(n)) return 'Essa palavra-passe é demasiado fácil de adivinhar. Escolha outra.'
    const local = normalizar(email?.split('@')[0] ?? '')
    if (local.length >= 4 && n.includes(local)) return 'A palavra-passe não pode conter o seu email.'
    return null
}

/**
 * Antigas senhas temporarias da conversao de visitante em membro:
 * 4 primeiras letras do nome + "2024!".
 */
function senhaTemporariaAntiga(primeiroNome: string) {
    return (primeiroNome.trim().split(' ')[0] || 'Membro').slice(0, 4).toLowerCase().concat('2024!')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/**
 * A senha que a pessoa escreveu (ja confirmada como certa) e uma das conhecidas?
 * Compara o texto, sem voltar a calcular bcrypt.
 */
export function eSenhaConhecida(senhaEscrita: string, primeiroNome?: string | null): boolean {
    const n = normalizar(senhaEscrita)
    if (CONHECIDAS.includes(n)) return true
    return !!primeiroNome && senhaEscrita === senhaTemporariaAntiga(primeiroNome)
}

/** Hash para guardar (bcrypt, custo 10 como o resto do sistema). */
export function cifrarSenha(senha: string) {
    return bcrypt.hash(senha, 10)
}
