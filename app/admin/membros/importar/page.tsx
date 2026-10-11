'use client'

import { useState } from 'react'
import {
    Download, Upload, CheckCircle2, ArrowRight, FileSpreadsheet,
    Loader2, AlertTriangle, X, Info, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react'
import { analisarCSV, confirmarImportacao } from '@/actions/membro-actions'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { useToast } from '@/components/ui/ConfirmDialog'

// ── CABEÇALHOS DO CSV (ordem exacta para exportar/importar) ──────────────────
// Campos baseados no schema real do model Membro
const CABECALHOS_CSV = [
    'first_name', 'last_name', 'email', 'phone_1',
    'gender', 'birthdate', 'marital_status', 'nationality',
    'profession', 'tax_id', 'id_card_number',
    'address_1', 'address_number', 'address_2', 'postal_code',
    'neighborhood', 'id_city', 'state', 'country',
    'baptism_status', 'baptism_date', 'conversion_date', 'entry_date',
    'church_role', 'ministry', 'previous_church',
    'status', 'role',
    'spouse_name', 'wedding_date',
    'father_name', 'mother_name',
    'notes', 'avatar_file',
]

const LABELS_CAMPOS: Record<string, string> = {
    first_name: 'Primeiro Nome *', last_name: 'Sobrenome *',
    email: 'E-mail *', phone_1: 'Telemovel *',
    gender: 'Genero', birthdate: 'Data Nasc. (YYYY-MM-DD)',
    marital_status: 'Estado Civil', nationality: 'Nacionalidade',
    profession: 'Profissao', tax_id: 'NIF', id_card_number: 'BI/CC',
    address_1: 'Morada', address_number: 'Numero', address_2: 'Complemento',
    postal_code: 'Codigo Postal', neighborhood: 'Freguesia/Bairro',
    id_city: 'Cidade', state: 'Distrito', country: 'Pais',
    baptism_status: 'Estado Batismo', baptism_date: 'Data Batismo (YYYY-MM-DD)',
    conversion_date: 'Data Conversao (YYYY-MM-DD)', entry_date: 'Data Entrada (YYYY-MM-DD)',
    church_role: 'Cargo (Membro, Diacono...)', ministry: 'Ministerio',
    previous_church: 'Igreja Anterior',
    status: 'Status (ATIVO, PENDENTE...)', role: 'Role (USER, ADMIN...)',
    spouse_name: 'Nome Conjuge', wedding_date: 'Data Casamento (YYYY-MM-DD)',
    father_name: 'Nome Pai', mother_name: 'Nome Mae',
    notes: 'Notas Pastorais', avatar_file: 'URL Foto',
}

const CAMPOS_OBRIGATORIOS = ['first_name', 'last_name', 'email', 'phone_1']

type ItemAnalise = {
    linha: number
    status: 'PRONTO' | 'DUPLICADO' | 'ERRO'
    motivo?: string
    dados?: Record<string, string>
}

export default function ImportExportPage() {
    const toast = useToast()
    const [loadingExport, setLoadingExport] = useState(false)
    const [loadingImport, setLoadingImport] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [analise, setAnalise] = useState<ItemAnalise[] | null>(null)
    const [sucesso, setSucesso] = useState<{ count: number } | null>(null)
    const [mostrarCampos, setMostrarCampos] = useState(false)
    const [mostrarSoProblemas, setMostrarSoProblemas] = useState(false)

    // ── EXPORTAR ──────────────────────────────────────────────────────────────
    async function handleExport() {
        setLoadingExport(true)
        try {
            const { exportarMembrosCSV } = await import('@/actions/membro-actions')
            const res = await exportarMembrosCSV()
            if (res.csv) {
                const BOM = '\uFEFF' // BOM para Excel abrir correctamente com acentos
                const blob = new Blob([BOM + res.csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.download = `membros_admvc_${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
            } else {
                toast(res.error || 'Erro ao exportar.', 'erro')
            }
        } catch {
            toast('Erro ao exportar membros.', 'erro')
        } finally {
            setLoadingExport(false)
        }
    }

    // ── DESCARREGAR TEMPLATE ──────────────────────────────────────────────────
    function handleDownloadTemplate() {
        const BOM = '\uFEFF'
        const cabecalho = CABECALHOS_CSV.join(';')
        const exemplo = [
            'Joao', 'Silva', 'joao.silva@email.com', '912345678',
            'Masculino', '1985-03-15', 'Casado(a)', 'Portuguesa',
            'Engenheiro', '123456789', 'CC12345678',
            'Rua das Flores', '10', 'Apt 2', '4000-001',
            'Cedofeita', 'Porto', 'Porto', 'Portugal',
            'Batizado', '2005-06-01', '2003-01-01', '2010-05-15',
            'Diacono', 'Louvor', '',
            'ATIVO', 'USER',
            'Maria Silva', '2010-09-20',
            'Antonio Silva', 'Rosa Silva',
            '', '',
        ].join(';')
        const blob = new Blob([BOM + cabecalho + '\n' + exemplo], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = 'template_importar_membros.csv'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    // ── ANALISAR CSV ──────────────────────────────────────────────────────────
    async function handleAnalyze(e: React.FormEvent) {
        e.preventDefault()
        if (!file) return

        setLoadingImport(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await analisarCSV(formData)
            if (res.resultados) {
                setAnalise(res.resultados)
            } else {
                toast(res.error || 'Erro ao analisar ficheiro.', 'erro')
            }
        } catch {
            toast('Erro ao comunicar com o servidor.', 'erro')
        } finally {
            setLoadingImport(false)
        }
    }

    // ── CONFIRMAR IMPORTACAO ──────────────────────────────────────────────────
    async function handleConfirm() {
        if (!analise) return
        const validos = analise.filter(i => i.status === 'PRONTO')
        if (validos.length === 0) { toast('Nao ha membros validos para importar.', 'aviso'); return }

        setLoadingImport(true)
        try {
            const res = await confirmarImportacao(validos)
            if (res.ok) {
                setSucesso({ count: validos.length })
                setAnalise(null)
                setFile(null)
            } else {
                toast(res.error || 'Erro ao gravar.', 'erro')
            }
        } catch {
            toast('Erro ao comunicar com o servidor.', 'erro')
        } finally {
            setLoadingImport(false)
        }
    }

    // ── CALCULOS ──────────────────────────────────────────────────────────────
    const prontos = analise?.filter(i => i.status === 'PRONTO').length ?? 0
    const duplicados = analise?.filter(i => i.status === 'DUPLICADO').length ?? 0
    const erros = analise?.filter(i => i.status === 'ERRO').length ?? 0

    const analiseVisiveis = analise
        ? mostrarSoProblemas
            ? analise.filter(i => i.status !== 'PRONTO')
            : analise
        : []

    return (
        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700 pb-32">

            {/* HEADER */}
            <header className="flex flex-col gap-2 pb-6 border-b border-soft">
                <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <FileSpreadsheet size={14} /> Gestao de Dados em Massa
                </span>
                <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    Importar <span className="text-muted/30">/ Exportar.</span>
                </h1>
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest">
                    Gerencie membros em lote via ficheiro CSV — separador ponto-e-virgula (;)
                </p>
            </header>

            {/* SUCESSO */}
            {sucesso && (
                <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase italic text-emerald-700">Importacao concluida!</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-600/80 mt-0.5">
                                {sucesso.count} membro{sucesso.count !== 1 ? 's' : ''} adicionado{sucesso.count !== 1 ? 's' : ''} ao sistema
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setSucesso(null)}
                        className="text-emerald-600 hover:bg-emerald-500/20 p-2 rounded-xl transition-all">
                        <X size={16} />
                    </button>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">

                {/* ── EXPORTAR ─────────────────────────────────────────────── */}
                <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-soft">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-blue-500/10 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                                <Download size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-fg">Exportar Membros</h3>
                                <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-0.5">
                                    Download de todos os membros em CSV
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-1.5">
                                <Info size={10} /> Campos exportados ({CABECALHOS_CSV.length})
                            </p>
                            <p className="text-[9px] text-blue-600/80 font-medium leading-relaxed">
                                {CABECALHOS_CSV.slice(0, 8).join(', ')}... e mais {CABECALHOS_CSV.length - 8} campos
                            </p>
                        </div>
                        <button
                            onClick={handleExport}
                            disabled={loadingExport}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {loadingExport ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            {loadingExport ? 'A exportar...' : 'Exportar CSV'}
                        </button>
                    </div>
                </section>

                {/* ── IMPORTAR ─────────────────────────────────────────────── */}
                <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-soft">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center shrink-0">
                                <Upload size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-fg">Importar Membros</h3>
                                <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-0.5">
                                    Envie um CSV com separador ; (ponto-e-virgula)
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* TEMPLATE */}
                        <button
                            onClick={handleDownloadTemplate}
                            className="w-full flex items-center justify-center gap-2 bg-bg border border-soft text-muted py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:border-figueira/40 hover:text-figueira transition-all"
                        >
                            <Download size={13} /> Descarregar Template CSV
                        </button>

                        {!analise && !sucesso && (
                            <form onSubmit={handleAnalyze} className="space-y-3">
                                <div className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer
                                    ${file ? 'border-figueira/40 bg-figueira/3' : 'border-soft hover:border-figueira/30'}`}
                                    onClick={() => document.getElementById('file-input')?.click()}
                                >
                                    <input
                                        id="file-input"
                                        type="file"
                                        accept=".csv"
                                        className="hidden"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                    />
                                    {file ? (
                                        <div className="space-y-1">
                                            <CheckCircle2 size={20} className="mx-auto text-figueira" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-figueira">{file.name}</p>
                                            <p className="text-[8px] text-muted font-bold uppercase">
                                                {(file.size / 1024).toFixed(1)} KB — Clica para trocar
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload size={20} className="mx-auto text-muted/40" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                                                Clica para seleccionar o ficheiro CSV
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={!file || loadingImport}
                                    className="w-full flex items-center justify-center gap-2 bg-fg text-bg py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-figueira transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                >
                                    {loadingImport ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                                    {loadingImport ? 'A analisar...' : 'Analisar Ficheiro'}
                                </button>
                            </form>
                        )}
                    </div>
                </section>
            </div>

            {/* ── DICIONARIO DE CAMPOS ────────────────────────────────────── */}
            <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <button
                    onClick={() => setMostrarCampos(!mostrarCampos)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-soft/20 transition-all"
                >
                    <div className="flex items-center gap-3">
                        <Info size={14} className="text-muted" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-fg">
                            Dicionario de Campos ({CABECALHOS_CSV.length} campos)
                        </span>
                    </div>
                    {mostrarCampos ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
                </button>
                {mostrarCampos && (
                    <div className="border-t border-soft p-5 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {CABECALHOS_CSV.map((campo, i) => (
                                <div key={campo} className="flex items-start gap-2 p-2.5 rounded-xl bg-bg border border-soft/50">
                                    <span className="text-[7px] font-black text-muted/50 w-5 shrink-0 mt-0.5">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <div className="min-w-0">
                                        <p className={`text-[9px] font-black uppercase tracking-widest leading-none
                                            ${CAMPOS_OBRIGATORIOS.includes(campo) ? 'text-figueira' : 'text-fg'}`}>
                                            {campo}
                                            {CAMPOS_OBRIGATORIOS.includes(campo) && ' *'}
                                        </p>
                                        <p className="text-[8px] text-muted font-medium mt-0.5 truncate">
                                            {LABELS_CAMPOS[campo] || campo}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[8px] font-bold text-figueira uppercase tracking-widest mt-4 flex items-center gap-1">
                            <AlertTriangle size={9} /> Campos marcados com * sao obrigatorios
                        </p>
                    </div>
                )}
            </div>

            {/* ── RESULTADO DA ANALISE ────────────────────────────────────── */}
            {analise && (
                <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">

                    {/* CABECALHO */}
                    <div className="p-6 border-b border-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-tight text-fg">Relatorio de Analise</h3>
                            <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1">
                                {analise.length} linha{analise.length !== 1 ? 's' : ''} processada{analise.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => { setAnalise(null); setFile(null) }}
                                className="px-4 py-2.5 border border-soft rounded-xl text-[9px] font-black uppercase tracking-widest text-muted hover:bg-soft transition-all">
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={prontos === 0 || loadingImport}
                                className="flex items-center gap-2 bg-figueira text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                            >
                                {loadingImport ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                {loadingImport ? 'A importar...' : `Importar ${prontos}`}
                            </button>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-3 divide-x divide-soft border-b border-soft">
                        {[
                            { label: 'Prontos', value: prontos, cor: 'text-emerald-600 bg-emerald-500/8' },
                            { label: 'Duplicados', value: duplicados, cor: 'text-orange-600 bg-orange-500/8' },
                            { label: 'Erros', value: erros, cor: 'text-red-600 bg-red-500/8' },
                        ].map(k => (
                            <div key={k.label} className={`px-6 py-4 text-center ${k.cor}`}>
                                <p className="text-2xl font-black italic">{k.value}</p>
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{k.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* FILTRO */}
                    {(duplicados > 0 || erros > 0) && (
                        <div className="px-6 py-3 border-b border-soft flex items-center gap-3">
                            <button
                                onClick={() => setMostrarSoProblemas(!mostrarSoProblemas)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border
                                    ${mostrarSoProblemas ? 'bg-fg text-bg border-fg' : 'bg-bg border-soft text-muted hover:border-figueira/30'}`}
                            >
                                <AlertTriangle size={10} />
                                Mostrar so problemas ({duplicados + erros})
                            </button>
                        </div>
                    )}

                    {/* TABELA */}
                    <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                        <table className="w-full text-left min-w-[700px]">
                            <thead className="sticky top-0 bg-bg z-10">
                                <tr className="border-b border-soft">
                                    <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-muted w-12">Ln</th>
                                    <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-muted w-28">Estado</th>
                                    <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-muted">Nome</th>
                                    <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-muted">E-mail</th>
                                    <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-muted">Telemovel</th>
                                    <th className="px-5 py-3 text-[8px] font-black uppercase tracking-widest text-muted">Detalhe</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-soft/50">
                                {analiseVisiveis.map((item, idx) => (
                                    <tr key={idx} className={`hover:bg-soft/10 transition-colors
                                        ${item.status === 'ERRO' ? 'bg-red-500/3' : ''}
                                        ${item.status === 'DUPLICADO' ? 'bg-orange-500/3' : ''}`}>

                                        <td className="px-5 py-3 text-[9px] font-bold text-muted">{item.linha}</td>

                                        <td className="px-5 py-3">
                                            {item.status === 'PRONTO' && (
                                                <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest">
                                                    Pronto
                                                </span>
                                            )}
                                            {item.status === 'DUPLICADO' && (
                                                <span className="bg-orange-500/10 text-orange-700 border border-orange-500/20 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest">
                                                    Duplicado
                                                </span>
                                            )}
                                            {item.status === 'ERRO' && (
                                                <span className="bg-red-500/10 text-red-700 border border-red-500/20 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest">
                                                    Erro
                                                </span>
                                            )}
                                        </td>

                                        <td className="px-5 py-3">
                                            <p className="text-[10px] font-black text-fg uppercase leading-none">
                                                {item.dados?.first_name} {item.dados?.last_name}
                                            </p>
                                            {item.dados?.church_role && (
                                                <p className="text-[8px] text-muted font-bold uppercase tracking-widest mt-0.5">
                                                    {item.dados.church_role}
                                                </p>
                                            )}
                                        </td>

                                        <td className="px-5 py-3">
                                            <p className="text-[9px] text-muted font-medium truncate max-w-[160px]">
                                                {item.dados?.email || '—'}
                                            </p>
                                        </td>

                                        <td className="px-5 py-3">
                                            <p className="text-[9px] text-muted font-medium">
                                                {item.dados?.phone_1 || '—'}
                                            </p>
                                        </td>

                                        <td className="px-5 py-3">
                                            {item.status === 'PRONTO' ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {item.dados?.id_city && (
                                                        <span className="text-[7px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                            {item.dados.id_city}
                                                        </span>
                                                    )}
                                                    {item.dados?.status && (
                                                        <span className="text-[7px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                            {item.dados.status}
                                                        </span>
                                                    )}
                                                    {item.dados?.baptism_status && (
                                                        <span className="text-[7px] font-bold text-muted bg-soft px-1.5 py-0.5 rounded">
                                                            {item.dados.baptism_status}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[9px] text-red-600 font-bold italic">
                                                    {item.motivo || '—'}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* RODAPE */}
                    <div className="px-6 py-4 border-t border-soft flex items-center justify-between bg-bg">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted">
                            A mostrar {analiseVisiveis.length} de {analise.length} linha{analise.length !== 1 ? 's' : ''}
                        </p>
                        {prontos > 0 && (
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                {prontos} membro{prontos !== 1 ? 's' : ''} pronto{prontos !== 1 ? 's' : ''} para importar
                            </p>
                        )}
                    </div>
                </section>
            )}
        </main>
    )
}