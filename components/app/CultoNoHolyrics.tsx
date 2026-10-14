'use client'

// Culto no Holyrics: um clique e as musicas do culto vao para a lista do
// Holyrics (no computador da midia). Escolhe sozinho o culto de hoje (ou o
// proximo); da para trocar se houver mais de um.

import { useState } from 'react'
import { MonitorUp, Loader2, Check, Minus, X } from 'lucide-react'
import { ligarMusicasAoHolyrics } from '@/actions/louvor-actions'
import {
    enviarParaHolyrics, SemLigacaoHolyrics, MENSAGEM_SEM_LIGACAO,
    type MusicaParaHolyrics, type EstadoNoHolyrics,
} from '@/lib/holyrics-cliente'

export type CultoParaHolyrics = { id: number; nome: string; data: string; musicas: MusicaParaHolyrics[] }

const ESTADO: Record<EstadoNoHolyrics, { texto: string; icone: typeof Check; cor: string }> = {
    'enviada': { texto: 'Enviada', icone: Check, cor: 'var(--a-ok)' },
    'ja-estava': { texto: 'Já estava na lista', icone: Minus, cor: 'var(--a-suave)' },
    'nao-encontrada': { texto: 'Não está no Holyrics', icone: X, cor: 'var(--a-erro)' },
}

const quando = (iso: string) => {
    const d = new Date(iso)
    const t = `${d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}, ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`
    return t[0].toUpperCase() + t.slice(1)
}

export default function CultoNoHolyrics({ url, token, cultos }: { url: string; token: string; cultos: CultoParaHolyrics[] }) {
    const [cultoId, setCultoId] = useState(cultos[0].id)
    const [ocupado, setOcupado] = useState(false)
    const [estados, setEstados] = useState<Record<string, EstadoNoHolyrics> | null>(null)
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
    const culto = cultos.find((c) => c.id === cultoId) ?? cultos[0]

    function escolher(id: number) {
        setCultoId(id); setEstados(null); setAviso(null)
    }

    async function enviar() {
        setOcupado(true); setAviso(null); setEstados(null)
        try {
            const r = await enviarParaHolyrics(url, token, culto.musicas, ligarMusicasAoHolyrics)
            setEstados(Object.fromEntries(r.map((m) => [m.musicaId, m.estado])))
            const conta = (e: EstadoNoHolyrics) => r.filter((m) => m.estado === e).length
            const [enviadas, jaEstavam, faltam] = [conta('enviada'), conta('ja-estava'), conta('nao-encontrada')]
            const partes = [
                enviadas && `${enviadas} enviada${enviadas === 1 ? '' : 's'}`,
                jaEstavam && `${jaEstavam} já estava${jaEstavam === 1 ? '' : 'm'} na lista`,
            ].filter(Boolean)
            setAviso({
                ok: faltam === 0,
                texto: (partes.length ? `${partes.join(', ')}.` : '')
                    + (faltam ? ` ${faltam} não ${faltam === 1 ? 'está' : 'estão'} no Holyrics: crie-${faltam === 1 ? 'a' : 'as'} lá com o mesmo nome e envie outra vez.` : ''),
            })
        } catch (e) {
            setAviso({ ok: false, texto: e instanceof SemLigacaoHolyrics ? MENSAGEM_SEM_LIGACAO : (e instanceof Error ? e.message : 'Erro ao enviar.') })
        } finally {
            setOcupado(false)
        }
    }

    return (
        <>
            {cultos.length > 1 && (
                <div role="radiogroup" aria-label="Culto" className="flex flex-wrap gap-2">
                    {cultos.map((c) => {
                        const ativo = c.id === culto.id
                        return (
                            <button key={c.id} type="button" role="radio" aria-checked={ativo} onClick={() => escolher(c.id)}
                                className={`a-botao !min-h-[48px] ${ativo ? 'a-botao-principal' : 'a-botao-secundario'}`}>
                                {new Date(c.data).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric' })} · {c.nome}
                            </button>
                        )
                    })}
                </div>
            )}

            <section className="a-card space-y-3 p-4" aria-labelledby="culto-nome">
                <div>
                    <h2 id="culto-nome" className="text-[19px] font-semibold">{culto.nome}</h2>
                    <p className="text-[15px] a-suave">{quando(culto.data)}</p>
                </div>
                <ol className="a-divide">
                    {culto.musicas.map((m, i) => {
                        const e = estados?.[m.musicaId]
                        const Icone = e ? ESTADO[e].icone : null
                        return (
                            <li key={`${m.musicaId}-${i}`} className="flex items-center gap-3 py-2.5">
                                <span className="w-6 shrink-0 text-right text-[16px] font-semibold a-suave">{i + 1}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[17px] font-semibold">{m.titulo}</span>
                                    {m.artista && <span className="block truncate text-[15px] a-suave">{m.artista}</span>}
                                </span>
                                {e && Icone && (
                                    <span className="flex shrink-0 items-center gap-1 text-[14px] font-semibold" style={{ color: ESTADO[e].cor }}>
                                        <Icone size={16} aria-hidden /> {ESTADO[e].texto}
                                    </span>
                                )}
                            </li>
                        )
                    })}
                </ol>
            </section>

            <button type="button" onClick={enviar} disabled={ocupado} className="a-botao a-botao-principal w-full !min-h-[56px]">
                {ocupado ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <MonitorUp size={20} aria-hidden />}
                {ocupado ? 'A enviar…' : 'Enviar para o Holyrics'}
            </button>

            {aviso && (
                <p role="status" className="rounded-[14px] border px-4 py-3 text-[16px] font-semibold"
                    style={aviso.ok
                        ? { borderColor: 'var(--a-borda)', background: 'var(--a-card)' }
                        : { borderColor: 'var(--a-erro)', color: 'var(--a-erro)', background: 'var(--a-erro-suave)' }}>
                    {aviso.texto}
                </p>
            )}

            <p className="text-center text-[15px] a-suave">
                Junta à lista do Holyrics sem apagar o que lá está. Guarde esta página nos favoritos do computador da mídia.
            </p>
        </>
    )
}
