// "A minha equipa: Louvor" — proximos cultos e como esta a escala de cada um.
import Link from 'next/link'
import { ChevronRight, Users } from 'lucide-react'
import type { CultoDaEquipa, EquipaQueGiro } from '@/lib/escalas-app'
import { diaCurto, hora } from './datas'

function resumo(c: CultoDaEquipa) {
    if (c.funcoesTotal === 0) return { texto: 'Sem funções definidas', cor: 'var(--a-suave)' }
    if (c.funcoesPreenchidas === 0) return { texto: 'Por fazer', cor: 'var(--a-aviso)' }
    const base = `${c.funcoesPreenchidas} de ${c.funcoesTotal} funções`
    if (c.naoPodem > 0) return { texto: `${base} · ${c.naoPodem} não pode${c.naoPodem > 1 ? 'm' : ''}`, cor: 'var(--a-erro)' }
    if (c.funcoesPreenchidas < c.funcoesTotal) return { texto: base, cor: 'var(--a-aviso)' }
    if (c.porConfirmar > 0) return { texto: `Completa · ${c.porConfirmar} por confirmar`, cor: 'var(--a-aviso)' }
    return { texto: 'Completa e confirmada', cor: 'var(--a-ok)' }
}

export default function MinhaEquipa({ equipa, cultos }: { equipa: EquipaQueGiro; cultos: CultoDaEquipa[] }) {
    return (
        <section className="space-y-3" aria-labelledby={`equipa-${equipa.id}`}>
            <h2 id={`equipa-${equipa.id}`} className="flex items-center gap-2 text-[19px] font-bold">
                <Users size={22} aria-hidden /> A minha equipa: {equipa.nome}
            </h2>
            {cultos.length === 0 ? (
                <p className="a-card p-4 text-[16px] a-suave">Não há cultos marcados nas próximas semanas.</p>
            ) : (
                <ul className="a-card divide-y" style={{ borderColor: 'var(--a-borda)' }}>
                    {cultos.map((c) => {
                        const r = resumo(c)
                        return (
                            <li key={c.id} style={{ borderColor: 'var(--a-borda)' }}>
                                <Link href={`/escalas/culto/${c.id}?equipa=${equipa.id}`} className="a-foco flex min-h-[64px] items-center gap-3 px-4 py-3">
                                    <span className="flex-1">
                                        <span className="block text-[16px] font-semibold">{diaCurto(c.data)} · {hora(c.data)}</span>
                                        <span className="block text-[15px] a-suave">{c.nome}</span>
                                        <span className="block text-[14px] font-semibold" style={{ color: r.cor }}>{r.texto}</span>
                                    </span>
                                    <ChevronRight size={22} className="a-suave" aria-hidden />
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            )}
        </section>
    )
}
