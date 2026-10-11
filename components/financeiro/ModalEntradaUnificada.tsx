"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    PlusCircle, X, User, ArrowRight, Receipt, Ticket,
    HandCoins, Loader2, Search, ChevronDown, Check
} from "lucide-react";
import GrelhaRifa from "@/components/financeiro/GrelhaRifa";
import { lancarPagamentoCarne, lancarContribuicaoAction } from "@/actions/financeiro-actions";
import { useToast } from '@/components/ui/ConfirmDialog';

interface Membro {
    id: number
    first_name: string
    last_name: string
    loyverse_id?: string | null
}

// ── SELETOR DE MEMBROS COM PORTAL ─────────────────────────────────────────────
function SeletorMembro({
    membros,
    value,
    onChange
}: {
    membros: Membro[]
    value: string
    onChange: (id: string) => void
}) {
    const [aberto, setAberto] = useState(false)
    const [busca, setBusca] = useState('')
    const [mounted, setMounted] = useState(false)
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
    const btnRef = useRef<HTMLButtonElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setMounted(true) }, [])

    // Calcula a posição do dropdown baseado no botão
    const calcularPosicao = () => {
        if (!btnRef.current) return
        const rect = btnRef.current.getBoundingClientRect()
        setDropdownPos({
            top: rect.bottom + window.scrollY + 6,
            left: rect.left + window.scrollX,
            width: rect.width
        })
    }

    // Abre/fecha e calcula posição
    const toggleAberto = () => {
        if (!aberto) calcularPosicao()
        setAberto(!aberto)
    }

    // Fecha ao clicar fora
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as Node
            const clickNoBotao = btnRef.current?.contains(target)
            const clickNoDropdown = dropdownRef.current?.contains(target)
            if (!clickNoBotao && !clickNoDropdown) {
                setAberto(false)
                setBusca('')
            }
        }
        if (aberto) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [aberto])

    // Recalcula posição ao scroll/resize
    useEffect(() => {
        if (!aberto) return
        const handler = () => calcularPosicao()
        window.addEventListener('scroll', handler, true)
        window.addEventListener('resize', handler)
        return () => {
            window.removeEventListener('scroll', handler, true)
            window.removeEventListener('resize', handler)
        }
    }, [aberto])

    // Foca input ao abrir
    useEffect(() => {
        if (aberto) setTimeout(() => inputRef.current?.focus(), 50)
    }, [aberto])

    const membrosFiltrados = useMemo(() => {
        if (!busca.trim()) return membros
        const termo = busca.toLowerCase()
        return membros.filter(m =>
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(termo)
        )
    }, [busca, membros])

    const membroSelecionado = value && value !== 'anonimo'
        ? membros.find(m => String(m.id) === value)
        : null

    const label = value === 'anonimo'
        ? '✝ Oferta Anónima'
        : membroSelecionado
            ? `${membroSelecionado.first_name} ${membroSelecionado.last_name}`
            : null

    const handleSelecionar = (id: string) => {
        onChange(id)
        setAberto(false)
        setBusca('')
    }

    // ── DROPDOWN VIA PORTAL ───────────────────────────────────────────────────
    const dropdown = (
        <div
            ref={dropdownRef}
            className="bg-bg border border-soft rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
                position: 'absolute',
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 99999,
            }}
        >
            {/* PESQUISA */}
            <div className="p-2 border-b border-soft">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Pesquisar membro..."
                        value={busca}
                        onChange={e => setBusca(e.target.value)}
                        className="w-full bg-bg2 border border-soft rounded-xl pl-8 pr-8 py-2.5 text-sm font-medium text-fg focus:border-figueira outline-none transition-all placeholder:text-muted/50"
                    />
                    {busca && (
                        <button
                            type="button"
                            onClick={() => setBusca('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg transition-colors"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* LISTA */}
            <div className="max-h-60 overflow-y-auto">
                {/* ANÓNIMO */}
                <button
                    type="button"
                    onClick={() => handleSelecionar('anonimo')}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-left hover:bg-soft/50 transition-colors ${value === 'anonimo' ? 'bg-figueira/5 text-figueira' : 'text-muted'}`}
                >
                    <div className="w-7 h-7 rounded-lg bg-soft flex items-center justify-center shrink-0 text-base">✝</div>
                    <span className="flex-1">Oferta Anónima</span>
                    {value === 'anonimo' && <Check size={14} className="text-figueira shrink-0" />}
                </button>

                <div className="h-px bg-soft/50 mx-3" />

                {/* MEMBROS */}
                {membrosFiltrados.length === 0 ? (
                    <div className="py-8 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                            Nenhum membro encontrado
                        </p>
                    </div>
                ) : (
                    membrosFiltrados.map(m => {
                        const selecionado = String(m.id) === value
                        const iniciais = `${m.first_name[0]}${m.last_name[0]}`
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => handleSelecionar(String(m.id))}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-left hover:bg-soft/50 transition-colors ${selecionado ? 'bg-figueira/5' : ''}`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black ${selecionado ? 'bg-figueira text-white' : 'bg-bg2 border border-soft text-muted'}`}>
                                    {iniciais.toUpperCase()}
                                </div>
                                <span className={`flex-1 truncate ${selecionado ? 'text-figueira' : 'text-fg'}`}>
                                    {m.first_name} {m.last_name}
                                </span>
                                {selecionado && <Check size={14} className="text-figueira shrink-0" />}
                            </button>
                        )
                    })
                )}
            </div>

            {/* RODAPÉ */}
            {busca && (
                <div className="px-4 py-2 border-t border-soft bg-bg2/50">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                        {membrosFiltrados.length} resultado{membrosFiltrados.length !== 1 ? 's' : ''}
                    </p>
                </div>
            )}
        </div>
    )

    return (
        <div className="relative">
            {/* BOTÃO */}
            <button
                ref={btnRef}
                type="button"
                onClick={toggleAberto}
                className={`w-full h-12 px-4 bg-bg2 border rounded-2xl text-sm font-bold text-left flex items-center justify-between gap-3 transition-all
                    ${aberto ? 'border-figueira ring-2 ring-figueira/10' : 'border-soft hover:border-figueira/40'}`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${label ? 'bg-figueira text-white' : 'bg-soft text-muted'}`}>
                        <User size={12} />
                    </div>
                    <span className={`truncate ${label ? 'text-fg' : 'text-muted'}`}>
                        {label || 'Selecione um membro...'}
                    </span>
                </div>
                <ChevronDown size={14} className={`text-muted shrink-0 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
            </button>

            {/* ✅ PORTAL — renderiza no body, escapa do overflow do modal */}
            {mounted && aberto && createPortal(dropdown, document.body)}
        </div>
    )
}

// ── MODAL PRINCIPAL ───────────────────────────────────────────────────────────
export default function ModalEntradaUnificada({ membros, carnesAtivos, rifaAtiva }: any) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, setIsPending] = useState(false)
    const toast = useToast()
    const [membroId, setMembroId] = useState("")
    const [tipoEntrada, setTipoEntrada] = useState("")
    const [valor, setValor] = useState("")
    const [carneSelecionado, setCarneSelecionado] = useState("")

    const carnesDoMembro = useMemo(() => {
        if (!membroId || membroId === "anonimo") return []
        return carnesAtivos.filter((c: any) => {
            const isMesmoMembro = String(c.membro_id) === String(membroId)
            const pagas = c.parcelas_pagas || 0
            const total = c.parcelas_total || 0
            return isMesmoMembro && pagas < total
        })
    }, [membroId, carnesAtivos])

    const fecharModal = () => {
        setIsOpen(false)
        setMembroId("")
        setTipoEntrada("")
        setValor("")
        setCarneSelecionado("")
    }

    const handleMembroChange = (id: string) => {
        setMembroId(id)
        setTipoEntrada("")
        setCarneSelecionado("")
        setValor("")
    }

    async function handleSalvarEntrada() {
        if (!tipoEntrada || !valor || Number(valor) <= 0) {
            toast("Preencha todos os campos e certifique-se que o valor é maior que zero.", 'erro')
            return
        }
        setIsPending(true)
        try {
            if (tipoEntrada === 'CARNE') {
                const res = await lancarPagamentoCarne(Number(carneSelecionado), 1)
                if (!res.ok) { toast("Erro ao gravar Carnê: " + res.error, 'erro'); return }
            } else {
                const formData = new FormData()
                if (membroId !== 'anonimo') formData.append('membroId', membroId)
                formData.append('valor', valor)
                formData.append('tipo', tipoEntrada)
                formData.append('data', new Date().toISOString())
                const res = await lancarContribuicaoAction(formData)
                if (!res.ok) { toast("Erro ao gravar: " + res.error, 'erro'); return }
            }
            fecharModal()
        } catch {
            toast("Erro ao comunicar com o servidor.", 'erro')
        } finally {
            setIsPending(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="h-11 px-5 bg-fg text-bg rounded-2xl flex items-center gap-2 hover:bg-figueira hover:text-white transition-all active:scale-95 shadow-lg"
            >
                <PlusCircle size={15} />
                <span className="text-[9px] font-black uppercase tracking-widest">Lançar Entrada</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={fecharModal} />

                    <div className={`bg-bg border border-soft rounded-[2.5rem] shadow-2xl w-full relative z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar transition-all duration-300
                        ${tipoEntrada === 'RIFA' ? 'max-w-6xl' : 'max-w-lg'}`}>

                        {/* HEADER */}
                        <div className="flex items-center justify-between p-6 border-b border-soft sticky top-0 bg-bg z-10 rounded-t-[2.5rem]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center">
                                    <HandCoins size={18} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black uppercase italic tracking-tighter text-fg leading-none">
                                        Registo Financeiro
                                    </h2>
                                    <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                        Lançar nova entrada
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={fecharModal}
                                className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">

                            {/* PASSO 1 — MEMBRO */}
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                    <User size={11} /> 1. Identificar Membro
                                </label>
                                <SeletorMembro
                                    membros={membros}
                                    value={membroId}
                                    onChange={handleMembroChange}
                                />
                            </div>

                            {/* PASSO 2 — TIPO */}
                            {membroId && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-[9px] font-black text-muted uppercase tracking-widest flex items-center gap-2">
                                        <ArrowRight size={11} /> 2. Tipo de entrada
                                    </label>
                                    <select
                                        className="w-full h-12 px-4 bg-bg2 border border-soft rounded-2xl text-sm font-bold text-fg focus:border-figueira outline-none transition-all cursor-pointer appearance-none"
                                        value={tipoEntrada}
                                        onChange={e => setTipoEntrada(e.target.value)}
                                    >
                                        <option value="" disabled>Selecione o tipo...</option>
                                        <option value="DIZIMO">Dízimo</option>
                                        <option value="OFERTA">Oferta Voluntária</option>
                                        <option value="MISSAO">Oferta de Missões</option>
                                        {carnesDoMembro.length > 0 && (
                                            <option value="CARNE">📑 Pagamento de Carnê ({carnesDoMembro.length})</option>
                                        )}
                                        {rifaAtiva && (
                                            <option value="RIFA">🎟️ Venda de Rifa</option>
                                        )}
                                    </select>
                                </div>
                            )}

                            {/* CENÁRIO A — CARNÊ */}
                            {tipoEntrada === 'CARNE' && carnesDoMembro.length > 0 && (
                                <div className="bg-figueira/5 border border-figueira/20 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 pb-3 border-b border-figueira/15">
                                        <Receipt size={14} className="text-figueira" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-figueira">Detalhes do Carnê</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-muted uppercase tracking-widest">Campanha</label>
                                        <select
                                            className="w-full h-12 px-4 bg-bg border border-soft rounded-2xl text-sm font-bold text-fg focus:border-figueira outline-none cursor-pointer appearance-none"
                                            value={carneSelecionado}
                                            onChange={e => {
                                                setCarneSelecionado(e.target.value)
                                                const carne = carnesDoMembro.find((c: any) => String(c.id) === e.target.value)
                                                if (carne) setValor(String(carne.valor_mensal))
                                            }}
                                        >
                                            <option value="" disabled>Selecione o Carnê...</option>
                                            {carnesDoMembro.map((c: any) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.nome} — faltam {c.parcelas_total - (c.parcelas_pagas || 0)} parcelas
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {carneSelecionado && (
                                        <div className="flex items-center justify-between bg-bg border border-soft rounded-2xl px-5 py-3 animate-in slide-in-from-top-2 duration-200">
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted">Valor</p>
                                                <p className="text-lg font-black text-fg mt-0.5">€{Number(valor).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-muted">Parcelas</p>
                                                <p className="text-sm font-bold text-fg mt-0.5">1 parcela</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CENÁRIO B — RIFA */}
                            {tipoEntrada === 'RIFA' && (
                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 pb-3 border-b border-blue-500/15">
                                        <Ticket size={14} className="text-blue-500" />
                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                                            {rifaAtiva.nome}
                                        </p>
                                    </div>
                                    <div className="bg-bg border border-soft rounded-2xl overflow-hidden">
                                        <GrelhaRifa rifa={rifaAtiva} membros={membros} membroPreSelecionadoId={membroId} />
                                    </div>
                                </div>
                            )}

                            {/* CENÁRIO C — OFERTAS LIVRES */}
                            {['DIZIMO', 'OFERTA', 'MISSAO'].includes(tipoEntrada) && (
                                <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-2 animate-in fade-in duration-200">
                                    <label className="text-[9px] font-black text-muted uppercase tracking-widest">Valor (€)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-black text-lg">€</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full h-14 pl-10 pr-4 bg-bg border border-soft rounded-2xl text-2xl font-black text-fg focus:border-figueira outline-none transition-all"
                                            value={valor}
                                            onChange={e => setValor(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            )}

                            {/* BOTÃO SUBMIT */}
                            {tipoEntrada !== 'RIFA' && tipoEntrada !== '' && (
                                <button
                                    type="button"
                                    onClick={handleSalvarEntrada}
                                    disabled={
                                        isPending ||
                                        !tipoEntrada ||
                                        (tipoEntrada === 'CARNE' && !carneSelecionado) ||
                                        !valor || Number(valor) <= 0
                                    }
                                    className="w-full h-13 py-4 flex items-center justify-center gap-2 bg-figueira text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-figueira/90 transition-all active:scale-95 disabled:opacity-40 shadow-md"
                                >
                                    {isPending
                                        ? <><Loader2 size={15} className="animate-spin" /> Processando...</>
                                        : 'Confirmar Registo'
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}