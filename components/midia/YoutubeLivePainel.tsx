'use client'

// Mídia → Divulgação → separador YouTube: a capa da live do culto escolhido nos 4 estados (lado a lado), escolher o estado,
// "Aplicar na live do YouTube" (com confirmação) e "Descarregar"; e o histórico do que já foi feito.
// Os dados vêm de um hook (useCapaYoutube) que o separador e a linha de estado do topo partilham.
import { useCallback, useEffect, useRef, useState } from 'react'
import { aplicarLiveYoutube, verLiveYoutube } from '@/app/midia/divulgacao/actions'
import { ESTADOS_CAPA, NOME_DO_ESTADO, enderecoDaCapa, type EstadoCapa } from '@/lib/youtube-capa-dados'
import type { Receita } from '@/lib/divulgacao-kit'
import JanelaGrande from '@/components/app/JanelaGrande'
import CapaYoutubeEditor, { nomeDoPadraoCapa } from '@/components/midia/CapaYoutubeEditor'

type Ver = Extract<Awaited<ReturnType<typeof verLiveYoutube>>, { ver: unknown }>
export type RegistoCapa = Ver['registos'][number]
export const NOME_LIVE = { agendada: 'Agendada', direto: 'Em direto', terminada: 'Terminada' } as const
const NOME_CURTO: Record<EstadoCapa, string> = { agendada: 'Agendada', direto: 'Em direto', arquivo: 'Arquivo', reserva: 'Reserva' }
const ORIGEM: Record<string, string> = { portal: 'Portal', holyrics: 'Holyrics', cron: 'Automático' }

