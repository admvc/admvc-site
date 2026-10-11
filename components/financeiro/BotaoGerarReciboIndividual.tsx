'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, Search, UserPlus, CheckCircle2 } from 'lucide-react'
import { buscarMembrosParaRecibo, gerarReciboAnual } from '@/actions/recibo-actions'

interface MembroBusca {
    id: number
    first_name: string
    last_name: string
    tax_id: string | null
}

export default function BotaoGerarReciboIndividual({ ano }: { ano: number }) {
    const [query, setQuery] = useState('')
    const [membros, setMembros] = useState<MembroBusca[]>([])
    const [membroSelecionado, setMembroSelecionado] = useState<MembroBusca | null>(null)
    const [buscando, setBuscando] = useState(false)
    const [gerando, setGerando] = useState(false)
    const [resultado, setResultado] = useState<{ success?: boolean; error?: string; recibo?: any } | null>(null)
    const [aberto, setAberto] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (query.length < 2) {
            setMembros([])
            setAberto(false)
            return
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(async () => {
            setBuscando(true)
            const res = await buscarMembrosParaRecibo(query)
            if (res.success) {
                setMembros(res.membros)
                setAberto(res.membros.length > 0)
            }
            setBuscando(false)
        }, 300)

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [query])

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setAberto(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function selecionarMembro(m: MembroBusca) {
        setMembroSelecionado(m)
        setQuery(`${m.first_name} ${m.last_name}`)
        setAberto(false)
        setResultado(null)
    }

    async function handleGerar() {
        if (!membroSelecionado) return

        setGerando(true)
        setResultado(null)

        try {
            const res = await gerarReciboAnual(membroSelecionado.id, ano)
            setResultado(res as any)
            if (res.success) {
                setTimeout(() => window.location.reload(), 1500)
            }
        } catch (err: any) {
            setResultado({ error: err.message || 'Erro inesperado.' })
        } finally {
            setGerando(false)
        }
    }

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            {/* Busca de membro */}
            <div className="relative w-full sm:w-80" ref={containerRef}>
                <label className="text-xs text-muted mb-1 block">Membro</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value)
                            setMembroSelecionado(null)
                            setResultado(null)
                        }}
                        placeholder="Pesquisar membro..."
                        className="w-full pl-9 pr-3 py-2 bg-bg border border-soft rounded-xl text-sm text-fg placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-figueira/30"
                    />
                    {buscando && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted animate-spin" />
                    )}
                </div>

                {/* Dropdown */}
                {aberto && membros.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-soft rounded-xl shadow-xl max-h-48 overflow-auto">
                        {membros.map(m => (
                            <button
                                key={m.id}
                                onClick={() => selecionarMembro(m)}
                                className="w-full text-left px-4 py-2.5 hover:bg-soft/50 transition-colors text-sm flex justify-between items-center"
                            >
                                <span className="text-fg font-medium">
                                    {m.first_name} {m.last_name}
                                </span>
                                {m.tax_id && (
                                    <span className="text-xs text-muted">NIF: {m.tax_id}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Botao gerar */}
            <button
                onClick={handleGerar}
                disabled={!membroSelecionado || gerando}
                className="flex items-center gap-2 px-4 py-2 bg-figueira text-white rounded-xl text-sm font-semibold hover:bg-figueira/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
                {gerando ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        A gerar...
                    </>
                ) : (
                    <>
                        <UserPlus className="w-4 h-4" />
                        Gerar Recibo
                    </>
                )}
            </button>

            {/* Resultado */}
            {resultado && (
                <span className={`text-xs font-medium ${resultado.error ? 'text-red-400' : 'text-emerald-400'}`}>
                    {resultado.error ? (
                        resultado.error
                    ) : (
                        <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Recibo {resultado.recibo?.numero_recibo} gerado
                        </span>
                    )}
                </span>
            )}
        </div>
    )
}
