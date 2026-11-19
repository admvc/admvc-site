'use client'

// Campo "Preletor" das artes: texto livre com procura nos membros ativos da igreja (2+ letras).
// Tocar num membro põe "Pr. Nome" (continua editável); sem resultados, "Usar «texto» (visitante)" mantém o que foi escrito.
// O valor é sempre o texto (como antes): vazio = "ainda não sei".
import { useEffect, useRef, useState } from 'react'
import { procurarPreletor } from '@/app/midia/divulgacao/actions'
import { normalizar, textoDoPreletor, type SugestaoPreletor } from '@/lib/preletor'

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

/** Tira o título do princípio ("Pr. José" → "José") para a procura. */
const semTitulo = (s: string) => s.replace(/^\s*(pr|pra|ev|pb|dc)\.?\s+/i, '')

export default function CampoPreletor({ id, value, onChange, placeholder, maxLength = 60, disabled }: {
    id: string; value: string; onChange: (texto: string) => void; placeholder?: string; maxLength?: number; disabled?: boolean
}) {
    const [aberto, setAberto] = useState(false)
    const [opcoes, setOpcoes] = useState<SugestaoPreletor[]>([])
    const [pronto, setPronto] = useState(false)       // a procura do texto atual já terminou
    const [ativo, setAtivo] = useState(-1)
    const pedido = useRef(0)
    const espera = useRef<ReturnType<typeof setTimeout> | null>(null)
    const caixa = useRef<HTMLDivElement>(null)
    const lista = `${id}-lista`

    useEffect(() => () => { if (espera.current) clearTimeout(espera.current) }, [])
    useEffect(() => {
        function fora(e: MouseEvent | TouchEvent) { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false) }
        document.addEventListener('mousedown', fora); document.addEventListener('touchstart', fora)
        return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('touchstart', fora) }
    }, [])

    function escrever(texto: string) {
        onChange(texto)
        if (espera.current) clearTimeout(espera.current)
        const q = semTitulo(texto).trim()
        const n = ++pedido.current
        setAtivo(-1)
        if (normalizar(q).length < 2) { setAberto(false); setOpcoes([]); setPronto(false); return }
        setAberto(true); setPronto(false)
        espera.current = setTimeout(async () => {
            let r: SugestaoPreletor[] = []
            try { r = await procurarPreletor(q) } catch { /* sem rede: fica o texto escrito */ }
            if (n !== pedido.current) return
            setOpcoes(r); setPronto(true)
        }, 250)
    }

    // Opções: os membros e, no fim, "Usar «texto» (visitante)" quando não há ninguém
    const textoLivre = value.trim()
    const mostrarVisitante = pronto && opcoes.length === 0 && textoLivre.length >= 2
    const total = opcoes.length + (mostrarVisitante ? 1 : 0)

    function escolher(i: number) {
        pedido.current++
        if (i < opcoes.length) onChange(textoDoPreletor(opcoes[i]).slice(0, maxLength))
        setAberto(false); setAtivo(-1)
    }

    function tecla(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Escape') { if (aberto) { e.preventDefault(); setAberto(false) } return }
        if (!aberto || total === 0) return
        if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => (a + 1) % total) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => (a <= 0 ? total - 1 : a - 1)) }
        else if (e.key === 'Enter' && ativo >= 0) { e.preventDefault(); escolher(ativo) }
    }

    const mostrar = aberto && !disabled && (!pronto || total > 0)
    const item = 'flex min-h-[44px] w-full cursor-pointer items-center px-3 py-2 text-left text-[16px]'

    return (
        <div ref={caixa} className="w-full">
            <input id={id} value={value} maxLength={maxLength} disabled={disabled} placeholder={placeholder} autoComplete="off"
                role="combobox" aria-expanded={mostrar} aria-controls={lista} aria-autocomplete="list" aria-activedescendant={mostrar && ativo >= 0 ? `${id}-op-${ativo}` : undefined}
                onChange={(e) => escrever(e.target.value)} onKeyDown={tecla}
                onFocus={() => { if (pronto && total > 0) setAberto(true) }}
                className={campo} style={estiloCampo} />
            {mostrar && (
                <div id={lista} role="listbox" aria-label="Membros"
                    className="mt-1 max-h-[300px] overflow-y-auto rounded-[14px] border shadow-lg"
                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                    {!pronto && <p className="px-3 py-3 text-[15px] a-suave" role="status">A procurar…</p>}
                    {pronto && opcoes.map((o, i) => (
                        <div key={`${o.nome}-${i}`} id={`${id}-op-${i}`} role="option" aria-selected={ativo === i} className={item}
                            style={{ background: ativo === i ? 'var(--a-borda)' : undefined }}
                            onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(i)}>
                            <span>{o.titulo ? <span className="a-suave">{o.titulo} </span> : null}<span className="font-semibold">{o.nome}</span></span>
                        </div>
                    ))}
                    {mostrarVisitante && (
                        <div id={`${id}-op-${opcoes.length}`} role="option" aria-selected={ativo === opcoes.length} className={item}
                            style={{ background: ativo === opcoes.length ? 'var(--a-borda)' : undefined }}
                            onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(opcoes.length)}>
                            Usar «{textoLivre}» (visitante)
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
