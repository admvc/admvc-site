// Aniversariantes do mes. So aparece quando ha alguem (pedido do dono).
import { Cake } from 'lucide-react'
import type { Aniversariante } from '@/lib/inicio-app'
import { Avatar } from './Avatares'

export default function Aniversariantes({ lista }: { lista: Aniversariante[] }) {
    if (lista.length === 0) return null
    const mes = new Date().toLocaleDateString('pt-PT', { month: 'long' })
    return (
        <section className="a-card p-4 space-y-3" aria-labelledby="aniversarios">
            <h2 id="aniversarios" className="flex items-center gap-2 text-[19px] font-bold">
                <Cake size={20} aria-hidden /> Aniversários de {mes}
            </h2>
            <ul className="a-divide">
                {lista.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 py-2.5">
                        <Avatar pessoa={a} tamanho={40} />
                        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">{a.nome}</span>
                        <span className="shrink-0 text-[15px] font-semibold" style={{ color: a.hoje ? 'var(--a-destaque)' : 'var(--a-suave)' }}>
                            {a.hoje ? 'Hoje! 🎉' : `dia ${a.dia}`}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    )
}
