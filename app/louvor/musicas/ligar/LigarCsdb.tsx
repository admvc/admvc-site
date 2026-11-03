'use client'

// Ligar as músicas que ainda não têm faixa do CSDB: proposta com confiança, confirmar uma a uma
// ou em lote (alta), escolher outra, ou marcar "não está no CSDB". Lotes pequenos e respeito
// pelo travão de pedidos: se bater, espera e continua sozinho.
import { useCallback, useRef, useState } from 'react'
import { Check, Loader2, Search, Undo2, X } from 'lucide-react'
import {
    confirmarLigacao, confirmarLote, desmarcarForaDoCsdb, marcarForaDoCsdb, procurarOutras, proporLigacoes, type Proposta,
} from '@/actions/musicas-arrumar-actions'
import { formatarDuracao, type ResumoFaixaCsdb } from '@/lib/csdb-dados'

type Linha = { id: string; titulo: string; artista: string | null; tom: string | null }
type Opcao = ResumoFaixaCsdb & { confianca?: Proposta['confianca'] }

const ROTULO = { alta: 'Confiança alta', media: 'Confiança média', baixa: 'Confiança baixa' } as const
const COR = {
    alta: { background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' },
    media: { background: 'var(--a-aviso-suave)', color: 'var(--a-aviso)' },
    baixa: { background: 'var(--a-card)', color: 'inherit', border: '1px solid var(--a-borda)' },
} as const

const LOTE = 4
const POR_VEZ = 20

export default function LigarCsdb({ musicas, marcadas, csdbOk }: { musicas: Linha[]; marcadas: Linha[]; csdbOk: boolean }) {
    const [lista, setLista] = useState(musicas)
    const [fora, setFora] = useState(marcadas)
    const [opcoes, setOpcoes] = useState<Record<string, Opcao[]>>({})
    const [escolha, setEscolha] = useState<Record<string, number>>({})
    const [msg, setMsg] = useState<string | null>(null)
    const [erro, setErro] = useState<string | null>(null)
    const [ocupado, setOcupado] = useState(false)
    const [espera, setEspera] = useState(0)
    const parar = useRef(false)

    const aguardar = useCallback(async (s: number) => {
        for (let i = s; i > 0 && !parar.current; i--) {
            setEspera(i)
            await new Promise((r) => setTimeout(r, 1000))
        }
        setEspera(0)
    }, [])

    const guardarOpcoes = (res: { musicaId: string; propostas: Proposta[] }[]) => {
        setOpcoes((o) => { const n = { ...o }; for (const r of res) n[r.musicaId] = r.propostas; return n })
        setEscolha((e) => { const n = { ...e }; for (const r of res) if (r.propostas[0]) n[r.musicaId] = r.propostas[0].id; return n })
    }
    const sair = (ids: string[]) => setLista((l) => l.filter((m) => !ids.includes(m.id)))

    async function procurar() {
        parar.current = false; setOcupado(true); setErro(null); setMsg(null)
        let pendentes = lista.filter((m) => !opcoes[m.id]).slice(0, POR_VEZ).map((m) => m.id)
        let feitas = 0
        while (pendentes.length && !parar.current) {
            const lote = pendentes.slice(0, LOTE)
            const r = await proporLigacoes(lote)
            if (r.ok === false) {
                if (r.esperar) { setMsg('Muitos pedidos ao CSDB.'); await aguardar(r.esperar); continue }
                setErro(r.error); break
            }
            guardarOpcoes(r.resultados)
            // sem nenhuma proposta: lista vazia (para não voltarem a ser procuradas)
            const respondidas = new Set(r.resultados.map((x) => x.musicaId))
            const vazias = lote.filter((id) => !respondidas.has(id) && !r.falta.includes(id))
            if (vazias.length) setOpcoes((o) => { const n = { ...o }; for (const id of vazias) n[id] = []; return n })
            feitas += r.resultados.length
            pendentes = pendentes.slice(LOTE).concat(r.falta)
            if (r.falta.length) { setMsg('O CSDB pediu para esperar.'); await aguardar(60) }
        }
        setMsg(feitas ? `${feitas} proposta${feitas === 1 ? '' : 's'} pronta${feitas === 1 ? '' : 's'}.` : null)
        setOcupado(false)
    }

    const alta = lista.filter((m) => opcoes[m.id]?.find((x) => x.id === escolha[m.id])?.confianca === 'alta')

    async function confirmarAltas() {
        parar.current = false; setOcupado(true); setErro(null); setMsg(null)
        let fila = alta.map((m) => ({ musicaId: m.id, trackId: escolha[m.id] }))
        let total = 0
        const falhas: string[] = []
        while (fila.length && !parar.current) {
            const lote = fila.slice(0, LOTE)
            const r = await confirmarLote(lote)
            if (r.ok === false) {
                if (r.esperar) { setMsg(`${total} ligadas. Muitos pedidos ao CSDB.`); await aguardar(r.esperar); continue }
                setErro(r.error); break
            }
            sair(r.ligadas); total += r.ligadas.length
            falhas.push(...r.falhadas.map((f) => f.error))
            fila = fila.slice(LOTE).concat(lote.filter((p) => r.falta.includes(p.musicaId)))
            if (r.esperar) { setMsg(`${total} ligadas.`); await aguardar(r.esperar) }
        }
        setMsg(`${total} música${total === 1 ? '' : 's'} ligada${total === 1 ? '' : 's'} ao CSDB.`)
        if (falhas.length) setErro(falhas[0] + (falhas.length > 1 ? ` (+${falhas.length - 1})` : ''))
        setOcupado(false)
    }

    const porProcurar = lista.filter((m) => !opcoes[m.id]).length

    if (!csdbOk) return <p className="a-card p-5 text-[16px] a-suave">O CSDB ainda não está configurado neste portal.</p>

    return (
        <section className="space-y-3" aria-labelledby="t-ligar">
            <h2 id="t-ligar" className="text-[19px] font-bold">Ligar ao CSDB <span className="a-suave text-[16px] font-normal">· {lista.length} sem ligação</span></h2>
            {lista.length > 0 ? (
                <div className="a-card space-y-3 p-4">
                    <p className="text-[15px] a-suave">O portal procura cada música no CSDB e propõe a faixa certa. Confirma as de confiança alta de uma vez e vê as outras uma a uma.</p>
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={procurar} disabled={ocupado || porProcurar === 0} className="a-botao a-botao-principal !min-h-[48px]">
                            {ocupado ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Search size={18} aria-hidden />}
                            {porProcurar === 0 ? 'Propostas prontas' : `Procurar propostas (${Math.min(porProcurar, POR_VEZ)})`}
                        </button>
                        <button type="button" onClick={confirmarAltas} disabled={ocupado || alta.length === 0} className="a-botao a-botao-secundario !min-h-[48px]">
                            <Check size={18} aria-hidden /> Confirmar as de confiança alta ({alta.length})
                        </button>
                        {ocupado && <button type="button" onClick={() => { parar.current = true }} className="a-botao a-botao-secundario !min-h-[48px]">Parar</button>}
                    </div>
                    {espera > 0 && <p role="status" className="text-[15px]" style={{ color: 'var(--a-aviso)' }}>{msg} A continuar daqui a {espera} s…</p>}
                    {espera === 0 && msg && <p role="status" className="text-[15px] a-suave">{msg}</p>}
                    {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-perigo, #b3261e)' }}>{erro}</p>}
                </div>
            ) : (
                <p className="a-card p-5 text-[16px] a-suave">Todas as músicas estão ligadas ao CSDB.</p>
            )}

            <ul className="space-y-3">
                {lista.map((m) => (
                    <Cartao key={m.id} m={m} opcoes={opcoes[m.id]} escolhida={escolha[m.id]} bloqueado={ocupado}
                        onEscolher={(id) => setEscolha((e) => ({ ...e, [m.id]: id }))}
                        onMaisOpcoes={(extra) => {
                            setOpcoes((o) => ({ ...o, [m.id]: [...(o[m.id] ?? []), ...extra.filter((x) => !(o[m.id] ?? []).some((y) => y.id === x.id))] }))
                            if (extra[0]) setEscolha((e) => ({ ...e, [m.id]: extra[0].id }))
                        }}
                        onLigada={() => sair([m.id])}
                        onFora={() => { sair([m.id]); setFora((f) => [...f, m]) }} />
                ))}
            </ul>

            {fora.length > 0 && (
                <details className="a-card p-4">
                    <summary className="a-foco min-h-[44px] cursor-pointer text-[16px] font-semibold">Marcadas como «não está no CSDB» ({fora.length})</summary>
                    <ul className="mt-2">
                        {fora.map((m) => (
                            <li key={m.id} className="flex items-center gap-3 py-2">
                                <span className="min-w-0 flex-1 truncate text-[16px]">{m.titulo}{m.artista ? <span className="a-suave"> · {m.artista}</span> : null}</span>
                                <button type="button" className="a-botao a-botao-secundario !min-h-[44px]" aria-label={`Voltar a perguntar por ${m.titulo}`}
                                    onClick={async () => { const r = await desmarcarForaDoCsdb(m.id); if (r.ok) { setFora((f) => f.filter((x) => x.id !== m.id)); setLista((l) => [...l, m]) } }}>
                                    <Undo2 size={16} aria-hidden /> Perguntar
                                </button>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    )
}

function Cartao({ m, opcoes, escolhida, bloqueado, onEscolher, onMaisOpcoes, onLigada, onFora }: {
    m: Linha; opcoes: Opcao[] | undefined; escolhida: number | undefined; bloqueado: boolean
    onEscolher: (id: number) => void; onMaisOpcoes: (extra: Opcao[]) => void; onLigada: () => void; onFora: () => void
}) {
    const [aFazer, setAFazer] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)
    const [outra, setOutra] = useState(false)
    const [q, setQ] = useState(`${m.titulo}${m.artista ? ' ' + m.artista : ''}`)

    async function confirmar() {
        if (!escolhida) return
        setAFazer(true); setAviso(null)
        const r = await confirmarLigacao(m.id, escolhida)
        setAFazer(false)
        if (r.ok === false) setAviso(r.esperar ? `${r.error} Tenta daqui a ${r.esperar} s.` : r.error); else onLigada()
    }
    async function procurar() {
        setAFazer(true); setAviso(null)
        const r = await procurarOutras(q)
        setAFazer(false)
        if (r.ok === false) { setAviso(r.error); return }
        if (r.faixas.length === 0) setAviso('Nada encontrado com esse texto.')
        onMaisOpcoes(r.faixas)
    }
    async function foraDoCsdb() {
        setAFazer(true)
        const r = await marcarForaDoCsdb(m.id)
        setAFazer(false)
        if (r.ok === false) setAviso(r.error); else onFora()
    }

    return (
        <li className="a-card space-y-3 p-4">
            <div>
                <p className="text-[17px] font-semibold break-words">{m.titulo}</p>
                <p className="text-[15px] a-suave">{m.artista || 'Sem artista'}{m.tom ? ` · tom ${m.tom}` : ''}</p>
            </div>
            {opcoes === undefined && <p className="text-[15px] a-suave">Ainda sem proposta. Carrega em «Procurar propostas».</p>}
            {opcoes && opcoes.length === 0 && <p className="text-[15px] a-suave">O CSDB não devolveu nada para esta música. Podes escolher outra ou marcar que não está no CSDB.</p>}
            {opcoes && opcoes.length > 0 && (
                <fieldset className="space-y-2">
                    <legend className="sr-only">Faixa do CSDB para {m.titulo}</legend>
                    {opcoes.map((o) => (
                        <label key={o.id} className="a-foco flex min-h-[56px] cursor-pointer items-start gap-3 rounded-[12px] border p-3"
                            style={{ borderColor: escolhida === o.id ? 'var(--a-destaque)' : 'var(--a-borda)' }}>
                            <input type="radio" name={`f-${m.id}`} checked={escolhida === o.id} onChange={() => onEscolher(o.id)} className="mt-1 h-5 w-5" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[16px] font-semibold break-words">{o.titulo}</span>
                                <span className="block text-[15px] a-suave break-words">
                                    {[o.artista, o.ano, o.bpm ? `${o.bpm} bpm` : null, o.tom ? `tom ${o.tom}` : null, formatarDuracao(o.duracao_seg)].filter(Boolean).join(' · ')}
                                </span>
                                {o.confianca && <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold" style={COR[o.confianca]}>{ROTULO[o.confianca]}</span>}
                            </span>
                        </label>
                    ))}
                </fieldset>
            )}
            {outra && (
                <div className="flex gap-2">
                    <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} aria-label="Procurar no CSDB"
                        className="a-foco min-h-[48px] min-w-0 flex-1 rounded-[14px] border px-3 text-[16px]"
                        style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                    <button type="button" onClick={procurar} disabled={aFazer || bloqueado || q.trim().length < 2} className="a-botao a-botao-secundario !min-h-[48px]"><Search size={18} aria-hidden /> Procurar</button>
                </div>
            )}
            {aviso && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-perigo, #b3261e)' }}>{aviso}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={confirmar} disabled={!escolhida || aFazer || bloqueado} className="a-botao a-botao-principal !min-h-[48px]">
                    {aFazer ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Check size={18} aria-hidden />} Confirmar
                </button>
                <button type="button" onClick={() => setOutra((v) => !v)} className="a-botao a-botao-secundario !min-h-[48px]">Escolher outra</button>
                <button type="button" onClick={foraDoCsdb} disabled={aFazer || bloqueado} className="a-botao a-botao-secundario !min-h-[48px]"><X size={18} aria-hidden /> Não está no CSDB</button>
            </div>
        </li>
    )
}
