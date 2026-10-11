'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { exportarDadosFiscais } from '@/actions/saft-actions'

function gerarCSV(headers: string[], rows: Record<string, any>[], keys: string[]): string {
    const linhas = [
        headers.join(';'),
        ...rows.map(row => keys.map(k => {
            const val = row[k] ?? ''
            const str = String(val)
            // Escapar campos com ; ou "
            if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`
            }
            return str
        }).join(';'))
    ]
    return '\uFEFF' + linhas.join('\n') // BOM para Excel reconhecer UTF-8
}

function downloadCSV(filename: string, csv: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

const DATASETS = {
    contribuicoes: {
        label: 'Contribuicoes',
        headers: ['Data', 'Membro', 'NIF', 'Tipo', 'Valor', 'Metodo', 'Fundo'],
        keys: ['data', 'membro', 'nif', 'tipo', 'valor', 'metodo', 'fundo'],
    },
    despesas: {
        label: 'Despesas',
        headers: ['Data', 'Descricao', 'Fornecedor', 'Valor', 'Categoria', 'Fundo', 'Forma Pagamento'],
        keys: ['data', 'descricao', 'fornecedor', 'valor', 'categoria', 'fundo', 'forma_pagamento'],
    },
    donativos: {
        label: 'Donativos',
        headers: ['Data', 'Doador', 'Valor', 'Fundo', 'Forma Pagamento'],
        keys: ['data', 'doador', 'valor', 'fundo', 'forma_pagamento'],
    },
    lancamentos: {
        label: 'Lancamentos',
        headers: ['Data', 'Campanha', 'Valor', 'Forma Pagamento', 'Fundo'],
        keys: ['data', 'campanha', 'valor', 'forma_pagamento', 'fundo'],
    },
}

type DatasetKey = keyof typeof DATASETS

export default function ExportacaoFiscal() {
    const anoAtual = new Date().getFullYear()
    const [ano, setAno] = useState(anoAtual)
    const [loading, setLoading] = useState(false)
    const [loadingKey, setLoadingKey] = useState<string | null>(null)
    const [dados, setDados] = useState<any>(null)
    const [erro, setErro] = useState<string | null>(null)

    async function carregarDados() {
        setLoading(true)
        setErro(null)
        try {
            const res = await exportarDadosFiscais(ano)
            if (res.success) {
                setDados(res.dados)
                return res.dados
            }
        } catch (e: any) {
            setErro(e.message || 'Erro ao carregar dados')
        } finally {
            setLoading(false)
        }
        return null
    }

    async function exportarCSV(key: DatasetKey) {
        setLoadingKey(key)
        try {
            const d = dados || await carregarDados()
            if (!d) return
            const dataset = DATASETS[key]
            const rows = d[key]
            if (!rows || rows.length === 0) {
                setErro(`Sem dados de ${dataset.label.toLowerCase()} para ${ano}`)
                return
            }
            const csv = gerarCSV(dataset.headers, rows, [...dataset.keys])
            downloadCSV(`${key}_${ano}.csv`, csv)
        } catch (e: any) {
            setErro(e.message || 'Erro ao exportar')
        } finally {
            setLoadingKey(null)
        }
    }

    async function exportarTudo() {
        setLoadingKey('tudo')
        try {
            const d = dados || await carregarDados()
            if (!d) return
            let exportados = 0
            for (const key of Object.keys(DATASETS) as DatasetKey[]) {
                const dataset = DATASETS[key]
                const rows = d[key]
                if (rows && rows.length > 0) {
                    const csv = gerarCSV(dataset.headers, rows, [...dataset.keys])
                    downloadCSV(`${key}_${ano}.csv`, csv)
                    exportados++
                }
            }
            if (exportados === 0) {
                setErro(`Sem dados para exportar em ${ano}`)
            }
        } catch (e: any) {
            setErro(e.message || 'Erro ao exportar')
        } finally {
            setLoadingKey(null)
        }
    }

    // Anos disponiveis (ultimos 5 anos)
    const anos = Array.from({ length: 5 }, (_, i) => anoAtual - i)

    return (
        <div className="space-y-4">
            {/* Seleccao de ano */}
            <div className="bg-bg2 border border-soft rounded-2xl p-5">
                <label className="block text-xs font-bold text-fg uppercase tracking-wide mb-2">
                    Ano fiscal
                </label>
                <select
                    value={ano}
                    onChange={e => { setAno(Number(e.target.value)); setDados(null); setErro(null) }}
                    className="bg-bg border border-soft rounded-xl px-4 py-2.5 text-sm text-fg font-bold focus:outline-none focus:ring-2 focus:ring-figueira/50"
                >
                    {anos.map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
            </div>

            {/* Botoes de export */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.keys(DATASETS) as DatasetKey[]).map(key => {
                    const dataset = DATASETS[key]
                    const isLoading = loadingKey === key
                    const count = dados?.[key]?.length
                    return (
                        <button
                            key={key}
                            onClick={() => exportarCSV(key)}
                            disabled={!!loadingKey}
                            className="flex items-center gap-3 bg-bg2 border border-soft rounded-2xl p-4 hover:border-figueira/30 hover:bg-figueira/5 transition-all disabled:opacity-50 text-left"
                        >
                            {isLoading ? (
                                <Loader2 size={20} className="text-figueira animate-spin shrink-0" />
                            ) : (
                                <FileSpreadsheet size={20} className="text-figueira shrink-0" />
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-fg">{dataset.label} CSV</p>
                                <p className="text-[10px] text-muted uppercase tracking-wide">
                                    {count !== undefined ? `${count} registos` : 'Clique para exportar'}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Exportar tudo */}
            <button
                onClick={exportarTudo}
                disabled={!!loadingKey}
                className="w-full flex items-center justify-center gap-2 bg-figueira text-white rounded-2xl px-6 py-3 font-bold text-sm uppercase tracking-wide hover:bg-figueira/90 transition-all disabled:opacity-50"
            >
                {loadingKey === 'tudo' ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : (
                    <Download size={18} />
                )}
                Exportar Tudo ({ano})
            </button>

            {/* Erro */}
            {erro && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-xs text-red-400">
                    {erro}
                </div>
            )}

            {/* Resumo apos carregar dados */}
            {dados && (
                <div className="bg-bg2 border border-soft rounded-2xl p-5">
                    <h3 className="text-xs font-bold text-fg uppercase tracking-wide mb-3">Resumo {ano}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {(Object.keys(DATASETS) as DatasetKey[]).map(key => (
                            <div key={key} className="text-center">
                                <p className="text-lg font-black text-figueira">{dados[key]?.length || 0}</p>
                                <p className="text-[10px] text-muted uppercase tracking-wide">{DATASETS[key].label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
