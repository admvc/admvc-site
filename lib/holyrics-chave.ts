// Chave do módulo Holyrics ("Trazer as artes do culto"): gera-se no portal, mostra-se UMA vez e só o SHA-256 fica guardado.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const gerarChave = () => randomBytes(18).toString('base64url')   // 24 caracteres
export const hashDaChave = (chave: string) => createHash('sha256').update(chave).digest('hex')

/** Compara a chave recebida com o hash guardado, em tempo constante. */
export function chaveCerta(chave: string | null, hashGuardado: string | null | undefined): boolean {
    if (!chave || !hashGuardado || chave.length > 100) return false
    const a = Buffer.from(hashDaChave(chave), 'hex'), b = Buffer.from(hashGuardado, 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
}
