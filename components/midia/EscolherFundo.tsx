'use client'

// Seletor rápido de fundos do banco de fundos da Mídia (/midia/fundos). Grelha de miniaturas por categoria + pesquisa pelo nome.
// Busca os fundos sozinho em GET /api/fundos (só Mídia/administração).
//
// Props:
//   categoria?  'MULHERES' | 'JOVENS' | 'HOMENS' | 'FAMILIA' | 'LOUVOR' | 'ADMVC'  separador aberto à partida (ex.: a do culto)
//   valor?      number | null   id do fundo atualmente escolhido (fica destacado)
//   onEscolher  (f: { id: number; url: string; nome: string }) => void   chamado ao tocar numa miniatura
//   fundos?     Fundo[]         opcional: lista já carregada (poupa o pedido)
//   className?  string          classes extra no contentor
//
// Pesquisa: ao escrever, procura em TODAS as categorias; vazia, mostra só o separador escolhido.
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, Search } from 'lucide-react'
import { CATEGORIAS_FUNDO, textoDaCategoria, type CategoriaFundo, type Fundo } from '@/lib/fundos'

export type FundoEscolhido = { id: number; url: string; nome: string }

type Props = {
    categoria?: CategoriaFundo
    valor?: number | null
    onEscolher: (f: FundoEscolhido) => void
    fundos?: Fundo[]
    className?: string
}

export default function EscolherFundo({ categoria, valor = null, onEscolher, fundos: fundosDados, className = '' }: Props) {
    const [fundos, setFundos] = useState<Fundo[] | null>(fundosDados ?? null)
    const [erro, setErro] = useState<string | null>(null)
    const [cat, setCat] = useState<CategoriaFundo>(categoria ?? 'ADMVC')
    const [busca, setBusca] = useState('')

    useEffect(() => { if (categoria) setCat(categoria) }, [categoria])
    useEffect(() => { if (fundosDados) setFundos(fundosDados) }, [fundosDados])
    useEffect(() => {
        if (fundosDados) return
        let vivo = true
        fetch('/api/fundos').then(async (r) => {
            const j = await r.json().catch(() => ({}))
            if (!vivo) return
            if (!r.ok) setErro(j.error ?? 'Não foi possível carregar os fundos.')
            else setFundos(j.fundos ?? [])
        }).catch(() => { if (vivo) setErro('Não foi possível carregar os fundos.') })
        return () => { vivo = false }
    }, [fundosDados])

    const contagem = useMemo(() => {
        const m = new Map<string, number>()
        for (const f of fundos ?? []) m.set(f.categoria, (m.get(f.categoria) ?? 0) + 1)
        return m
    }, [fundos])

    const termo = busca.trim().toLowerCase()
    const visiveis = (fundos ?? []).filter((f) => termo ? f.nome.toLowerCase().includes(termo) : f.categoria === cat)

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categorias de fundos">
                {CATEGORIAS_FUNDO.map((c) => (
                    <button key={c.id} type="button" role="tab" aria-selected={!termo && cat === c.id} onClick={() => { setCat(c.id); setBusca('') }}
                        className="min-h-[40px] rounded-full px-3 text-[14px] font-semibold"
                        style={!termo && cat === c.id ? { background: 'var(--a-destaque)', color: '#fff' } : { background: 'var(--a-borda)' }}>
                        {c.texto} <span className="opacity-70">{contagem.get(c.id) ?? 0}</span>
                    </button>
                ))}
            </div>

            <label className="relative block">
                <span className="sr-only">Pesquisar fundos pelo nome</span>
                <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar pelo nome"
                    className="a-input w-full !pl-9" style={{ minHeight: 44 }} />
            </label>

            {erro && <p role="alert" className="text-[14px] font-semibold" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}
            {!erro && fundos === null && <p className="text-[14px] a-suave">A carregar…</p>}
            {fundos && visiveis.length === 0 && (
                <p className="text-[14px] a-suave">
                    {termo ? 'Nenhum fundo com esse nome.' : `Ainda não há fundos em ${textoDaCategoria(cat)}.`}{' '}
                    <Link href="/midia/fundos" className="underline" target="_blank">Juntar fundos</Link>
                </p>
            )}
            {visiveis.length > 0 && (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {visiveis.map((f) => {
                        const escolhido = f.id === valor
                        return (
                            <li key={f.id}>
                                <button type="button" onClick={() => onEscolher({ id: f.id, url: f.url, nome: f.nome })} aria-pressed={escolhido}
                                    className="relative block w-full overflow-hidden rounded-[12px] text-left"
                                    style={{ outline: escolhido ? '3px solid var(--a-destaque)' : '1px solid var(--a-borda)' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={f.url} alt={f.nome} loading="lazy" className="aspect-video w-full object-cover" />
                                    <span className="block truncate px-2 py-1.5 text-[13px] font-semibold">{f.nome}</span>
                                    {escolhido && <span className="absolute right-1.5 top-1.5 rounded-full p-1" style={{ background: 'var(--a-destaque)', color: '#fff' }}><Check size={14} aria-hidden /></span>}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
