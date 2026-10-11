'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
    FileText, X, Printer, Loader2, MessageCircle,
    ChevronLeft, ChevronRight, TrendingUp, Calendar,
    HandCoins, Receipt, Heart, Ticket, CheckCircle2
} from 'lucide-react'
import { buscarExtratoFinanceiroMembro } from '@/actions/financeiro-actions'

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const TIPO_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string }> = {
    DIZIMO: { label: 'Dízimo', cor: 'text-emerald-700', bg: 'bg-emerald-500/8', border: 'border-emerald-500/20' },
    OFERTA: { label: 'Oferta', cor: 'text-blue-700', bg: 'bg-blue-500/8', border: 'border-blue-500/20' },
    MISSAO: { label: 'Missão', cor: 'text-purple-700', bg: 'bg-purple-500/8', border: 'border-purple-500/20' },
    CARNE: { label: 'Carnê', cor: 'text-figueira', bg: 'bg-figueira/8', border: 'border-figueira/20' },
    RIFA: { label: 'Rifa', cor: 'text-orange-700', bg: 'bg-orange-500/8', border: 'border-orange-500/20' },
}

const tipoConfig = (tipo: string) =>
    TIPO_CONFIG[tipo] ?? { label: tipo, cor: 'text-muted', bg: 'bg-soft', border: 'border-soft' }

const euro = (v: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)

