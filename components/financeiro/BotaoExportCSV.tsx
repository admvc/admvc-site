'use client'

import { FileSpreadsheet } from 'lucide-react'

interface CSVData {
    resumo: { totalEntradas: number; totalSaidas: number; resultado: number }
    fundos: { nome: string; saldo_atual: number; entradas: number; saidas: number }[]
    fluxoMensal: { mes: string; entradas: number; saidas: number; saldo: number }[]
    comparativo: { categoria: string; esteMes: number; mesAnterior: number; mesmoMesAnoAnterior: number }[]
}

export default function BotaoExportCSV({ data }: { data: CSVData }) {
    function gerarCSV() {
        const linhas: string[] = []

        // Resumo
        linhas.push('=== RESUMO GERAL ===')
        linhas.push('Descricao,Valor')
        linhas.push(`Total Entradas,${data.resumo.totalEntradas.toFixed(2)}`)
        linhas.push(`Total Saidas,${data.resumo.totalSaidas.toFixed(2)}`)
        linhas.push(`Resultado,${data.resumo.resultado.toFixed(2)}`)
        linhas.push('')

        // Fundos
        linhas.push('=== BALANCETE POR FUNDO ===')
        linhas.push('Fundo,Saldo Atual,Entradas,Saidas')
        for (const f of data.fundos) {
            linhas.push(`"${f.nome}",${f.saldo_atual.toFixed(2)},${f.entradas.toFixed(2)},${f.saidas.toFixed(2)}`)
        }
        linhas.push('')

        // Fluxo Mensal
        linhas.push('=== FLUXO DE CAIXA MENSAL ===')
        linhas.push('Mes,Entradas,Saidas,Saldo')
        for (const f of data.fluxoMensal) {
            linhas.push(`${f.mes},${f.entradas.toFixed(2)},${f.saidas.toFixed(2)},${f.saldo.toFixed(2)}`)
        }
        linhas.push('')

        // Comparativo
        linhas.push('=== COMPARATIVO MENSAL ===')
        linhas.push('Categoria,Este Mes,Mes Anterior,Mesmo Mes Ano Anterior')
        for (const c of data.comparativo) {
            linhas.push(`${c.categoria},${c.esteMes.toFixed(2)},${c.mesAnterior.toFixed(2)},${c.mesmoMesAnoAnterior.toFixed(2)}`)
        }

        const csv = linhas.join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <button
            onClick={gerarCSV}
            className="flex items-center gap-2 bg-bg2 border border-soft rounded-2xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-fg hover:border-figueira/30 transition-all"
        >
            <FileSpreadsheet size={14} />
            Exportar CSV
        </button>
    )
}
