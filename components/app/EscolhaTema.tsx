'use client'

// Claro / Escuro / Automático (segue o telemóvel). Guarda-se só neste aparelho (localStorage) e
// põe `data-modo` no <html>; o script do layout aplica-o antes de desenhar, para não piscar.
import { useEffect, useState } from 'react'
import { Moon, Smartphone, Sun } from 'lucide-react'

type Modo = 'auto' | 'claro' | 'escuro'
const OPCOES: { valor: Modo; texto: string; Icone: typeof Sun }[] = [
    { valor: 'auto', texto: 'Automático', Icone: Smartphone },
    { valor: 'claro', texto: 'Claro', Icone: Sun },
    { valor: 'escuro', texto: 'Escuro', Icone: Moon },
]

function aplicar(modo: Modo) {
    const html = document.documentElement
    if (modo === 'auto') html.removeAttribute('data-modo')
    else html.setAttribute('data-modo', modo)
    try {
        if (modo === 'auto') localStorage.removeItem('modo')
        else localStorage.setItem('modo', modo)
    } catch { /* sem armazenamento: só nesta visita */ }
}

export default function EscolhaTema() {
    const [modo, setModo] = useState<Modo>('auto')
    useEffect(() => {
        const m = document.documentElement.getAttribute('data-modo')
        setModo(m === 'claro' || m === 'escuro' ? m : 'auto')
    }, [])
    function escolher(m: Modo) { setModo(m); aplicar(m) }

    return (
        <div className="a-card space-y-2 px-4 py-3" role="radiogroup" aria-label="Aparência">
            <p className="text-[17px] font-semibold">Aparência</p>
            <div className="grid grid-cols-3 gap-2">
                {OPCOES.map(({ valor, texto, Icone }) => {
                    const sim = modo === valor
                    return (
                        <button key={valor} type="button" role="radio" aria-checked={sim} onClick={() => escolher(valor)}
                            className="a-foco flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[12px] text-[14px] font-semibold"
                            style={sim ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' } : { background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                            <Icone size={20} aria-hidden />
                            {texto}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

/** Versão para o menu lateral do computador: um botão que roda Automático → Claro → Escuro. */
export function EscolhaTemaMenu({ className }: { className: string }) {
    const [modo, setModo] = useState<Modo>('auto')
    useEffect(() => {
        const m = document.documentElement.getAttribute('data-modo')
        setModo(m === 'claro' || m === 'escuro' ? m : 'auto')
    }, [])
    const atual = OPCOES.find((o) => o.valor === modo)!
    function seguinte() {
        const novo = OPCOES[(OPCOES.findIndex((o) => o.valor === modo) + 1) % OPCOES.length].valor
        setModo(novo); aplicar(novo)
    }
    return (
        <button type="button" onClick={seguinte} title={`Aparência: ${atual.texto} (tocar para mudar)`} className={className}>
            <atual.Icone size={22} strokeWidth={1.8} aria-hidden className="shrink-0" />
            <span className="md:sr-only lg:not-sr-only">Aparência: {atual.texto}</span>
        </button>
    )
}
