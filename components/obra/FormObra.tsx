'use client'
// components/obra/FormObra.tsx — o financeiro escreve os números; a igreja de
// tijolos ao lado mostra já o resultado, antes de gravar.

import { useActionState, useState } from 'react'
import { Loader2, Save, CheckCircle2 } from 'lucide-react'
import { guardarObraAction, type EstadoObra } from '@/actions/obra-actions'
import { contasObra } from '@/lib/obra-tijolos'
import IgrejaTijolos from '@/components/obra/IgrejaTijolos'

export interface DadosFormObra {
    titulo: string
    objetivoFinal: number
    valorTijolo: number
    arrecadado: number
    contribuintes: number
    chamada: string | null
    versiculo: string | null
    versiculoRef: string | null
}

const euro = (v: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const pc = (v: number) => (Math.round(v * 10) / 10).toLocaleString('pt-PT')

const campo = 'w-full bg-bg border border-soft rounded-xl p-3 text-sm font-bold text-fg outline-none focus:border-green-500 transition-colors'
const rotulo = 'text-[13px] font-bold uppercase tracking-wide text-muted block mb-1'

export default function FormObra({ obra }: { obra: DadosFormObra }) {
    const [estado, enviar, aEnviar] = useActionState<EstadoObra, FormData>(guardarObraAction, { ok: false })
    const [v, setV] = useState({ valorObra: obra.objetivoFinal, valorTijolo: obra.valorTijolo, arrecadado: obra.arrecadado })
    const c = contasObra(v)
    const mudar = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) || 0 })

    return (
        <form action={enviar} className="grid gap-8 md:grid-cols-2 items-start">
            <div className="space-y-4">
                <label className="block">
                    <span className={rotulo}>Título da campanha</span>
                    <input name="titulo" defaultValue={obra.titulo} required className={campo} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className={rotulo}>Valor da obra (€)</span>
                        <input name="objetivoFinal" type="number" min={1} step="any" value={v.valorObra || ''} onChange={mudar('valorObra')} required className={`${campo} valor-dinheiro`} />
                    </label>
                    <label className="block">
                        <span className={rotulo}>Cada tijolo (€)</span>
                        <input name="valorTijolo" type="number" min={1} step="any" value={v.valorTijolo || ''} onChange={mudar('valorTijolo')} required className={`${campo} valor-dinheiro`} />
                    </label>
                    <label className="block">
                        <span className={rotulo}>Já arrecadado (€)</span>
                        <input name="arrecadado" type="number" min={0} step="any" value={v.arrecadado} onChange={mudar('arrecadado')} required className={`${campo} valor-dinheiro`} />
                    </label>
                    <label className="block">
                        <span className={rotulo}>Contribuem por mês</span>
                        <input name="contribuintes" type="number" min={0} step={1} defaultValue={obra.contribuintes} required className={campo} />
                    </label>
                </div>
                <label className="block">
                    <span className={rotulo}>Chamada (opcional)</span>
                    <textarea name="chamada" rows={2} defaultValue={obra.chamada ?? ''} className={`${campo} resize-none`} />
                </label>
                <div className="grid grid-cols-[1fr_8rem] gap-3">
                    <label className="block">
                        <span className={rotulo}>Versículo (opcional)</span>
                        <textarea name="versiculo" rows={2} defaultValue={obra.versiculo ?? ''} className={`${campo} resize-none`} />
                    </label>
                    <label className="block">
                        <span className={rotulo}>Referência</span>
                        <input name="versiculoRef" defaultValue={obra.versiculoRef ?? ''} className={campo} />
                    </label>
                </div>

                {estado.erro && <p role="alert" className="text-sm font-bold text-red-500">{estado.erro}</p>}
                {estado.ok && !aEnviar && (
                    <p className="text-sm font-bold text-green-600 flex items-center gap-2"><CheckCircle2 size={16} /> Gravado. O site e o telão atualizam dentro de 1 minuto.</p>
                )}

                <button type="submit" disabled={aEnviar} className="w-full flex justify-center items-center gap-2 bg-green-600 text-white p-4 rounded-xl text-[14px] font-bold uppercase tracking-wide hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50">
                    {aEnviar ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Gravar
                </button>
            </div>

            <div className="space-y-4 text-center md:sticky md:top-8">
                <IgrejaTijolos colocados={c.colocados} total={c.total} className="w-full max-w-sm mx-auto text-fg" />
                <div className="grid grid-cols-3 gap-2">
                    <div><p className="text-3xl font-bold valor-dinheiro" style={{ color: '#C1663A' }}>{c.colocados}</p><p className="text-[12px] font-bold uppercase text-muted">Tijolos colocados</p></div>
                    <div><p className="text-3xl font-bold valor-dinheiro text-fg">{c.faltam}</p><p className="text-[12px] font-bold uppercase text-muted">Ainda faltam</p></div>
                    <div><p className="text-3xl font-bold valor-dinheiro text-fg">{pc(c.pct)}%</p><p className="text-[12px] font-bold uppercase text-muted">do total</p></div>
                </div>
                <p className="text-sm text-muted">
                    {c.total} tijolos de {euro(v.valorTijolo || 0)} · {c.pct >= 100 ? 'Obra financiada!' : `Faltam ${euro(c.faltaEur)}`}
                </p>
            </div>
        </form>
    )
}
