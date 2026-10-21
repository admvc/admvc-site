// Os cultos e eventos dos proximos 7 dias (coluna da direita no computador). O atalho da agenda e um botao pequeno
// ao lado do titulo (sem linha propria no fundo do cartao).
import Link from 'next/link'
import { CalendarDays, ChevronRight } from 'lucide-react'
import type { CultoDaSemana } from '@/lib/inicio-app'
import { diaCurto, hora } from './datas'

export default function EstaSemana({ cultos }: { cultos: CultoDaSemana[] }) {
    return (
        <section className="a-card p-4 space-y-2" aria-labelledby="semana">
            <div className="flex items-center justify-between gap-2">
                <h2 id="semana" className="flex items-center gap-2 text-[19px] font-bold">
                    <CalendarDays size={20} aria-hidden /> Esta semana
                </h2>
                <Link href="/membros/agenda" className="a-foco inline-flex min-h-[40px] shrink-0 items-center gap-0.5 rounded-full pl-3 pr-2 text-[14px] font-semibold"
                    style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                    Agenda <ChevronRight size={16} aria-hidden />
                </Link>
            </div>
            {cultos.length === 0 ? (
                <p className="text-[16px] a-suave">Não há cultos nos próximos 7 dias.</p>
            ) : (
                <ul className="a-divide">
                    {cultos.map((c) => (
                        <li key={c.id} className="py-2.5">
                            <span className="block text-[16px] font-semibold">{c.nome}</span>
                            <span className="block text-[15px] a-suave">{diaCurto(c.data)} · {hora(c.data)}</span>
                            {c.direcionado?.meu && <span className="block text-[14px] font-semibold" style={{ color: 'var(--a-destaque)' }}>o teu grupo</span>}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
