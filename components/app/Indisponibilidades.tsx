'use client'

// "Nao posso servir em…": o lider ve estas datas quando monta a escala.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarX2, Plus, Trash2 } from 'lucide-react'
import { criarIndisponibilidade, removerIndisponibilidade } from '@/actions/escalas-actions'
import type { MinhaIndisponibilidade } from '@/lib/escalas-app'

export default function Indisponibilidades({ lista }: { lista: MinhaIndisponibilidade[] }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [aberto, setAberto] = useState(false)
    const [inicio, setInicio] = useState('')
    const [fim, setFim] = useState('')
    const [erro, setErro] = useState<string | null>(null)

    function guardar() {
        setErro(null)
        const f = new FormData()
        if (fim && fim !== inicio) {
            f.set('tipo', 'INTERVALO'); f.set('data_inicio', inicio); f.set('data_fim', fim)
        } else {
            f.set('tipo', 'DATA_ESPECIFICA'); f.set('data_inicio', inicio)
        }
        iniciar(async () => {
            const r: any = await criarIndisponibilidade(f)
            if (r?.error) setErro(r.error)
            else { setAberto(false); setInicio(''); setFim(''); router.refresh() }
        })
    }

    function remover(id: number) {
        iniciar(async () => { await removerIndisponibilidade(id); router.refresh() })
    }

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]'
    const estiloCampo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <section className="a-card p-5 space-y-3" aria-labelledby="indisponivel">
            <h2 id="indisponivel" className="flex items-center gap-2 text-[17px] font-semibold">
                <CalendarX2 size={20} aria-hidden /> Datas em que não posso servir
            </h2>
            {lista.length > 0 ? (
                <ul className="space-y-2">
                    {lista.map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-2 text-[16px]">
                            <span>{i.texto}</span>
                            <button type="button" onClick={() => remover(i.id)} disabled={pendente}
                                className="a-botao a-suave !min-h-[44px] !px-3" aria-label={`Remover ${i.texto}`}>
                                <Trash2 size={18} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-[15px] a-suave">Se souber que vai faltar (férias, trabalho), avise aqui. O líder vê antes de fazer a escala.</p>
            )}

            {aberto ? (
                <div className="space-y-3">
                    <label className="block text-[15px] font-semibold">
                        Dia
                        <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className={`${campo} mt-1`} style={estiloCampo} />
                    </label>
                    <label className="block text-[15px] font-semibold">
                        Até (opcional, para vários dias)
                        <input type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} className={`${campo} mt-1`} style={estiloCampo} />
                    </label>
                    {erro && <p role="alert" className="text-[15px]" style={{ color: 'var(--a-erro)' }}>{erro}</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" className="a-botao a-botao-secundario" onClick={() => setAberto(false)}>Cancelar</button>
                        <button type="button" className="a-botao a-botao-principal" disabled={!inicio || pendente} onClick={guardar}>Guardar</button>
                    </div>
                </div>
            ) : (
                <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => setAberto(true)}>
                    <Plus size={20} aria-hidden /> Marcar uma data
                </button>
            )}
        </section>
    )
}
