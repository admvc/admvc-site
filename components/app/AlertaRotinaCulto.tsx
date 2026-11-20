// Cartão do Início para quem cuida do telão: as artes do culto de hoje/amanhã estão por publicar ou por postar nas redes.
import Link from 'next/link'
import { ChevronRight, Send } from 'lucide-react'
import type { CartaoRotina } from '@/lib/rotina-alertas'
import { hora } from './datas'

export default function AlertaRotinaCulto({ cartoes }: { cartoes: CartaoRotina[] }) {
    if (cartoes.length === 0) return null
    return (
        <>
            {cartoes.map((c) => (
                <Link key={c.eventoId} href={c.alerta.url} className="a-card a-foco flex min-h-[64px] items-center gap-3 p-4" style={{ borderColor: 'var(--a-aviso)', background: 'var(--a-aviso-suave)' }}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ color: 'var(--a-aviso)' }} aria-hidden><Send size={22} /></span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-semibold">{c.alerta.titulo}</span>
                        <span className="block truncate text-[14px] a-suave">{c.nome} · {c.quando === 'hoje' ? 'hoje' : 'amanhã'}, {hora(c.data)}</span>
                    </span>
                    <ChevronRight size={22} className="shrink-0 a-suave" aria-hidden />
                </Link>
            ))}
        </>
    )
}
