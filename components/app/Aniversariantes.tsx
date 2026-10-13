// Aniversariantes do mes. So aparece quando ha alguem (pedido do dono).
// Mostra os 2 primeiros (hoje e os proximos); o resto abre em "Ver todos".
import { Cake, ChevronDown } from 'lucide-react'
import type { Aniversariante } from '@/lib/inicio-app'
import { Avatar } from './Avatares'

const VISIVEIS = 2

function Linha({ a }: { a: Aniversariante }) {
    return (
        <li className="flex items-center gap-3 py-2.5">
            <Avatar pessoa={a} tamanho={40} />
            <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{a.nome}</span>
            <span className="shrink-0 text-[15px] font-semibold" style={{ color: a.hoje ? 'var(--a-destaque)' : 'var(--a-suave)' }}>
                {a.hoje ? 'Hoje! 🎉' : `dia ${a.dia}`}
            </span>
        </li>
    )
}

export default function Aniversariantes({ lista }: { lista: Aniversariante[] }) {
    if (lista.length === 0) return null
    const mes = new Date().toLocaleDateString('pt-PT', { month: 'long' })
    const primeiros = lista.slice(0, VISIVEIS)
    const resto = lista.slice(VISIVEIS)
    return (
        <section className="a-card p-4 space-y-3" aria-labelledby="aniversarios">
            <h2 id="aniversarios" className="flex items-center gap-2 text-[19px] font-bold">
                <Cake size={20} aria-hidden /> Aniversários de {mes}
            </h2>
            <ul className="a-divide">
                {primeiros.map((a) => <Linha key={a.id} a={a} />)}
            </ul>
            {resto.length > 0 && (
                <details className="group">
                    <summary className="a-foco flex min-h-[44px] cursor-pointer list-none items-center justify-between border-t pt-2 text-[16px] font-semibold"
                        style={{ borderColor: 'var(--a-borda)', color: 'var(--a-destaque)' }}>
                        <span className="group-open:hidden">Ver todos ({lista.length})</span>
                        <span className="hidden group-open:inline">Mostrar menos</span>
                        <ChevronDown size={20} className="transition-transform group-open:rotate-180" aria-hidden />
                    </summary>
                    <ul className="a-divide">
                        {resto.map((a) => <Linha key={a.id} a={a} />)}
                    </ul>
                </details>
            )}
        </section>
    )
}
