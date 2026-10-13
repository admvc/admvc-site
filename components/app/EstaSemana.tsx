// Os cultos e eventos dos proximos 7 dias (coluna da direita no computador).
import Link from 'next/link'
import { CalendarDays, ChevronRight } from 'lucide-react'
import type { CultoDaSemana } from '@/lib/inicio-app'
import { diaCurto, hora } from './datas'

export default function EstaSemana({ cultos }: { cultos: CultoDaSemana[] }) {
    return (
        <section className="a-card p-4 space-y-2" aria-labelledby="semana">
            <h2 id="semana" className="flex items-center gap-2 text-[19px] font-bold">
                <CalendarDays size={20} aria-hidden /> Esta semana
            </h2>
            {cultos.length === 0 ? (
                <p className="text-[16px] a-suave">Não há cultos nos próximos 7 dias.</p>
            ) : (
                <ul className="a-divide">
                    {cultos.map((c) => (
                        <li key={c.id} className="py-2.5">
                            <span className="block text-[16px] font-semibold">{c.nome}</span>
                            <span className="block text-[15px] a-suave">{diaCurto(c.data)} · {hora(c.data)}</span>
                        </li>
                    ))}
                </ul>
            )}
            <Link href="/membros/agenda" className="a-foco flex min-h-[44px] items-center justify-between border-t pt-2 text-[16px] font-semibold"
                style={{ borderColor: 'var(--a-borda)', color: 'var(--a-destaque)' }}>
                Ver a agenda <ChevronRight size={20} aria-hidden />
            </Link>
        </section>
    )
}