const dia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)} · ${iso.slice(11, 16)}`

export function useCapaYoutube(eventoId: number) {
    const [dados, setDados] = useState<Ver | null>(null)
    const [erro, setErro] = useState<string | null>(null)
    const [estado, setEstadoRaw] = useState<EstadoCapa>('agendada')
    const escolhido = useRef(false)                  // depois de escolher um estado à mão, recarregar (ex.: ao guardar) não o muda
    const setEstado = (e: EstadoCapa) => { escolhido.current = true; setEstadoRaw(e) }
    const [aTrabalhar, setATrabalhar] = useState(false)
    const [feito, setFeito] = useState<string | null>(null)
    const [registos, setRegistos] = useState<RegistoCapa[]>([])
    const [versao, setVersao] = useState(0)

    const carregar = useCallback(async () => {
        setErro(null)
        const r = await verLiveYoutube(eventoId)
        if ('erro' in r) { setErro(r.erro); return }
        setDados(r)
        setRegistos(r.registos)
        if (r.ver.ligado && !escolhido.current) setEstadoRaw(r.ver.estadoSugerido)
    }, [eventoId])
    useEffect(() => { void carregar() }, [carregar])

    async function aplicar(): Promise<boolean> {
        setATrabalhar(true); setFeito(null); setErro(null)
        const r = await aplicarLiveYoutube(eventoId, estado)
        setATrabalhar(false)
        if ('erro' in r) { setErro(r.erro); return false }
        setFeito(r.ok.aviso ?? `Feito: «${r.ok.titulo}». A capa nova pode demorar alguns minutos a aparecer no YouTube.`)
        setRegistos(r.registos); setVersao((v) => v + 1)
        return true
    }
    return { dados, erro, estado, setEstado, aTrabalhar, feito, registos, versao, aplicar, recarregar: carregar, atualizarCapas: () => setVersao((v) => v + 1) }
}
export type CapaYoutube = ReturnType<typeof useCapaYoutube>

/**
 * A capa do YouTube: o padrão e a edição (guardados no kit do culto) e os 4 estados lado a lado.
 * As miniaturas seguem a receita do ecrã (`rv`), mesmo antes de guardar; "Aplicar" guarda primeiro (`garantirGuardado`), porque a live
 * e o cron usam o que está guardado.
 */
export default function YoutubeCapa({ eventoId, yt, guardado, r, rv, mudar, eventoNome, dataISO, aAtualizar, garantirGuardado, onEditar }: {
    eventoId: number; yt: CapaYoutube; guardado: boolean; r: Receita; rv: Receita; mudar: (p: Partial<Receita>) => void
    eventoNome: string; dataISO: string; aAtualizar: boolean; garantirGuardado: () => Promise<boolean>
    /** avisa quando o editor da capa abre ou fecha (o cartão flutuante recolhe-se, como no editor das artes) */
    onEditar?: (aberto: boolean) => void
}) {
    const { dados, erro, estado, setEstado, aTrabalhar, feito, versao } = yt
    const [confirmar, setConfirmar] = useState(false)
    const [grande, setGrande] = useState(false)
    const [editar, setEditar] = useState(false)
    const ver = dados?.ver
    const ligado = !!ver && ver.ligado
    const live = ver && ver.ligado ? ver.live : null

    return (
        <section aria-labelledby="yt-capa" className="a-card space-y-3 p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
                <div data-dv4="padrao-capa" className="min-w-0">
                    <h2 id="yt-capa" className="text-[18px] font-bold">Capa da live</h2>
                    <p className="text-[14px] a-suave">Padrão: <strong>{nomeDoPadraoCapa(r.capaYt.padrao)}</strong>. É a mesma capa na live, no automático e no Holyrics.</p>
                </div>
                <button type="button" onClick={() => { const v = !editar; setEditar(v); onEditar?.(v) }} aria-expanded={editar} className="a-botao a-botao-secundario !min-h-[44px]">{editar ? 'Fechar o editor' : 'Editar a capa'}</button>
            </header>
            {editar && <CapaYoutubeEditor eventoId={eventoId} r={r} rv={rv} mudar={mudar} eventoNome={eventoNome} dataISO={dataISO} aAtualizar={aAtualizar} />}

            <div role="radiogroup" aria-label="Estado da capa" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ESTADOS_CAPA.map((e) => {
                    const sel = estado === e
                    return (
                        <button key={e} type="button" role="radio" aria-checked={sel} onClick={() => { setEstado(e); setConfirmar(false) }}
                            className="a-foco min-w-0 overflow-hidden rounded-[12px] border text-left aria-checked:ring-2 aria-checked:ring-[var(--a-acento,#f5a524)]"
                            style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img key={`${e}-${versao}`} src={enderecoDaCapa(eventoId, rv, e, { w: 400 })} alt="" loading="lazy" decoding="async" className={`block w-full transition-opacity ${aAtualizar ? 'opacity-60' : ''}`}
                                style={{ aspectRatio: '16 / 9', background: 'var(--a-borda)', objectFit: 'cover' }} />
                            <span className="flex items-center justify-between gap-1 px-2 py-1.5 text-[14px] font-semibold">
                                <span className="truncate">{NOME_CURTO[e]}</span>
                                {ver && ver.ligado && e === ver.estadoSugerido && <span className="shrink-0 text-[12px] font-normal a-suave">sugerido</span>}
                            </span>
                        </button>
                    )
                })}
            </div>
            {!guardado && <p className="text-[13px] a-suave">Há mudanças por guardar: as capas mostram-nas já. Ao aplicar na live, guarda-se primeiro.</p>}

            {!dados && !erro && <p className="a-suave" role="status">A ver as lives do canal…</p>}
            {erro && <p role="alert" className="rounded-[12px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-borda)' }}>{erro}</p>}
            {feito && <p role="status" className="rounded-[12px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-borda)' }}>{feito}</p>}
            {ver && !ver.ligado && (
                <p className="text-[15px] a-suave">{(ver as { mensagem?: string }).mensagem} Quem trata do portal tem de a ligar uma vez; até lá, descarregue a capa e ponha-a no YouTube Studio.</p>
            )}
            {ligado && (
                <p className="text-[14px] a-suave">
                    {live ? <>Live deste culto: <strong className="break-words">{live.titulo || 'Sem título'}</strong> · {NOME_LIVE[live.estado]} · {dia(live.quando)}</>
                        : (ver as { aviso?: string | null }).aviso ?? 'Ainda não há live agendada à hora deste culto.'}
                </p>
            )}

            {!confirmar && (
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" className="a-botao a-botao-principal !min-h-[48px] sm:flex-1" disabled={!live || aTrabalhar} onClick={async () => { if (await garantirGuardado()) setConfirmar(true) }}>Aplicar na live do YouTube</button>
                    <a className="a-botao a-botao-secundario !min-h-[48px]" href={enderecoDaCapa(eventoId, r, estado, { descarregar: true })}>Descarregar</a>
                    <button type="button" className="a-botao a-botao-secundario !min-h-[48px]" onClick={() => setGrande(true)}>Ver em grande</button>
                </div>
            )}
            {ligado && !live && !confirmar && <p className="text-[13px] a-suave">O botão acende quando houver uma live à hora do culto (até {(ver as { toleranciaMin: number }).toleranciaMin} minutos de diferença).</p>}

            {confirmar && ligado && live && (
                <div role="group" aria-label="Confirmar" className="space-y-3 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-destaque)' }}>
                    <p className="text-[15px]"><span className="a-suave">Live:</span> <strong className="break-words">{live.titulo}</strong><br /><span className="a-suave">{NOME_LIVE[live.estado]} · {dia(live.quando)}</span></p>
                    <p className="text-[15px]"><span className="a-suave">O título passa a:</span><br /><strong className="break-words">{(ver as { titulos: Record<EstadoCapa, string> }).titulos[estado]}</strong></p>
                    <p className="text-[14px] a-suave">Capa: {NOME_DO_ESTADO[estado]}. A descrição não muda.</p>
                    <div className="flex gap-2">
                        <button type="button" className="a-botao a-botao-principal !min-h-[48px] flex-1" disabled={aTrabalhar} onClick={async () => { await yt.aplicar(); setConfirmar(false) }}>{aTrabalhar ? 'A trocar…' : 'Confirmar'}</button>
                        <button type="button" className="a-botao a-botao-secundario !min-h-[48px]" disabled={aTrabalhar} onClick={() => setConfirmar(false)}>Cancelar</button>
                    </div>
                </div>
            )}

            {grande && (
                <JanelaGrande titulo={`Capa da live · ${NOME_CURTO[estado]}`} onFechar={() => setGrande(false)} larga>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enderecoDaCapa(eventoId, r, estado)} alt={`Capa da live (${NOME_DO_ESTADO[estado]})`} className="mx-auto block w-full rounded-[12px]" style={{ aspectRatio: '16 / 9', maxWidth: 'min(100%, 120vh)', background: 'var(--a-borda)' }} />
                </JanelaGrande>
            )}
        </section>
    )
}

/** O que já foi feito (aplicações de capa), para um bloco fechado no fim do separador. */
export function HistoricoCapa({ registos }: { registos: RegistoCapa[] }) {
    if (registos.length === 0) return <p className="text-[15px] a-suave">Ainda não se aplicou nenhuma capa neste culto.</p>
    return (
        <ul className="space-y-1 text-[14px]">
            {registos.map((r) => (
                <li key={r.id} className="rounded-[12px] border px-3 py-2" style={{ borderColor: 'var(--a-borda)' }}>
                    <span className="font-semibold">{r.ok ? 'Feito' : 'Falhou'} · {NOME_DO_ESTADO[r.estado as EstadoCapa] ?? r.estado}</span>
                    <span className="block a-suave">{new Date(r.quando).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })} · {r.por ?? ORIGEM[r.origem] ?? r.origem} ({ORIGEM[r.origem] ?? r.origem})</span>
                    <span className="block break-words a-suave">{r.ok ? r.titulo : r.mensagem}</span>
                </li>
            ))}
        </ul>
    )
}
