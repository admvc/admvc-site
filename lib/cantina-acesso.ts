// Quem pode fazer banners da cantina: a administração e quem pertence (ou lidera) a equipa da Cantina (lib/equipas.ts).
import { isAdmin, type SessionData } from '@/lib/auth-utils'
import { EQUIPA_CANTINA, pertenceAEquipa } from '@/lib/equipas'

export async function podeFazerBannersCantina(sessao: SessionData): Promise<boolean> {
    return isAdmin(sessao.role) || await pertenceAEquipa(sessao.membroId, EQUIPA_CANTINA)
}
