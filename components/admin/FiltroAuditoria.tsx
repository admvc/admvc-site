'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search, Filter, X, Loader2 } from 'lucide-react'

const CATEGORIAS = ['MEMBROS', 'FAMILIAS', 'ESCALAS', 'FINANCEIRO', 'ACESSO', 'DOCUMENTOS', 'CANTINA', 'SISTEMA', 'DEPARTAMENTOS', 'GRUPOS', 'INVENTARIO', 'CONFIGURACAO', 'LOUVOR', 'AGENDA', 'VISITANTES', 'MURAL']
const ACOES = ['CRIAR', 'EDITAR', 'APAGAR', 'LOGIN', 'LOGIN_FALHOU', 'VINCULAR', 'DESVINCULAR', 'APROVAR', 'ALTERAR_ROLE', 'RESET_SENHA', 'EXPORT', 'IMPORTAR', 'PUBLICAR', 'CONFIG', 'ASSINAR', 'ARQUIVAR']

export default function FiltroAuditoria({
    categoriaActual,
    acaoActual,
    qActual,
}: {
    categoriaActual?: string
    acaoActual?: string
    qActual?: string
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [q, setQ] = useState(qActual || '')

    const aplicarFiltro = (params: Record<string, string | undefined>) => {
        const url = new URLSearchParams()
        if (params.q) url.set('q', params.q)
        if (params.categoria) url.set('categoria', params.categoria)
        if (params.acao) url.set('acao', params.acao)
        url.set('pagina', '1')
        startTransition(() => router.push(`?${url.toString()}`))
    }

    const limpar = () => {
        setQ('')
        startTransition(() => router.push('?pagina=1'))
    }

    const temFiltros = !!(categoriaActual || acaoActual || qActual)

    return (
        <div className="space-y-3">
            {/* PESQUISA */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                        type="text"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && aplicarFiltro({ q, categoria: categoriaActual, acao: acaoActual })}
                        placeholder="Pesquisar por nome, descricao..."
                        className="w-full bg-bg2 border border-soft rounded-2xl pl-10 pr-4 py-3 text-sm font-medium text-fg focus:border-figueira outline-none transition-all placeholder:text-muted/40"
                    />
                </div>
                <button
                    onClick={() => aplicarFiltro({ q, categoria: categoriaActual, acao: acaoActual })}
                    disabled={isPending}
                    className="px-5 py-3 bg-figueira text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all flex items-center gap-2 disabled:opacity-40"
                >
                    {isPending ? <Loader2 size={13} className="animate-spin" /> : <Filter size={13} />}
                    Filtrar
                </button>
                {temFiltros && (
                    <button
                        onClick={limpar}
                        className="px-4 py-3 bg-bg2 border border-soft text-muted hover:text-red-500 hover:border-red-300 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                    >
                        <X size={13} /> Limpar
                    </button>
                )}
            </div>

            {/* FILTRO CATEGORIA */}
            <div className="flex flex-wrap gap-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted self-center mr-1">
                    Categoria:
                </span>
                {CATEGORIAS.map(cat => (
                    <button
                        key={cat}
                        onClick={() => aplicarFiltro({
                            q: qActual,
                            categoria: categoriaActual === cat ? undefined : cat,
                            acao: acaoActual
                        })}
                        className={`px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border
                            ${categoriaActual === cat
                                ? 'bg-fg text-bg border-fg'
                                : 'bg-bg2 border-soft text-muted hover:border-figueira/40 hover:text-figueira'}`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* FILTRO ACAO */}
            <div className="flex flex-wrap gap-1.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted self-center mr-1">
                    Accao:
                </span>
                {ACOES.map(acao => (
                    <button
                        key={acao}
                        onClick={() => aplicarFiltro({
                            q: qActual,
                            categoria: categoriaActual,
                            acao: acaoActual === acao ? undefined : acao
                        })}
                        className={`px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border
                            ${acaoActual === acao
                                ? 'bg-fg text-bg border-fg'
                                : 'bg-bg2 border-soft text-muted hover:border-figueira/40 hover:text-figueira'}`}
                    >
                        {acao.replace('_', ' ')}
                    </button>
                ))}
            </div>
        </div>
    )
}