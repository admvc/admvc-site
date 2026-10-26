// Assinatura do endereço /oferta (só no servidor). Sem ela, qualquer pessoa podia fazer um link
// app.igrejaadmvc.org/oferta?i=<outro IBAN> com o nome da igreja e mandá-lo aos membros.
// A assinatura cobre os valores tal como vão no endereço (i, t, m).
import { createHmac, timingSafeEqual } from 'node:crypto'
import { segredoDaSessao } from '@/lib/sessao-core'

const calcular = (i: string, t: string, m: string) =>
    createHmac('sha256', segredoDaSessao()).update(`oferta\n${i}\n${t}\n${m}`).digest('base64url').slice(0, 22)

/** Junta "s=" a um endereço /oferta feito por enderecoOferta(). */
export function assinarEnderecoOferta(endereco: string): string {
    const u = new URL(endereco)
    const q = u.searchParams
    q.set('s', calcular(q.get('i') ?? '', q.get('t') ?? '', q.get('m') ?? ''))
    return u.toString()
}

export function ofertaAssinada(i: string, t: string, m: string, s: string | undefined): boolean {
    if (!s) return false
    const a = Buffer.from(calcular(i, t, m))
    const b = Buffer.from(s)
    return a.length === b.length && timingSafeEqual(a, b)
}
