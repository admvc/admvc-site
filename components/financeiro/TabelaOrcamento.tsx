'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { salvarOrcamento } from '@/actions/orcamento-actions'
import { AlertTriangle, Save, ChevronLeft, ChevronRight } from 'lucide-react'

interface Fundo {
    id: number
    nome: string
    tipo: string
}

interface Categoria {
    id: number
    fundo_id: number
    nome: string
}

interface OrcamentoItem {
    id: number
    fundo_id: number
    categoria_id: number
    ano: number
    valor_previsto: number
}

interface Props {
    fundos: Fundo[]
    categorias: Categoria[]
    orcamentos: OrcamentoItem[]
    despesasAgregadas: Record<string, number>
    ano: number
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
    }).format(value)
}

function ProgressBar({ percentagem }: { percentagem: number }) {
    const capped = Math.min(percentagem, 100)
    let cor = 'bg-green-500'
    if (percentagem >= 100) cor = 'bg-red-500'
    else if (percentagem >= 80) cor = 'bg-orange-500'

    return (
        <div className="w-full bg-soft/40 rounded-full h-2 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${cor}`}
                style={{ width: `${capped}%` }}
            />
        </div>
    )
}

export default function TabelaOrcamento({
    fundos,
    categorias,
    orcamentos,
    despesasAgregadas,
    ano,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [fundoSelecionado, setFundoSelecionado] = useState<number>(
        fundos[0]?.id ?? 0
    )
    const [editValues, setEditValues] = useState<Record<number, string>>({})
    const [savingId, setSavingId] = useState<number | null>(null)
    const [mensagem, setMensagem] = useState<string | null>(null)

    const categoriasFundo = categorias.filter(
        (c) => c.fundo_id === fundoSelecionado
    )

    // Map orcamentos by categoria_id for quick lookup
    const orcamentoMap: Record<number, OrcamentoItem> = {}
    for (const o of orcamentos) {
        if (o.fundo_id === fundoSelecionado) {
            orcamentoMap[o.categoria_id] = o
        }
    }

    // Build rows
    const rows = categoriasFundo.map((cat) => {
        const orc = orcamentoMap[cat.id]
        const previsto = orc?.valor_previsto ?? 0
        const key = `${fundoSelecionado}-${cat.id}`
        const real = despesasAgregadas[key] ?? 0
        const diferenca = previsto - real
        const percentagem = previsto > 0 ? (real / previsto) * 100 : real > 0 ? 100 : 0

        return {
            categoriaId: cat.id,
            categoriaNome: cat.nome,
            previsto,
            real,
            diferenca,
            percentagem,
        }
    })

    const totalPrevisto = rows.reduce((s, r) => s + r.previsto, 0)
    const totalReal = rows.reduce((s, r) => s + r.real, 0)
    const totalDiferenca = totalPrevisto - totalReal
    const totalPercentagem =
        totalPrevisto > 0 ? (totalReal / totalPrevisto) * 100 : 0

    const alertas = rows.filter((r) => r.percentagem > 100)

    function handleYearChange(delta: number) {
        const novoAno = ano + delta
        router.push(`/financeiro/orcamento?ano=${novoAno}`)
    }

    async function handleSave(categoriaId: number) {
        const rawValue = editValues[categoriaId]
        if (rawValue === undefined) return

        const valor = parseFloat(rawValue.replace(',', '.'))
        if (isNaN(valor) || valor < 0) {
            setMensagem('Valor invalido.')
            return
        }

        setSavingId(categoriaId)
        setMensagem(null)

        try {
            await salvarOrcamento(fundoSelecionado, categoriaId, ano, valor)
            // Clear edit value and refresh
            setEditValues((prev) => {
                const next = { ...prev }
                delete next[categoriaId]
                return next
            })
            startTransition(() => {
                router.refresh()
            })
        } catch (err: any) {
            setMensagem(err.message || 'Erro ao guardar.')
        } finally {
            setSavingId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-xl font-black uppercase tracking-tight text-fg">
                    Orcamento Anual
                </h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleYearChange(-1)}
                        className="p-2 rounded-lg hover:bg-soft/30 text-muted hover:text-fg transition-all"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-lg font-black text-fg min-w-[4ch] text-center">
                        {ano}
                    </span>
                    <button
                        onClick={() => handleYearChange(1)}
                        className="p-2 rounded-lg hover:bg-soft/30 text-muted hover:text-fg transition-all"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Alert banner */}
            {alertas.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-red-400">
                            {alertas.length} categoria{alertas.length > 1 ? 's' : ''} acima do orcamento
                        </p>
                        <p className="text-xs text-red-400/70 mt-1">
                            {alertas.map((a) => a.categoriaNome).join(', ')}
                        </p>
                    </div>
                </div>
            )}

            {/* Fund selector tabs */}
            {fundos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {fundos.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFundoSelecionado(f.id)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                                fundoSelecionado === f.id
                                    ? 'bg-figueira/10 text-figueira'
                                    : 'text-muted hover:bg-soft/30 hover:text-fg'
                            }`}
                        >
                            {f.nome}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-muted text-sm">
                    Nenhum fundo financeiro encontrado. Crie fundos primeiro.
                </div>
            )}

            {/* Feedback message */}
            {mensagem && (
                <p className="text-xs text-red-400">{mensagem}</p>
            )}

            {/* Table */}
            {categoriasFundo.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-soft">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-soft/20 text-[10px] font-black uppercase tracking-widest text-muted">
                                <th className="text-left px-4 py-3">Categoria</th>
                                <th className="text-right px-4 py-3">Previsto</th>
                                <th className="text-right px-4 py-3">Real</th>
                                <th className="text-right px-4 py-3">Diferenca</th>
                                <th className="text-right px-4 py-3 w-24">% Usado</th>
                                <th className="px-4 py-3 w-32">Progresso</th>
                                <th className="px-4 py-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const isEditing = editValues[row.categoriaId] !== undefined
                                const isSaving = savingId === row.categoriaId

                                return (
                                    <tr
                                        key={row.categoriaId}
                                        className="border-t border-soft hover:bg-soft/10 transition-all"
                                    >
                                        <td className="px-4 py-3 font-bold text-fg">
                                            {row.categoriaNome}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={
                                                    isEditing
                                                        ? editValues[row.categoriaId]
                                                        : row.previsto.toFixed(2)
                                                }
                                                onChange={(e) =>
                                                    setEditValues((prev) => ({
                                                        ...prev,
                                                        [row.categoriaId]: e.target.value,
                                                    }))
                                                }
                                                className="w-28 text-right bg-transparent border border-soft/50 rounded-lg px-2 py-1 text-fg focus:border-figueira focus:outline-none transition-all text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted">
                                            {formatCurrency(row.real)}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-right font-bold ${
                                                row.diferenca < 0
                                                    ? 'text-red-400'
                                                    : 'text-green-400'
                                            }`}
                                        >
                                            {formatCurrency(row.diferenca)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted">
                                            {row.percentagem.toFixed(1)}%
                                        </td>
                                        <td className="px-4 py-3">
                                            <ProgressBar percentagem={row.percentagem} />
                                        </td>
                                        <td className="px-4 py-3">
                                            {isEditing && (
                                                <button
                                                    onClick={() => handleSave(row.categoriaId)}
                                                    disabled={isSaving}
                                                    className="p-1.5 rounded-lg text-figueira hover:bg-figueira/10 transition-all disabled:opacity-50"
                                                    title="Guardar"
                                                >
                                                    <Save size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}

                            {/* Totals row */}
                            <tr className="border-t-2 border-soft bg-soft/10 font-black">
                                <td className="px-4 py-3 text-fg uppercase text-xs tracking-widest">
                                    Total
                                </td>
                                <td className="px-4 py-3 text-right text-fg">
                                    {formatCurrency(totalPrevisto)}
                                </td>
                                <td className="px-4 py-3 text-right text-muted">
                                    {formatCurrency(totalReal)}
                                </td>
                                <td
                                    className={`px-4 py-3 text-right ${
                                        totalDiferenca < 0
                                            ? 'text-red-400'
                                            : 'text-green-400'
                                    }`}
                                >
                                    {formatCurrency(totalDiferenca)}
                                </td>
                                <td className="px-4 py-3 text-right text-muted">
                                    {totalPercentagem.toFixed(1)}%
                                </td>
                                <td className="px-4 py-3">
                                    <ProgressBar percentagem={totalPercentagem} />
                                </td>
                                <td></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : fundoSelecionado ? (
                <div className="text-center py-12 text-muted text-sm">
                    Nenhuma categoria encontrada para este fundo.
                </div>
            ) : null}
        </div>
    )
}
