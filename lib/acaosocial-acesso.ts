// Quem pode fazer a arte da Assistência Social para o telão: a administração e quem pertence (ou lidera) a equipa social.
import { isAdmin, type SessionData } from '@/lib/auth-utils'
import { EQUIPA_SOCIAL, pertenceAEquipa } from '@/lib/equipas'

export async function podeFazerArteSocial(sessao: SessionData): Promise<boolean> {
    return isAdmin(sessao.role) || await pertenceAEquipa(sessao.membroId, EQUIPA_SOCIAL)
}
