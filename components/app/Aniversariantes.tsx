'use client'

// Aniversariantes do mes. So aparece quando ha alguem (pedido do dono).
// Mostra os 2 primeiros (hoje e os proximos); o resto abre no botao pequeno ao lado do titulo ("Todos (N)").
import { useEffect, useState } from 'react'
import { Cake, X } from 'lucide-react'
import type { Aniversariante } from '@/lib/inicio-app'
import { Avatar } from './Avatares'

const VISIVEIS = 2
const CHAVE = 'cartao:aniversariantes'
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())

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
    const [todos, setTodos] = useState(false)
    const [fechado, setFechado] = useState(false)
    // Fechado só neste aparelho e só até amanhã
    useEffect(() => {
        try { setFechado(localStorage.getItem(CHAVE) === hoje()) } catch { /* sem armazenamento: aparece */ }
    }, [])
    function fechar() {
        setFechado(true)
        try { localStorage.setItem(CHAVE, hoje()) } catch { /* só nesta visita */ }
    }
    if (lista.length === 0 || fechado) return null
    const mes = new Date().toLocaleDateString('pt-PT', { month: 'long' })
    const visiveis = todos ? lista : lista.slice(0, VISIVEIS)
    return (
        <section className="a-card p-4 space-y-2" aria-labelledby="aniversarios">
            <div className="flex items-center justify-between gap-2">
                <h2 id="aniversarios" className="flex min-w-0 items-center gap-2 text-[19px] font-bold">
                    <Cake size={20} className="shrink-0" aria-hidden /> <span className="truncate">Aniversários de {mes}</span>
                </h2>
                <div className="flex shrink-0 items-center gap-1">
                    {lista.length > VISIVEIS && (
                        <button type="button" onClick={() => setTodos((v) => !v)} aria-expanded={todos}
                            className="a-foco inline-flex min-h-[40px] shrink-0 items-center rounded-full px-3 text-[14px] font-semibold"
                            style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                            {todos ? 'Menos' : `Todos (${lista.length})`}
                        </button>
                    )}
                    <button type="button" onClick={fechar} className="a-foco flex h-10 w-10 items-center justify-center rounded-full a-suave" aria-label="Fechar os aniversários até amanhã">
                        <X size={18} aria-hidden />
                    </button>
                </div>
            </div>
            <ul className="a-divide">
                {visiveis.map((a) => <Linha key={a.id} a={a} />)}
            </ul>
        </section>
    )
}
