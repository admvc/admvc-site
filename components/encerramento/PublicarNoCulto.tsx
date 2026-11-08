'use client'

// "Publicar no culto": escolher um dos cultos dos próximos dias e guardar nele a arte (banner da Cantina ou arte da
// Assistência Social) para o Holyrics a pôr em ENCERRAMENTO. Trocar = publicar de novo; retirar = tirar do culto.
import { useState, useTransition } from 'react'
import { CheckCircle2, Send, Trash2 } from 'lucide-react'
import { diaCurto, hora } from '@/components/app/datas'

export type CultoParaPublicar = { id: number; nome: string; data: string; publicada: string | null }
type Resultado = { ok: boolean; url?: string | null; erro?: string }

const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

export default function PublicarNoCulto({ cultos: iniciais, titulo, aoPublicar, aoRetirar }: {
    cultos: CultoParaPublicar[]
    titulo: string
    aoPublicar: (eventoId: number) => Promise<Resultado>
    aoRetirar: (eventoId: number) => Promise<Resultado>
}) {
    const [cultos, setCultos] = useState(iniciais)
    const [escolhido, setEscolhido] = useState<number>(iniciais.find((c) => c.publicada)?.id ?? iniciais[0]?.id ?? 0)
    const [aviso, setAviso] = useState<{ erro: boolean; texto: string } | null>(null)
    const [aTrabalhar, comecar] = useTransition()
    const culto = cultos.find((c) => c.id === escolhido)

    function marcar(id: number, url: string | null) {
        setCultos((l) => l.map((c) => (c.id === id ? { ...c, publicada: url } : c)))
    }

    function publicar() {
        if (!culto) return
        setAviso(null)
        comecar(async () => {
            const r = await aoPublicar(culto.id)
            if (r.ok) { marcar(culto.id, r.url ?? null); setAviso({ erro: false, texto: culto.publicada ? 'Arte trocada neste culto.' : 'Publicado. Aparece em ENCERRAMENTO no próximo "Sincronizar APP".' }) }
            else setAviso({ erro: true, texto: r.erro ?? 'Não foi possível.' })
        })
    }
    function retirar() {
        if (!culto) return
        setAviso(null)
        comecar(async () => {
            const r = await aoRetirar(culto.id)
            if (r.ok) { marcar(culto.id, null); setAviso({ erro: false, texto: 'Retirado deste culto.' }) }
            else setAviso({ erro: true, texto: r.erro ?? 'Não foi possível.' })
        })
    }

    return (
        <section aria-label="Publicar no culto" className="min-w-0 space-y-3 rounded-[18px] border p-3" style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)' }}>
            <h2 className="text-[19px] font-bold">Publicar no culto</h2>
            {cultos.length === 0 ? (
                <p className="text-[15px] a-suave">Não há cultos marcados para os próximos dias.</p>
            ) : (
                <>
                    <p className="text-[15px] a-suave">{titulo}</p>
                    <label className="block space-y-1">
                        <span className="text-[15px] font-semibold">Culto</span>
                        <select value={escolhido} onChange={(ev) => { setEscolhido(Number(ev.target.value)); setAviso(null) }} className={campo} style={estiloCampo}>
                            {cultos.map((c) => <option key={c.id} value={c.id}>{diaCurto(c.data)} · {hora(c.data)} · {c.nome}{c.publicada ? ' · ✓ publicado' : ''}</option>)}
                        </select>
                    </label>
                    {culto?.publicada && (
                        <p className="flex items-center gap-2 text-[15px]"><CheckCircle2 size={18} aria-hidden style={{ color: 'var(--a-destaque)' }} /> Este culto já tem uma arte publicada.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={publicar} disabled={aTrabalhar || !culto} className="a-botao a-botao-principal !min-h-[48px] flex-1">
                            <Send size={18} aria-hidden /> {aTrabalhar ? 'A publicar…' : culto?.publicada ? 'Trocar a arte deste culto' : 'Publicar no culto'}
                        </button>
                        {culto?.publicada && (
                            <button type="button" onClick={retirar} disabled={aTrabalhar} className="a-botao a-botao-secundario !min-h-[48px]">
                                <Trash2 size={18} aria-hidden /> Retirar
                            </button>
                        )}
                    </div>
                    {aviso && <p role={aviso.erro ? 'alert' : 'status'} className="text-[15px]" style={aviso.erro ? { color: 'var(--a-erro)' } : undefined}>{aviso.texto}</p>}
                </>
            )}
        </section>
    )
}
