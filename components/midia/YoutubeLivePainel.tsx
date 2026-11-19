'use client'

// Mídia → Divulgação: a capa e o título da live do YouTube de um culto. Mostra as lives do canal (agendadas e em direto) e o culto
// a que cada uma está ligada, o estado da capa (já escolhido pela hora do culto) e, antes de trocar, a live e o título que vai ficar.
import { useCallback, useEffect, useState } from 'react'
import { aplicarLiveYoutube, verLiveYoutube } from '@/app/midia/divulgacao/actions'
import { ESTADOS_CAPA, NOME_DO_ESTADO, type EstadoCapa } from '@/lib/youtube-capa-dados'

type Ver = Extract<Awaited<ReturnType<typeof verLiveYoutube>>, { ver: unknown }>
type Registo = Ver['registos'][number]

const dia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)} · ${iso.slice(11, 16)}`
const NOME_LIVE = { agendada: 'Agendada', direto: 'Em direto', terminada: 'Terminada' } as const
const ORIGEM: Record<string, string> = { portal: 'Portal', holyrics: 'Holyrics', cron: 'Automático' }

export default function YoutubeLivePainel({ eventoId }: { eventoId: number }) {
    const [dados, setDados] = useState<Ver | null>(null)
    const [erro, setErro] = useState<string | null>(null)
    const [estado, setEstado] = useState<EstadoCapa>('agendada')
    const [confirmar, setConfirmar] = useState(false)
    const [aTrabalhar, setATrabalhar] = useState(false)
    const [feito, setFeito] = useState<string | null>(null)
    const [registos, setRegistos] = useState<Registo[]>([])
    const [versao, setVersao] = useState(0)

    const carregar = useCallback(async () => {
        setErro(null)
        const r = await verLiveYoutube(eventoId)
        if ('erro' in r) { setErro(r.erro); return }
        setDados(r)
        setRegistos(r.registos)
        if (r.ver.ligado) setEstado(r.ver.estadoSugerido)
    }, [eventoId])

    useEffect(() => { void carregar() }, [carregar])

    async function aplicar() {
        setATrabalhar(true); setFeito(null); setErro(null)
        const r = await aplicarLiveYoutube(eventoId, estado)
        setATrabalhar(false); setConfirmar(false)
        if ('erro' in r) { setErro(r.erro); return }
        setFeito(r.ok.aviso ?? `Feito: «${r.ok.titulo}». A capa nova pode demorar alguns minutos a aparecer no YouTube.`)
        setRegistos(r.registos); setVersao((v) => v + 1)
    }

    const ver = dados?.ver
    return (
        <section aria-labelledby="yt-titulo" className="a-card space-y-4 p-4">
            <header>
                <h2 id="yt-titulo" className="text-[20px] font-bold">Capa na live do YouTube</h2>
                <p className="text-[15px] a-suave">Põe a capa e o título certos na live agendada deste culto.</p>
            </header>

            {!dados && !erro && <p className="a-suave" role="status">A ver as lives do canal…</p>}
            {erro && <p role="alert" className="rounded-[12px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-borda)' }}>{erro}</p>}
            {feito && <p role="status" className="rounded-[12px] border p-3 text-[15px]" style={{ borderColor: 'var(--a-borda)' }}>{feito}</p>}

            {ver && !ver.ligado && (
                <p className="text-[15px] a-suave">{(ver as { mensagem?: string }).mensagem} Quem trata do portal tem de a ligar uma vez; até lá, use a capa da live da Divulgação (acima) no YouTube Studio.</p>
            )}

            {ver && ver.ligado && (
                <>
                    <div className="space-y-2">
                        <h3 className="text-[16px] font-semibold">Lives encontradas</h3>
                        {ver.lives.length === 0 && <p className="text-[15px] a-suave">Não há lives agendadas nem em direto no canal. Agende uma no YouTube à hora do culto.</p>}
                        <ul className="space-y-2">
                            {ver.lives.map((l) => (
                                <li key={l.id} className="rounded-[14px] border px-3 py-2 text-[15px]" style={{ borderColor: l.id === ver.live?.id ? 'var(--a-destaque)' : 'var(--a-borda)' }}>
                                    <span className="block break-words font-semibold">{l.titulo || 'Sem título'}</span>
                                    <span className="block a-suave">{NOME_LIVE[l.estado]} · {dia(l.quando)}</span>
                                    <span className="block a-suave">{l.cultoNome ? `Ligada a: ${l.cultoNome}` : 'Sem culto na Agenda a essa hora'}{l.id === ver.live?.id ? ' (este culto)' : ''}</span>
                                </li>
                            ))}
                        </ul>
                        {ver.aviso && <p className="text-[15px]">{ver.aviso}</p>}
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-[16px] font-semibold">Estado da capa</h3>
                        <div role="radiogroup" aria-label="Estado da capa" className="flex flex-wrap gap-2">
                            {ESTADOS_CAPA.map((e) => (
                                <button key={e} type="button" role="radio" aria-checked={estado === e} onClick={() => { setEstado(e); setConfirmar(false) }}
                                    className="a-foco min-h-[44px] rounded-full border px-4 text-[15px] font-semibold aria-checked:ring-2 aria-checked:ring-[var(--a-destaque)]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                    {NOME_DO_ESTADO[e]}{e === ver.estadoSugerido ? ' · sugerido' : ''}
                                </button>
                            ))}
                        </div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img key={`${estado}-${versao}`} src={`/api/divulgacao/capa-live?evento=${eventoId}&estado=${estado}&v=${versao}`} alt={`Capa da live (${NOME_DO_ESTADO[estado]})`}
                            className="w-full rounded-[14px] border" style={{ aspectRatio: '16 / 9', borderColor: 'var(--a-borda)', background: 'var(--a-card)' }} />
                        <a className="a-foco inline-flex min-h-[44px] items-center text-[15px] underline" href={`/api/divulgacao/capa-live?evento=${eventoId}&estado=${estado}&download=1`}>Descarregar esta capa</a>
                    </div>

                    {!confirmar && (
                        <button type="button" className="a-botao a-botao-principal !min-h-[48px] w-full" disabled={!ver.live || aTrabalhar} onClick={() => setConfirmar(true)}>
                            Aplicar na live do YouTube
                        </button>
                    )}
                    {!ver.live && <p className="text-[14px] a-suave">O botão acende quando houver uma live à hora do culto (até {ver.toleranciaMin} minutos de diferença).</p>}

                    {confirmar && ver.live && (
                        <div role="group" aria-label="Confirmar" className="space-y-3 rounded-[14px] border p-3" style={{ borderColor: 'var(--a-destaque)' }}>
                            <p className="text-[15px]"><span className="a-suave">Live:</span> <strong className="break-words">{ver.live.titulo}</strong><br /><span className="a-suave">{NOME_LIVE[ver.live.estado]} · {dia(ver.live.quando)}</span></p>
                            <p className="text-[15px]"><span className="a-suave">O título passa a:</span><br /><strong className="break-words">{ver.titulos[estado]}</strong></p>
                            <p className="text-[14px] a-suave">Capa: {NOME_DO_ESTADO[estado]}. A descrição não muda.</p>
                            <div className="flex gap-2">
                                <button type="button" className="a-botao a-botao-principal !min-h-[48px] flex-1" disabled={aTrabalhar} onClick={aplicar}>{aTrabalhar ? 'A trocar…' : 'Confirmar'}</button>
                                <button type="button" className="a-botao a-botao-secundario !min-h-[48px]" disabled={aTrabalhar} onClick={() => setConfirmar(false)}>Cancelar</button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {registos.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-[16px] font-semibold">O que já foi feito</h3>
                    <ul className="space-y-1 text-[14px]">
                        {registos.map((r) => (
                            <li key={r.id} className="rounded-[12px] border px-3 py-2" style={{ borderColor: 'var(--a-borda)' }}>
                                <span className="font-semibold">{r.ok ? 'Feito' : 'Falhou'} · {NOME_DO_ESTADO[r.estado as EstadoCapa] ?? r.estado}</span>
                                <span className="block a-suave">{new Date(r.quando).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' })} · {r.por ?? ORIGEM[r.origem] ?? r.origem} ({ORIGEM[r.origem] ?? r.origem})</span>
                                <span className="block break-words a-suave">{r.ok ? r.titulo : r.mensagem}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    )
}