export default function ModalExtratoMembro({ membro }: { membro: any }) {
    const [aberto, setAberto] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [transacoes, setTransacoes] = useState<any[]>([])
    const printRef = useRef<HTMLDivElement>(null)

    const hoje = new Date()
    const [ano, setAno] = useState(hoje.getFullYear())
    const [mes, setMes] = useState(0) // 0 = ano inteiro

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (!aberto || !membro) return
        console.log('MEMBRO ID:', membro?.id, typeof membro?.id)

        carregar()
    }, [aberto, ano, mes])

    async function carregar() {
        setLoading(true)
        const res = await buscarExtratoFinanceiroMembro(membro.id, ano, mes)
        if (res.sucesso) setTransacoes(res.transacoes)
        setLoading(false)
    }

    // ── AGRUPAMENTOS ─────────────────────────────────────────────────────────
    const resumoPorTipo = transacoes.reduce((acc: any, t: any) => {
        if (!acc[t.tipo]) acc[t.tipo] = { total: 0, count: 0 }
        acc[t.tipo].total += t.valor
        acc[t.tipo].count++
        return acc
    }, {})

    const totalGeral = transacoes.reduce((s, t) => s + t.valor, 0)

    // Agrupa por mês para o gráfico de barras
    const porMes = transacoes.reduce((acc: any, t: any) => {
        const m = new Date(t.data).getMonth()
        if (!acc[m]) acc[m] = 0
        acc[m] += t.valor
        return acc
    }, {})
    const maxMes = Math.max(...Object.values(porMes as Record<number, number>), 1)

    const titulo = mes === 0
        ? `Extrato Financeiro — ${ano}`
        : `Extrato Financeiro — ${MESES[mes - 1]} ${ano}`

    // ── IMPRESSÃO ─────────────────────────────────────────────────────────────
    const handleImprimir = () => {
        const conteudo = printRef.current?.innerHTML
        if (!conteudo) return
        const janela = window.open('', '_blank')
        if (!janela) return
        janela.document.write(`
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; padding: 32px 40px; font-size: 11px; }
  
  /* CABEÇALHO */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #111; margin-bottom: 24px; }
  .header-left h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px; }
  .header-left p { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }
  .header-right { text-align: right; }
  .header-right .nome { font-size: 14px; font-weight: 900; text-transform: uppercase; }
  .header-right p { font-size: 10px; color: #666; margin-top: 3px; }
  
  /* RESUMO */
  .resumo { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .resumo-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
  .resumo-card.destaque { background: #f9f9f9; border: 2px solid #111; }
  .resumo-card .label { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #888; }
  .resumo-card .valor { font-size: 18px; font-weight: 900; font-style: italic; margin-top: 4px; }
  .resumo-card .count { font-size: 9px; color: #aaa; margin-top: 2px; }
  
  /* TABELA */
  .section-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.2em; color: #888; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #888; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
  td { padding: 10px 0; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  .td-data { font-weight: 700; color: #444; width: 90px; }
  .td-tipo { width: 100px; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 5px; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; border: 1px solid #e5e7eb; }
  .td-desc { color: #666; }
  .td-valor { text-align: right; font-weight: 900; font-size: 13px; }
  
  /* TOTAL FINAL */
  .total-row { background: #f9f9f9; }
  .total-row td { padding: 14px 0; font-size: 14px; font-weight: 900; border-top: 2px solid #111; border-bottom: none; }
  
  /* RODAPÉ */
  .footer { margin-top: 48px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer .assinatura { text-align: center; }
  .footer .linha { width: 200px; height: 1px; background: #111; margin-bottom: 6px; }
  .footer .assinatura p { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #555; }
  .footer .emissao { font-size: 9px; color: #aaa; }
  
  @media print { body { padding: 20px 24px; } }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>Assembleia de Deus</h1>
    <p>${titulo}</p>
  </div>
  <div class="header-right">
    <div class="nome">${membro.first_name} ${membro.last_name}</div>
    <p>${membro.email || ''}</p>
    <p>Emitido em ${new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
  </div>
</div>

<div class="resumo">
  ${Object.entries(resumoPorTipo).map(([tipo, stats]: any) => `
    <div class="resumo-card">
      <div class="label">${tipoConfig(tipo).label}</div>
      <div class="valor">${euro(stats.total)}</div>
      <div class="count">${stats.count} registo${stats.count !== 1 ? 's' : ''}</div>
    </div>
  `).join('')}
  <div class="resumo-card destaque">
    <div class="label">Total Geral</div>
    <div class="valor">${euro(totalGeral)}</div>
    <div class="count">${transacoes.length} transação${transacoes.length !== 1 ? 'ões' : ''}</div>
  </div>
</div>

<div class="section-title">Detalhamento de Transações</div>

${transacoes.length === 0 ? '<p style="color:#aaa;font-style:italic;padding:16px 0;">Nenhum registo no período selecionado.</p>' : `
<table>
  <thead>
    <tr>
      <th style="text-align:left">Data</th>
      <th style="text-align:left">Categoria</th>
      <th style="text-align:left">Descrição</th>
      <th style="text-align:right">Valor</th>
    </tr>
  </thead>
  <tbody>
    ${transacoes.map(t => `
      <tr>
        <td class="td-data">${new Date(t.data).toLocaleDateString('pt-PT')}</td>
        <td class="td-tipo"><span class="badge">${tipoConfig(t.tipo).label}</span></td>
        <td class="td-desc">${t.descricao || '—'}</td>
        <td class="td-valor">${euro(t.valor)}</td>
      </tr>
    `).join('')}
    <tr class="total-row">
      <td colspan="3" style="font-weight:900;text-transform:uppercase;letter-spacing:0.1em">Total do Período</td>
      <td class="td-valor">${euro(totalGeral)}</td>
    </tr>
  </tbody>
</table>
`}

<div class="footer">
  <div class="emissao">Documento gerado automaticamente — ${new Date().toLocaleDateString('pt-PT')}</div>
  <div class="assinatura">
    <div class="linha"></div>
    <p>Departamento de Tesouraria</p>
  </div>
</div>

</body>
</html>`)
        janela.document.close()
        janela.focus()
        setTimeout(() => { janela.print(); janela.close() }, 400)
    }

    // ── WHATSAPP ──────────────────────────────────────────────────────────────
    const handleWhatsApp = () => {
        let txt = `📊 *EXTRATO FINANCEIRO*\n`
        txt += `👤 ${membro.first_name} ${membro.last_name}\n`
        txt += `📅 _${titulo}_\n\n`

        if (Object.keys(resumoPorTipo).length > 0) {
            txt += `*Resumo por Categoria:*\n`
            Object.entries(resumoPorTipo).forEach(([tipo, s]: any) => {
                txt += `• ${tipoConfig(tipo).label}: ${euro(s.total)} (${s.count} registo${s.count !== 1 ? 's' : ''})\n`
            })
            txt += `\n💰 *Total: ${euro(totalGeral)}*\n`
        } else {
            txt += `_Nenhum registo no período selecionado._\n`
        }

        txt += `\n_Emitido em ${new Date().toLocaleDateString('pt-PT')}_`
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`, '_blank')
    }

    // ── MODAL ─────────────────────────────────────────────────────────────────
    const modal = (
        <div
            className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            style={{ zIndex: 9999 }}
            onClick={() => setAberto(false)}
        >
            <div
                className="bg-bg w-full sm:max-w-3xl rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-soft shadow-2xl flex flex-col max-h-[92vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* HEADER */}
                <div className="flex items-center justify-between p-5 border-b border-soft shrink-0 bg-bg2 rounded-t-[2.5rem]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-figueira/10 text-figueira rounded-2xl flex items-center justify-center shrink-0">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase italic tracking-tighter text-fg leading-none">
                                Extrato Financeiro
                            </h2>
                            <p className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">
                                {membro.first_name} {membro.last_name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleImprimir}
                            className="h-9 px-3 flex items-center gap-1.5 bg-bg border border-soft text-muted hover:text-fg hover:bg-soft rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                            <Printer size={13} /> Imprimir
                        </button>
                        <button
                            onClick={handleWhatsApp}
                            className="h-9 px-3 flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-600 hover:bg-green-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                        >
                            <MessageCircle size={13} /> WhatsApp
                        </button>
                        <button
                            onClick={() => setAberto(false)}
                            className="w-9 h-9 flex items-center justify-center bg-bg border border-soft text-muted hover:bg-soft rounded-xl transition-all"
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* FILTROS */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-soft shrink-0 bg-bg2/50">
                    {/* NAV ANO */}
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setAno(a => a - 1)}
                            className="w-7 h-7 flex items-center justify-center bg-bg border border-soft rounded-lg hover:bg-soft transition-all"
                        >
                            <ChevronLeft size={13} className="text-muted" />
                        </button>
                        <span className="text-sm font-black italic text-fg min-w-[40px] text-center">{ano}</span>
                        <button
                            onClick={() => setAno(a => a + 1)}
                            disabled={ano >= hoje.getFullYear()}
                            className="w-7 h-7 flex items-center justify-center bg-bg border border-soft rounded-lg hover:bg-soft transition-all disabled:opacity-30"
                        >
                            <ChevronRight size={13} className="text-muted" />
                        </button>
                    </div>

                    <div className="h-5 w-px bg-soft" />

                    {/* FILTRO MÊS */}
                    <div className="flex gap-1 flex-wrap">
                        <button
                            onClick={() => setMes(0)}
                            className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${mes === 0 ? 'bg-fg text-bg' : 'bg-bg border border-soft text-muted hover:bg-soft'}`}
                        >
                            Todos
                        </button>
                        {MESES.map((m, i) => (
                            <button
                                key={i}
                                onClick={() => setMes(i + 1)}
                                className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${mes === i + 1 ? 'bg-fg text-bg' : 'bg-bg border border-soft text-muted hover:bg-soft'}`}
                            >
                                {m.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CONTEÚDO */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5" ref={printRef}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 size={24} className="animate-spin text-figueira" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted">A carregar...</p>
                        </div>
                    ) : (
                        <>
                            {/* KPIs */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {Object.entries(resumoPorTipo).map(([tipo, stats]: any) => {
                                    const cfg = tipoConfig(tipo)
                                    return (
                                        <div key={tipo} className={`p-4 rounded-2xl border ${cfg.bg} ${cfg.border} space-y-1.5`}>
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${cfg.cor} opacity-80`}>
                                                {cfg.label}
                                            </p>
                                            <p className={`text-xl font-black italic tracking-tighter leading-none ${cfg.cor}`}>
                                                {euro(stats.total)}
                                            </p>
                                            <p className="text-[8px] font-bold text-muted uppercase tracking-widest">
                                                {stats.count} registo{stats.count !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    )
                                })}
                                <div className="p-4 rounded-2xl border border-figueira/20 bg-figueira/5 space-y-1.5">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-figueira opacity-80">Total</p>
                                    <p className="text-xl font-black italic tracking-tighter leading-none text-figueira">{euro(totalGeral)}</p>
                                    <p className="text-[8px] font-bold text-muted uppercase tracking-widest">{transacoes.length} transações</p>
                                </div>
                            </div>

                            {/* GRÁFICO DE BARRAS POR MÊS (só no modo ano inteiro) */}
                            {mes === 0 && Object.keys(porMes).length > 0 && (
                                <div className="bg-bg2 border border-soft rounded-2xl p-5 space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                        <TrendingUp size={11} /> Evolução Mensal
                                    </p>
                                    <div className="flex items-end gap-1.5 h-20">
                                        {MESES.map((m, i) => {
                                            const val = (porMes as any)[i] ?? 0
                                            const pct = val > 0 ? Math.max((val / maxMes) * 100, 8) : 0
                                            return (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                                                    <div className="w-full relative flex items-end" style={{ height: '64px' }}>
                                                        <div
                                                            className={`w-full rounded-t-lg transition-all duration-500 ${val > 0 ? 'bg-figueira/70 group-hover:bg-figueira' : 'bg-soft'}`}
                                                            style={{ height: `${pct}%` }}
                                                            title={val > 0 ? euro(val) : ''}
                                                        />
                                                    </div>
                                                    <span className="text-[7px] font-black text-muted uppercase">{m.slice(0, 3)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* TABELA DETALHADA */}
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2 pb-2 border-b border-soft">
                                    <Receipt size={11} /> Detalhamento
                                </p>

                                {transacoes.length === 0 ? (
                                    <div className="py-12 text-center border-2 border-dashed border-soft rounded-2xl">
                                        <FileText size={28} className="mx-auto text-muted/30 mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                                            Nenhum registo no período selecionado
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        {transacoes.map(t => {
                                            const cfg = tipoConfig(t.tipo)
                                            return (
                                                <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-bg2 border border-soft rounded-2xl hover:border-figueira/20 transition-all group">
                                                    {/* ÍCONE TIPO */}
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.cor}`}>
                                                        {t.tipo === 'DIZIMO' ? <HandCoins size={14} /> :
                                                            t.tipo === 'CARNE' ? <Receipt size={14} /> :
                                                                t.tipo === 'RIFA' ? <Ticket size={14} /> :
                                                                    t.tipo === 'MISSAO' ? <Heart size={14} /> :
                                                                        <CheckCircle2 size={14} />}
                                                    </div>

                                                    {/* DATA */}
                                                    <div className="shrink-0 text-center min-w-[44px]">
                                                        <p className="text-[7px] font-black uppercase text-muted leading-none">
                                                            {new Date(t.data).toLocaleDateString('pt-PT', { month: 'short' })}
                                                        </p>
                                                        <p className="text-sm font-black italic text-fg leading-none mt-0.5">
                                                            {new Date(t.data).toLocaleDateString('pt-PT', { day: '2-digit' })}
                                                        </p>
                                                    </div>

                                                    {/* DESCRIÇÃO */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${cfg.bg} ${cfg.border} ${cfg.cor}`}>
                                                                {cfg.label}
                                                            </span>
                                                        </div>
                                                        {t.descricao && (
                                                            <p className="text-[9px] text-muted font-medium mt-0.5 truncate">
                                                                {t.descricao}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* VALOR */}
                                                    <p className="text-sm font-black text-fg shrink-0">{euro(t.valor)}</p>
                                                </div>
                                            )
                                        })}

                                        {/* TOTAL */}
                                        <div className="flex items-center justify-between px-4 py-3 bg-figueira/5 border border-figueira/15 rounded-2xl mt-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-figueira">
                                                Total do Período
                                            </p>
                                            <p className="text-base font-black italic text-figueira">{euro(totalGeral)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <>
            <button
                onClick={() => setAberto(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-bg2 border border-soft text-muted hover:border-figueira hover:text-figueira rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm"
            >
                <FileText size={14} /> Extrato
            </button>

            {mounted && aberto && createPortal(modal, document.body)}
        </>
    )
}