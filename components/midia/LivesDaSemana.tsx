'use client'

// Mídia → Divulgação → separador YouTube → "Lives da semana": uma linha por culto dos próximos 7 dias (o portal cria as lives sozinho):
// dia e hora, nome, estado, "Transmitir" sim/não, "Criar agora" e "Ver no YouTube". O "Ligar o YoloBox" fica numa gaveta fechada no fim.
import { useCallback, useEffect, useState } from 'react'
import { criarLiveAgora, escolherTransmitir, verSemanaDeLives } from '@/app/midia/divulgacao/lives-actions'
import Gaveta from '@/components/app/Gaveta'
import LigarYoloBox from '@/components/midia/LigarYoloBox'
import { NOME_ESTADO_LIVE, type EstadoLiveCulto } from '@/lib/youtube-regra'

import type { SemanaDeLives } from '@/lib/youtube-semana'
type Semana = Extract<SemanaDeLives, { ligado: true }>

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
// "2026-11-22T10:00" (hora de Lisboa escrita) → "dom 22/11 · 10h00"
function quando(q: string) {
    const d = new Date(`${q.slice(0, 10)}T00:00:00Z`)
    return `${DIAS[d.getUTCDay()]} ${q.slice(8, 10)}/${q.slice(5, 7)} · ${q.slice(11, 13)}h${q.slice(14, 16)}`
}

const COR: Record<EstadoLiveCulto, string> = {
    'por-criar': 'var(--a-borda)', agendada: 'var(--a-destaque)', ligada: 'var(--a-destaque)', 'no-ar': '#c0392b', terminada: 'var(--a-borda)', 'nao-transmitir': 'var(--a-borda)',
}

export default function LivesDaSemana() {
    const [semana, setSemana] = useState<Semana | null>(null)
    const [erro, setErro] = useState<string | null>(null)
    const [aviso, setAviso] = useState<string | null>(null)
    const [ocupado, setOcupado] = useState<number | null>(null)
    const [apagar, setApagar] = useState<number | null>(null)
    const [mensagemNaoLigado, setMensagemNaoLigado] = useState<string | null>(null)

    const carregar = useCallback(async () => {
        const r = await verSemanaDeLives()
        if ('erro' in r) { setErro(r.erro); return }
        if (!r.ligado) { setMensagemNaoLigado((r as { mensagem?: string }).mensagem ?? null); return }
        setErro(null); setSemana(r)
    }, [])
    useEffect(() => { void carregar() }, [carregar])

    async function correr(id: number, f: () => Promise<{ ok: string; semana: SemanaDeLives } | { erro: string }>) {
        setOcupado(id); setErro(null); setAviso(null); setApagar(null)
        const r = await f()
        setOcupado(null)
        if ('erro' in r) { setErro(r.erro); return }
        setAviso(r.ok)
        if (r.semana.ligado) setSemana(r.semana)
    }

    return (
        <>
            <section aria-labelledby="lv-titulo" className="a-card space-y-3 p-4">
                <header>
                    <h2 id="lv-titulo" className="text-[18px] font-bold">Lives da semana</h2>
                    <p className="text-[14px] a-suave">O portal cria a live de cada culto (domingo e quarta) com 7 dias de antecedência, já com título e capa.</p>
                </header>

                {!semana && !erro && !mensagemNaoLigado && <p className="a-suave" role="status">A ver os cultos da semana…</p>}
                {mensagemNaoLigado && <p className="text-[15px] a-suave">{mensagemNaoLigado} Quem trata do portal tem de a ligar uma vez.</p>}
                {erro && <p role="alert" className="rounded-[12px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-borda)' }}>{erro}</p>}
                {aviso && <p role="status" className="rounded-[12px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-borda)' }}>{aviso}</p>}

                {semana && (
                    <>
                        {semana.aviso && <p className="text-[14px] a-suave">{semana.aviso}</p>}
                        {!semana.temChave && (
                            <p className="rounded-[12px] border p-3 text-[14px]" style={{ borderColor: 'var(--a-destaque)' }}>Falta ligar o YoloBox (mais abaixo): sem a chave fixa, as lives criam-se mas o YoloBox não as encontra.</p>
                        )}
                        {semana.linhas.length === 0 && <p className="text-[15px] a-suave">Não há cultos nos próximos 7 dias. Marque-os na Agenda da igreja.</p>}
                        <ul className="a-divide -mx-4 border-y px-0" style={{ borderColor: 'var(--a-borda)' }}>
                            {semana.linhas.map((l) => {
                                const ativo = l.estado !== 'no-ar' && l.estado !== 'terminada'
                                return (
                                    <li key={l.id} className="space-y-2 px-4 py-2.5">
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <span className="w-[150px] shrink-0 whitespace-nowrap text-[15px] font-semibold">{quando(l.quando)}</span>
                                            <span className="min-w-0 flex-1 basis-[140px] truncate text-[15px] a-suave" title={l.nome}>{l.nome}</span>
                                            <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-[13px] font-semibold" style={{ borderColor: COR[l.estado] }}>{NOME_ESTADO_LIVE[l.estado]}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {ativo && (
                                                <button type="button" role="switch" aria-checked={l.quer} disabled={ocupado === l.id}
                                                    onClick={() => (l.quer ? (l.liveId ? setApagar(l.id) : void correr(l.id, () => escolherTransmitir(l.id, false))) : void correr(l.id, () => escolherTransmitir(l.id, true)))}
                                                    className="a-foco inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-[14px] font-semibold" style={{ borderColor: 'var(--a-borda)' }}>
                                                    <span aria-hidden className="relative inline-block h-5 w-9 rounded-full transition-colors" style={{ background: l.quer ? 'var(--a-destaque)' : 'var(--a-borda)' }}>
                                                        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: l.quer ? 18 : 2 }} />
                                                    </span>
                                                    Transmitir: {l.quer ? 'sim' : 'não'}
                                                </button>
                                            )}
                                            {ativo && l.estado === 'por-criar' && (
                                                <button type="button" className="a-botao a-botao-principal !min-h-[44px] !px-4" disabled={ocupado === l.id} onClick={() => correr(l.id, () => criarLiveAgora(l.id))}>{ocupado === l.id ? 'A criar…' : 'Criar agora'}</button>
                                            )}
                                            {l.link && <a className="a-foco inline-flex min-h-[44px] items-center text-[14px] underline" href={l.link} target="_blank" rel="noopener noreferrer">Ver no YouTube</a>}
                                            {l.escolha !== null && <span className="text-[13px] a-suave">escolhido à mão</span>}
                                        </div>
                                        {apagar === l.id && (
                                            <div role="group" aria-label="Confirmar" className="space-y-2 rounded-[12px] border p-3" style={{ borderColor: 'var(--a-destaque)' }}>
                                                <p className="text-[15px]">Isto apaga a live agendada no YouTube. Continuar?</p>
                                                <div className="flex gap-2">
                                                    <button type="button" className="a-botao a-botao-principal !min-h-[44px] flex-1" disabled={ocupado === l.id} onClick={() => correr(l.id, () => escolherTransmitir(l.id, false))}>Apagar a live</button>
                                                    <button type="button" className="a-botao a-botao-secundario !min-h-[44px]" onClick={() => setApagar(null)}>Cancelar</button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>
                    </>
                )}
            </section>

            {!mensagemNaoLigado && (
                <Gaveta titulo="Ligar o YoloBox" resumo="A chave fixa para o YoloCast (só se cola uma vez)">
                    <LigarYoloBox aoMudar={() => void carregar()} />
                </Gaveta>
            )}
        </>
    )
}
