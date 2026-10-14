'use client'

// Holyrics (no computador da midia, na rede da igreja): enviar a setlist do
// culto para a lista do Holyrics, e (admin) trazer as musicas do Holyrics para
// o repertorio. Usa a ligacao guardada na igreja (Midia → Holyrics).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MonitorUp, RefreshCw } from 'lucide-react'
import { sincronizarAcervoLocal, ligarMusicasAoHolyrics } from '@/actions/louvor-actions'
import { enviarParaHolyrics, SemLigacaoHolyrics, MENSAGEM_SEM_LIGACAO, type MusicaParaHolyrics } from '@/lib/holyrics-cliente'

export default function BotoesHolyrics({ url, token, musicas, podeSincronizar }: {
    url: string
    token: string
    musicas: MusicaParaHolyrics[]   // as musicas do culto, pela ordem
    podeSincronizar: boolean
}) {
    const router = useRouter()
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
    const [ocupado, setOcupado] = useState(false)
    const base = url.replace(/\/$/, '')

    type MusicaHolyrics = { id: string | number; title: string; artist?: string }

    async function pedir(caminho: string, corpo: object): Promise<{ status?: string; data?: MusicaHolyrics[] }> {
        const r = await fetch(`${base}/api/${caminho}?token=${encodeURIComponent(token)}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
        })
        return r.json()
    }

    async function enviar() {
        setAviso(null); setOcupado(true)
        try {
            const r = await enviarParaHolyrics(url, token, musicas, ligarMusicasAoHolyrics)
            const enviadas = r.filter((m) => m.estado === 'enviada').length
            const fora = r.filter((m) => m.estado === 'nao-encontrada').map((m) => m.titulo)
            setAviso({
                ok: fora.length === 0,
                texto: (enviadas ? `Enviadas ${enviadas} música${enviadas === 1 ? '' : 's'} para o Holyrics.` : 'As músicas já estavam na lista do Holyrics.')
                    + (fora.length ? ` Não estão no Holyrics: ${fora.join(', ')}.` : ''),
            })
        } catch (e) {
            setAviso({ ok: false, texto: e instanceof SemLigacaoHolyrics ? MENSAGEM_SEM_LIGACAO : (e instanceof Error ? e.message : 'Erro ao enviar.') })
        } finally { setOcupado(false) }
    }

    async function sincronizar() {
        setAviso(null); setOcupado(true)
        try {
            // O Holyrics devolve no maximo 50 de cada vez: pesquisa letra a letra
            const todas = new Map<string, MusicaHolyrics>()
            for (const letra of ['', ...'abcdefghijklmnopqrstuvwxyz']) {
                const j = await pedir('SearchSong', letra ? { text: letra, title: true, limit: 1000 } : { text: '', limit: 10000 })
                if (j?.status === 'ok' && Array.isArray(j.data)) j.data.forEach((m) => todas.set(String(m.id), m))
                if (!letra && (j?.data?.length ?? 0) < 50) break
            }
            const lista = [...todas.values()]
            let novas = 0
            for (let i = 0; i < lista.length; i += 100) {
                const r = await sincronizarAcervoLocal(lista.slice(i, i + 100))
                if (!r.success) throw new Error(r.error)
                novas += r.inseridas || 0
            }
            setAviso({ ok: true, texto: `${lista.length} músicas no Holyrics; ${novas} novas no repertório.` })
            router.refresh()
        } catch (e) {
            const msg = e instanceof Error ? e.message : ''
            setAviso({ ok: false, texto: msg.includes('fetch') ? 'Sem ligação ao Holyrics.' : (msg || 'Erro ao sincronizar.') })
        } finally { setOcupado(false) }
    }

    return (
        <section className="a-card p-4 space-y-3" aria-labelledby="holyrics">
            <h2 id="holyrics" className="text-[19px] font-bold">Holyrics</h2>
            <p className="text-[15px] a-suave">Funciona no computador da mídia (na rede da igreja).</p>
            <button type="button" className="a-botao a-botao-secundario w-full" disabled={ocupado || musicas.length === 0} onClick={enviar}>
                <MonitorUp size={18} aria-hidden /> Enviar a setlist para o Holyrics
            </button>
            {podeSincronizar && (
                <button type="button" className="a-botao a-botao-secundario w-full" disabled={ocupado} onClick={sincronizar}>
                    <RefreshCw size={18} aria-hidden className={ocupado ? 'animate-spin' : ''} /> Trazer músicas do Holyrics
                </button>
            )}
            {aviso && <p role="status" className="text-[15px] font-semibold" style={{ color: aviso.ok ? 'var(--a-ok)' : 'var(--a-erro)' }}>{aviso.texto}</p>}
        </section>
    )
}
