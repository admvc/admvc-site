"use client"

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import {
    Trash2, AlertTriangle, Search, MapPin, Download, Plus,
    Edit3, Eye, Phone, Mail, CheckCircle2, AlertCircle,
    ChevronLeft, ChevronRight, X, Loader2, Users,
    SlidersHorizontal, LayoutGrid, List,
    ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { excluirMembroAction } from '@/actions/admin-actions'
import BotoesImpressao from '@/components/print/BotoesImpressao'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Membro {
    id: number
    first_name: string
    last_name: string
    email: string
    phone_1?: string | null
    gender?: string | null
    id_city?: string | null
    avatar_file?: string | null
    status?: string | null
    role?: string | null
    church_role?: string | null
    baptism_status?: string | null
    data_admissao?: Date | string | null
    gdpr_aceite: boolean
    gdpr_validade?: Date | string | null
    permanecer_aceite: boolean
    permanecer_validade?: Date | string | null
    familia_id?: number | null
    ministerios?: any[]
    departamentos_liderados?: any[]
}

interface Props {
    membros: Membro[]
    kpis: { total: number; ativos: number; pendentes: number; semFamilia: number }
}

type OrdemCampo = 'nome' | 'email' | 'cidade' | 'status' | 'role' | 'compliance' | 'id'
type OrdemDir = 'asc' | 'desc'

const COR_STATUS: Record<string, string> = {
    ATIVO: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    Ativo: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    PENDENTE: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    Pendente: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    INATIVO: 'bg-soft text-muted border-soft',
    Inativo: 'bg-soft text-muted border-soft',
    VISITANTE: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    ARQUIVADO: 'bg-red-500/10 text-red-700 border-red-500/20',
}

const COR_ROLE: Record<string, string> = {
    ADMIN: 'bg-figueira/10 text-figueira border-figueira/20',
    FINANCE: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
    LEADER: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    USER: 'bg-soft text-muted border-soft',
}

export default function MembrosListClient({ membros, kpis }: Props) {
    const toast = useToast()
    const searchParams = useSearchParams()
    const router = useRouter()
    const [showToast, setShowToast] = useState(false)
    const [filtrosAbertos, setFiltrosAbertos] = useState(false)
    const [vista, setVista] = useState<'tabela' | 'cards'>('tabela')

    // Filtros
    const [busca, setBusca] = useState('')
    const [filtroStatus, setFiltroStatus] = useState('TODOS')
    const [filtroRole, setFiltroRole] = useState('TODOS')
    const [filtroCidade, setFiltroCidade] = useState('TODAS')
    const [filtroGenero, setFiltroGenero] = useState('TODOS')
    const [filtroCompliance, setFiltroCompliance] = useState('TODOS')
    const [filtroFamilia, setFiltroFamilia] = useState('TODOS')

    // Ordenação
    const [ordemCampo, setOrdemCampo] = useState<OrdemCampo>('nome')
    const [ordemDir, setOrdemDir] = useState<OrdemDir>('asc')

    // Paginação
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState<number | 'ALL'>(25)

    // Exclusão
    const [membroParaExcluir, setMembroParaExcluir] = useState<Membro | null>(null)
    const [excluindoId, setExcluindoId] = useState<number | null>(null)

    useEffect(() => {
        if (searchParams.get('sucesso') === 'true') {
            setShowToast(true)
            router.replace('/admin/membros', { scroll: false })
            const timer = setTimeout(() => setShowToast(false), 5000)
            return () => clearTimeout(timer)
        }
    }, [searchParams, router])

    useEffect(() => { setCurrentPage(1) }, [busca, filtroStatus, filtroRole, filtroCidade, filtroGenero, filtroCompliance, filtroFamilia, itemsPerPage, ordemCampo, ordemDir])

    const cidadesUnicas = useMemo(() =>
        Array.from(new Set(membros.map(m => m.id_city).filter(Boolean))).sort() as string[]
        , [membros])

    const temFiltrosActivos = filtroStatus !== 'TODOS' || filtroRole !== 'TODOS' || filtroCidade !== 'TODAS' || filtroGenero !== 'TODOS' || filtroCompliance !== 'TODOS' || filtroFamilia !== 'TODOS'

    const limparFiltros = () => {
        setFiltroStatus('TODOS'); setFiltroRole('TODOS'); setFiltroCidade('TODAS')
        setFiltroGenero('TODOS'); setFiltroCompliance('TODOS'); setFiltroFamilia('TODOS')
        setBusca('')
    }

    // Clique no cabeçalho — alterna asc/desc se já activo, senão muda de campo
    const handleOrdem = (campo: OrdemCampo) => {
        if (ordemCampo === campo) {
            setOrdemDir(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setOrdemCampo(campo)
            setOrdemDir('asc')
        }
    }

    const membrosFiltradosOrdenados = useMemo(() => {
        // 1. FILTRAR
        const filtrados = membros.filter(m => {
            const termo = busca.toLowerCase()
            const matchBusca = !busca ||
                `${m.first_name} ${m.last_name}`.toLowerCase().includes(termo) ||
                m.email.toLowerCase().includes(termo) ||
                (m.phone_1 && m.phone_1.includes(termo)) ||
                (m.id_city && m.id_city.toLowerCase().includes(termo)) ||
                (m.church_role && m.church_role.toLowerCase().includes(termo))

            const matchStatus = filtroStatus === 'TODOS' || m.status === filtroStatus
            const matchRole = filtroRole === 'TODOS' || m.role === filtroRole
            const matchCidade = filtroCidade === 'TODAS' || m.id_city === filtroCidade
            const matchGenero = filtroGenero === 'TODOS' || m.gender === filtroGenero

            let matchCompliance = true
            if (filtroCompliance === 'OK') matchCompliance = m.gdpr_aceite && m.permanecer_aceite
            else if (filtroCompliance === 'PENDENTE') matchCompliance = !m.gdpr_aceite || !m.permanecer_aceite

            let matchFamilia = true
            if (filtroFamilia === 'COM') matchFamilia = !!m.familia_id
            else if (filtroFamilia === 'SEM') matchFamilia = !m.familia_id

            return matchBusca && matchStatus && matchRole && matchCidade && matchGenero && matchCompliance && matchFamilia
        })

        // 2. ORDENAR
        return [...filtrados].sort((a, b) => {
            let va: string | number = ''
            let vb: string | number = ''

            if (ordemCampo === 'nome') {
                va = `${a.first_name} ${a.last_name}`.toLowerCase()
                vb = `${b.first_name} ${b.last_name}`.toLowerCase()
            } else if (ordemCampo === 'email') {
                va = a.email.toLowerCase()
                vb = b.email.toLowerCase()
            } else if (ordemCampo === 'cidade') {
                va = (a.id_city || '').toLowerCase()
                vb = (b.id_city || '').toLowerCase()
            } else if (ordemCampo === 'status') {
                va = (a.status || '').toLowerCase()
                vb = (b.status || '').toLowerCase()
            } else if (ordemCampo === 'role') {
                va = (a.role || '').toLowerCase()
                vb = (b.role || '').toLowerCase()
            } else if (ordemCampo === 'compliance') {
                // OK = 2, um pendente = 1, ambos pendentes = 0
                va = (a.gdpr_aceite ? 1 : 0) + (a.permanecer_aceite ? 1 : 0)
                vb = (b.gdpr_aceite ? 1 : 0) + (b.permanecer_aceite ? 1 : 0)
            } else if (ordemCampo === 'id') {
                va = a.id
                vb = b.id
            }

            if (va < vb) return ordemDir === 'asc' ? -1 : 1
            if (va > vb) return ordemDir === 'asc' ? 1 : -1
            return 0
        })
    }, [membros, busca, filtroStatus, filtroRole, filtroCidade, filtroGenero, filtroCompliance, filtroFamilia, ordemCampo, ordemDir])

    const paginatedMembros = useMemo(() => {
        if (itemsPerPage === 'ALL') return membrosFiltradosOrdenados
        const start = (currentPage - 1) * itemsPerPage
        return membrosFiltradosOrdenados.slice(start, start + itemsPerPage)
    }, [membrosFiltradosOrdenados, currentPage, itemsPerPage])

    const totalPages = itemsPerPage === 'ALL' ? 1 : Math.ceil(membrosFiltradosOrdenados.length / itemsPerPage)

    // Componente do cabeçalho ordenável
    const ThOrdenavel = ({ campo, label, className = '' }: { campo: OrdemCampo; label: string; className?: string }) => {
        const activo = ordemCampo === campo
        return (
            <th
                onClick={() => handleOrdem(campo)}
                className={`px-5 py-4 text-[8px] font-black text-muted uppercase tracking-widest cursor-pointer select-none hover:text-fg transition-colors group ${className}`}
            >
                <div className="flex items-center gap-1.5">
                    {label}
                    <span className={`transition-all ${activo ? 'text-figueira' : 'text-muted/30 group-hover:text-muted/60'}`}>
                        {activo
                            ? ordemDir === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                            : <ArrowUpDown size={10} />
                        }
                    </span>
                </div>
            </th>
        )
    }

    const StatusDoc = ({ aceite, validade, label }: { aceite: boolean; validade?: Date | string | null; label: string }) => {
        const expirado = validade && new Date(validade) < new Date()
        const ok = aceite && !expirado
        return (
            <div title={`${label}: ${ok ? 'OK' : 'Pendente'}`}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border w-fit
                    ${ok ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                {ok ? <CheckCircle2 size={7} /> : <AlertCircle size={7} />}
                {label}
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* TOAST */}
            {showToast && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-5 py-4 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Membro registado com sucesso!</span>
                    </div>
                    <button onClick={() => setShowToast(false)} className="text-emerald-600 hover:bg-emerald-500/20 p-1.5 rounded-lg transition-all">
                        <X size={14} />
                    </button>
                </div>
            )}


            {/* HEADER */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Membros</h1>
                    <p className="text-xs text-muted">{kpis.total} registados · {kpis.ativos} activos</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <BotoesImpressao membros={membrosFiltradosOrdenados} />
                    <Link href="/admin/membros/importar"
                        className="flex items-center gap-2 bg-bg2 border border-soft text-muted px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:text-fg hover:border-figueira/30 transition-all">
                        <Download size={13} /> Importar
                    </Link>
                    <Link href="/admin/membros/cadastro"
                        className="flex items-center gap-2 bg-fg text-bg px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-figueira transition-all shadow-sm active:scale-95">
                        <Plus size={13} /> Novo Membro
                    </Link>
                </div>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: kpis.total, cor: 'text-fg' },
                    { label: 'Activos', value: kpis.ativos, cor: 'text-emerald-600' },
                    { label: 'Pendentes', value: kpis.pendentes, cor: kpis.pendentes > 0 ? 'text-orange-600' : 'text-emerald-600' },
                    { label: 'Sem Familia', value: kpis.semFamilia, cor: kpis.semFamilia > 0 ? 'text-orange-600' : 'text-fg' },
                ].map(k => (
                    <div key={k.label} className="bg-bg2 border border-soft rounded-2xl px-5 py-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted">{k.label}</p>
                        <p className={`text-2xl font-black italic ${k.cor}`}>{k.value}</p>
                    </div>
                ))}
            </div>

            {/* BARRA DE PESQUISA */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Nome, email, telefone, cidade, cargo..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="w-full bg-bg2 border border-soft rounded-xl py-3 pl-10 pr-10 text-sm font-medium text-fg focus:border-figueira outline-none transition-all placeholder:text-muted/40"
                        />
                        {busca && (
                            <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-red-500 transition-colors">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all
                            ${filtrosAbertos || temFiltrosActivos ? 'bg-figueira text-white border-figueira' : 'bg-bg2 border-soft text-muted hover:text-fg hover:border-figueira/30'}`}
                    >
                        <SlidersHorizontal size={13} />
                        Filtros
                        {temFiltrosActivos && <span className="bg-white/30 text-white rounded-full w-4 h-4 flex items-center justify-center text-[7px] font-black">!</span>}
                    </button>
                    <div className="flex border border-soft rounded-xl overflow-hidden bg-bg2">
                        <button onClick={() => setVista('tabela')} className={`px-3 py-3 transition-all ${vista === 'tabela' ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>
                            <List size={14} />
                        </button>
                        <button onClick={() => setVista('cards')} className={`px-3 py-3 transition-all ${vista === 'cards' ? 'bg-fg text-bg' : 'text-muted hover:text-fg'}`}>
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                </div>

                {/* PAINEL FILTROS */}
                {filtrosAbertos && (
                    <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                            {[
                                { label: 'Status', value: filtroStatus, set: setFiltroStatus, options: [['TODOS', 'Todos'], ['ATIVO', 'Activo'], ['PENDENTE', 'Pendente'], ['INATIVO', 'Inactivo'], ['VISITANTE', 'Visitante'], ['ARQUIVADO', 'Arquivado']] },
                                { label: 'Permissao', value: filtroRole, set: setFiltroRole, options: [['TODOS', 'Todos'], ['USER', 'Membro'], ['LEADER', 'Lider'], ['FINANCE', 'Financeiro'], ['ADMIN', 'Admin']] },
                                { label: 'Genero', value: filtroGenero, set: setFiltroGenero, options: [['TODOS', 'Todos'], ['Masculino', 'Masculino'], ['Feminino', 'Feminino']] },
                                { label: 'Cidade', value: filtroCidade, set: setFiltroCidade, options: [['TODAS', 'Todas'], ...cidadesUnicas.map(c => [c, c])] },
                                { label: 'Compliance', value: filtroCompliance, set: setFiltroCompliance, options: [['TODOS', 'Todos'], ['OK', 'Documentos OK'], ['PENDENTE', 'Com Pendentes']] },
                                { label: 'Familia', value: filtroFamilia, set: setFiltroFamilia, options: [['TODOS', 'Todos'], ['COM', 'Com Familia'], ['SEM', 'Sem Familia']] },
                            ].map(f => (
                                <div key={f.label} className="space-y-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-muted">{f.label}</label>
                                    <select value={f.value} onChange={e => f.set(e.target.value)}
                                        className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                                        {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                        {temFiltrosActivos && (
                            <div className="flex items-center justify-between pt-2 border-t border-soft">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                                    {membrosFiltradosOrdenados.length} resultado{membrosFiltradosOrdenados.length !== 1 ? 's' : ''}
                                </p>
                                <button onClick={limparFiltros} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors">
                                    <X size={11} /> Limpar filtros
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* INDICADOR DE ORDENACAO ACTIVA */}
                {ordemCampo !== 'nome' || ordemDir !== 'asc' ? (
                    <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted">Ordenado por:</span>
                        <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-figueira bg-figueira/10 border border-figueira/20 px-2.5 py-1 rounded-lg">
                            {ordemCampo} {ordemDir === 'asc' ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                        </span>
                        <button
                            onClick={() => { setOrdemCampo('nome'); setOrdemDir('asc') }}
                            className="text-[8px] font-black uppercase tracking-widest text-muted hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                            <X size={9} /> Repor
                        </button>
                    </div>
                ) : null}
            </div>

            {/* TABELA */}
            {vista === 'tabela' && (
                <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[900px]">
                            <thead>
                                <tr className="border-b border-soft bg-bg/50">
                                    <ThOrdenavel campo="nome" label="Membro" />
                                    <ThOrdenavel campo="email" label="Contacto" />
                                    <ThOrdenavel campo="cidade" label="Cidade" />
                                    <ThOrdenavel campo="status" label="Status / Role" />
                                    <ThOrdenavel campo="compliance" label="Docs" className="text-center" />
                                    {/* Cabeçalho de acções sem ordenação */}
                                    <th className="px-5 py-4 text-[8px] font-black text-muted uppercase tracking-widest text-right">
                                        Accoes
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-soft/50">
                                {paginatedMembros.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <Users size={24} className="mx-auto text-muted/20 mb-3" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum membro encontrado</p>
                                        </td>
                                    </tr>
                                ) : paginatedMembros.map(m => (
                                    <tr key={m.id} className="hover:bg-soft/10 transition-colors">

                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-soft border border-soft/50 shrink-0 flex items-center justify-center">
                                                    {m.avatar_file
                                                        ? <Image src={m.avatar_file} alt="" width={36} height={36} className="w-full h-full object-cover" />
                                                        : <span className="text-[9px] font-black text-muted">{m.first_name[0]}{m.last_name[0]}</span>
                                                    }
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black uppercase tracking-tight text-fg leading-none">
                                                        {m.first_name} {m.last_name}
                                                    </p>
                                                    <p className="text-[8px] text-muted font-bold uppercase tracking-widest mt-0.5">
                                                        #{m.id}{m.church_role ? ` · ${m.church_role}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-3.5">
                                            <div className="space-y-0.5">
                                                {m.phone_1 && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone size={9} className="text-figueira shrink-0" />
                                                        <span className="text-[10px] font-bold text-fg">{m.phone_1}</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1.5">
                                                    <Mail size={9} className="text-muted shrink-0" />
                                                    <span className="text-[9px] text-muted truncate max-w-[150px]">{m.email}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1.5 text-muted">
                                                <MapPin size={10} className="shrink-0" />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{m.id_city || '—'}</span>
                                            </div>
                                        </td>

                                        <td className="px-5 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {m.status && (
                                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${COR_STATUS[m.status] || 'bg-soft text-muted border-soft'}`}>
                                                        {m.status}
                                                    </span>
                                                )}
                                                {m.role && m.role !== 'USER' && (
                                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${COR_ROLE[m.role] || 'bg-soft text-muted border-soft'}`}>
                                                        {m.role}
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-5 py-3.5">
                                            <div className="flex justify-center gap-1">
                                                <StatusDoc aceite={m.gdpr_aceite} validade={m.gdpr_validade} label="GDPR" />
                                                <StatusDoc aceite={m.permanecer_aceite} validade={m.permanecer_validade} label="TERM" />
                                            </div>
                                        </td>

                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link href={`/admin/membros/visualizar/${m.id}`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg border border-soft text-muted hover:text-figueira hover:border-figueira/30 transition-all"
                                                    title="Ver">
                                                    <Eye size={13} />
                                                </Link>
                                                <Link href={`/admin/membros/editar/${m.id}`}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-figueira text-white hover:bg-figueira/90 transition-all"
                                                    title="Editar">
                                                    <Edit3 size={13} />
                                                </Link>
                                                <button
                                                    onClick={() => setMembroParaExcluir(m)}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/8 border border-red-500/15 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                    title="Excluir">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACAO */}
                    <div className="border-t border-soft px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-bg">
                        <div className="flex items-center gap-3">
                            <select
                                value={itemsPerPage}
                                onChange={e => setItemsPerPage(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                className="bg-bg2 border border-soft text-fg text-[9px] font-black uppercase py-1.5 px-3 rounded-lg outline-none appearance-none"
                            >
                                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                                <option value="ALL">Todos</option>
                            </select>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">
                                {membrosFiltradosOrdenados.length} membro{membrosFiltradosOrdenados.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        {itemsPerPage !== 'ALL' && totalPages > 1 && (
                            <div className="flex items-center gap-3">
                                <span className="text-[9px] font-bold text-muted uppercase tracking-widest">{currentPage} / {totalPages}</span>
                                <div className="flex gap-1">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                        className="w-8 h-8 flex items-center justify-center border border-soft rounded-lg disabled:opacity-20 hover:border-figueira/30 transition-all">
                                        <ChevronLeft size={13} />
                                    </button>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                        className="w-8 h-8 flex items-center justify-center border border-soft rounded-lg disabled:opacity-20 hover:border-figueira/30 transition-all">
                                        <ChevronRight size={13} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VISTA CARDS */}
            {vista === 'cards' && (
                <div className="space-y-4">
                    {paginatedMembros.length === 0 ? (
                        <div className="py-16 text-center bg-bg2 border border-soft rounded-2xl">
                            <Users size={24} className="mx-auto text-muted/20 mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nenhum membro encontrado</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedMembros.map(m => (
                                <div key={m.id} className="bg-bg2 border border-soft rounded-2xl p-5 hover:border-figueira/20 transition-all">
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-soft border border-soft/50 shrink-0 flex items-center justify-center">
                                                {m.avatar_file
                                                    ? <Image src={m.avatar_file} alt="" width={44} height={44} className="w-full h-full object-cover" />
                                                    : <span className="text-[10px] font-black text-muted">{m.first_name[0]}{m.last_name[0]}</span>
                                                }
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-tight text-fg leading-none">{m.first_name} {m.last_name}</p>
                                                <p className="text-[8px] text-muted font-bold uppercase tracking-widest mt-0.5">#{m.id}</p>
                                            </div>
                                        </div>
                                        {m.status && (
                                            <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border shrink-0 ${COR_STATUS[m.status] || 'bg-soft text-muted border-soft'}`}>
                                                {m.status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 mb-4">
                                        {m.phone_1 && (
                                            <div className="flex items-center gap-2 text-[10px] text-fg">
                                                <Phone size={10} className="text-figueira shrink-0" />
                                                {m.phone_1}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-[9px] text-muted">
                                            <Mail size={10} className="shrink-0" />
                                            <span className="truncate">{m.email}</span>
                                        </div>
                                        {m.id_city && (
                                            <div className="flex items-center gap-2 text-[9px] text-muted">
                                                <MapPin size={10} className="shrink-0" />
                                                {m.id_city}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-3 border-t border-soft">
                                        <div className="flex gap-1">
                                            <StatusDoc aceite={m.gdpr_aceite} validade={m.gdpr_validade} label="GDPR" />
                                            <StatusDoc aceite={m.permanecer_aceite} validade={m.permanecer_validade} label="TERM" />
                                        </div>
                                        <div className="flex gap-1">
                                            <Link href={`/admin/membros/visualizar/${m.id}`}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-bg border border-soft text-muted hover:text-figueira transition-all">
                                                <Eye size={12} />
                                            </Link>
                                            <Link href={`/admin/membros/editar/${m.id}`}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-figueira text-white hover:bg-figueira/90 transition-all">
                                                <Edit3 size={12} />
                                            </Link>
                                            <button onClick={() => setMembroParaExcluir(m)}
                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/8 border border-red-500/15 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {itemsPerPage !== 'ALL' && totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                                className="px-4 py-2 border border-soft rounded-xl text-[9px] font-black uppercase tracking-widest text-muted disabled:opacity-20 transition-all">
                                Anterior
                            </button>
                            <span className="text-[9px] font-black text-muted uppercase tracking-widest">{currentPage} / {totalPages}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                                className="px-4 py-2 bg-figueira text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-figueira/90 disabled:opacity-20 transition-all">
                                Seguinte
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* MODAL EXCLUSAO */}
            {membroParaExcluir && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-bg2 border border-soft w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 text-center space-y-4">
                            <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg">Confirmar Exclusao</h3>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-2 leading-relaxed">
                                    Remover permanentemente:<br />
                                    <span className="text-red-500 text-[11px]">{membroParaExcluir.first_name} {membroParaExcluir.last_name}</span>
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 pt-2">
                                <button
                                    disabled={excluindoId !== null}
                                    onClick={async () => {
                                        setExcluindoId(membroParaExcluir.id)
                                        const res = await excluirMembroAction(membroParaExcluir.id)
                                        if (res.ok) setMembroParaExcluir(null)
                                        else toast(res.error, 'erro')
                                        setExcluindoId(null)
                                    }}
                                    className="w-full bg-red-500 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                                >
                                    {excluindoId ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                    {excluindoId ? 'A eliminar...' : 'Confirmar Exclusao'}
                                </button>
                                <button onClick={() => setMembroParaExcluir(null)}
                                    className="w-full bg-bg border border-soft text-muted py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-soft transition-all">
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}