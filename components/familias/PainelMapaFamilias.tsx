'use client'

// Mapa das famílias com filtros, tabela por bairro e as moradas por localizar.
import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { localizarMoradasAction, repetirFalhadasAction } from '@/actions/mapa-actions'
import { resumoPorBairro, type PontoFamilia } from '@/lib/mapa-familias'
import type { GrupoNoMapa } from './MapaFamilias'
import { useToast } from '@/components/ui/ConfirmDialog'
import { Loader2, MapPin, RotateCcw } from 'lucide-react'

const MapaFamilias = dynamic(() => import('./MapaFamilias'), {
    ssr: false,
    loading: () => <div className="h-[560px] rounded-[20px] bg-soft/30 border border-soft flex items-center justify-center animate-pulse text-muted">A carregar o mapa…</div>,
})

const CORES = ['#3F6B4F', '#b45309', '#7c3aed', '#0891b2', '#be185d', '#4d7c0f', '#1d4ed8']

export interface Pendente { id: number; nome: string; motivo: 'por-localizar' | 'nao-encontrada' | 'sem-morada' }

export default function PainelMapaFamilias({ pontos, grupos, congregacoes, pendentes }: {
    pontos: PontoFamilia[]
    grupos: GrupoNoMapa[]
    congregacoes: { id: number; nome: string }[]
    pendentes: Pendente[]
}) {
    const router = useRouter()
    const toast = useToast()
    const [cong, setCong] = useState('')
    const [bairro, setBairro] = useState('')
    const [soSemGrupo, setSoSemGrupo] = useState(false)
    const [mostrarGrupos, setMostrarGrupos] = useState(true)
    const [aLocalizar, setALocalizar] = useState<string | null>(null)

    const corDe = (id: number | null) => {
        const i = congregacoes.findIndex(c => c.id === id)
        return i < 0 ? '#6b7280' : CORES[i % CORES.length]
    }
    const visiveis = useMemo(() => pontos.filter(p =>
        (!cong || String(p.congregacao_id ?? '') === cong) &&
        (!bairro || (p.bairro || 'Sem bairro') === bairro) &&
        (!soSemGrupo || p.sem_grupo)), [pontos, cong, bairro, soSemGrupo])
    const porBairro = useMemo(() => resumoPorBairro(pontos.filter(p => !cong || String(p.congregacao_id ?? '') === cong)), [pontos, cong])

    const porLocalizar = pendentes.filter(p => p.motivo === 'por-localizar').length
    const naoEncontradas = pendentes.filter(p => p.motivo === 'nao-encontrada')
    const semMorada = pendentes.filter(p => p.motivo === 'sem-morada')

    async function localizar() {
        let total = 0, achadas = 0
        try {
            for (let volta = 0; volta < 60; volta++) {
                const r = await localizarMoradasAction()
                if ('error' in r) { toast(r.error, 'erro'); break }
                total += r.feitos; achadas += r.encontrados
                setALocalizar(`${total} vistas, ${achadas} encontradas… faltam ${r.faltam}`)
                if (r.faltam === 0 || r.feitos === 0) break
            }
            toast(`Moradas localizadas: ${achadas} de ${total}.`, 'sucesso')
        } finally {
            setALocalizar(null)
            router.refresh()
        }
    }
    async function repetir() {
        const r = await repetirFalhadasAction()
        if ('error' in r) toast(r.error, 'erro')
        else { toast(`${r.total} morada(s) voltam a "por localizar".`, 'sucesso'); router.refresh() }
    }

    const campo = 'rounded-xl border border-soft bg-bg2 px-3 py-2 text-[15px]'
    const totalPessoas = visiveis.reduce((t, p) => t + p.pessoas, 0)

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                {congregacoes.length > 1 && (
                    <select value={cong} onChange={e => setCong(e.target.value)} className={campo} aria-label="Congregação">
                        <option value="">Todas as congregações</option>
                        {congregacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                )}
                <select value={bairro} onChange={e => setBairro(e.target.value)} className={campo} aria-label="Bairro">
                    <option value="">Todos os bairros</option>
                    {porBairro.map(b => <option key={b.bairro} value={b.bairro}>{b.bairro}</option>)}
                </select>
                <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" checked={soSemGrupo} onChange={e => setSoSemGrupo(e.target.checked)} className="h-4 w-4" /> Só casas sem grupo</label>
                <label className="flex items-center gap-2 text-[15px]"><input type="checkbox" checked={mostrarGrupos} onChange={e => setMostrarGrupos(e.target.checked)} className="h-4 w-4" /> Mostrar os grupos</label>
                <span className="ml-auto text-[14px] text-muted">{visiveis.length} casas · {totalPessoas} pessoas no mapa</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
                <MapaFamilias pontos={visiveis} grupos={grupos} mostrarGrupos={mostrarGrupos} corDe={corDe} />

                <aside className="space-y-4">
                    {congregacoes.length > 1 && (
                        <div className="rounded-2xl border border-soft bg-bg2 p-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
                            {congregacoes.map(c => <span key={c.id} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: corDe(c.id) }} />{c.nome}</span>)}
                            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-dashed border-red-600" />Sem grupo</span>
                        </div>
                    )}
                    <div className="rounded-2xl border border-soft bg-bg2 overflow-hidden">
                        <table className="w-full text-[14px]">
                            <thead><tr className="text-left text-muted border-b border-soft">
                                <th className="px-3 py-2">Bairro</th><th className="px-2 py-2 text-right">Casas</th><th className="px-2 py-2 text-right">Pessoas</th><th className="px-3 py-2 text-right">Sem grupo</th>
                            </tr></thead>
                            <tbody>
                                {porBairro.map(b => (
                                    <tr key={b.bairro} onClick={() => setBairro(x => x === b.bairro ? '' : b.bairro)}
                                        className={`cursor-pointer border-b border-soft last:border-0 ${bairro === b.bairro ? 'bg-figueira/10 font-semibold' : 'hover:bg-soft/30'}`}>
                                        <td className="px-3 py-2">{b.bairro}</td><td className="px-2 py-2 text-right">{b.casas}</td><td className="px-2 py-2 text-right">{b.pessoas}</td>
                                        <td className={`px-3 py-2 text-right ${b.semGrupo ? 'text-red-600 font-semibold' : ''}`}>{b.semGrupo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[13px] text-muted">Toque num bairro para o ver no mapa.</p>
                </aside>
            </div>

            {(porLocalizar > 0 || naoEncontradas.length > 0 || semMorada.length > 0) && (
                <section className="rounded-2xl border border-soft bg-bg2 p-4 space-y-3">
                    <h2 className="text-[17px] font-bold flex items-center gap-2"><MapPin size={18} aria-hidden /> Fora do mapa</h2>
                    {porLocalizar > 0 && (
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="text-[15px] flex-1">{porLocalizar} membro(s) com morada ainda por localizar.</p>
                            <button type="button" onClick={localizar} disabled={!!aLocalizar}
                                className="flex items-center gap-2 rounded-xl bg-figueira px-4 py-2.5 text-white font-semibold disabled:opacity-60">
                                {aLocalizar ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <MapPin size={16} aria-hidden />}
                                {aLocalizar ?? 'Localizar moradas'}
                            </button>
                        </div>
                    )}
                    {naoEncontradas.length > 0 && (
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[15px] flex-1">Morada não encontrada ({naoEncontradas.length}): corrija a morada na ficha.</p>
                                <button type="button" onClick={repetir} className="flex items-center gap-1.5 rounded-xl border border-soft px-3 py-2 text-[14px] font-semibold">
                                    <RotateCcw size={14} aria-hidden /> Tentar outra vez
                                </button>
                            </div>
                            <p className="text-[14px] text-muted">{naoEncontradas.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<Link href={`/admin/membros/editar/${p.id}`} className="underline">{p.nome}</Link></span>)}</p>
                        </div>
                    )}
                    {semMorada.length > 0 && (
                        <p className="text-[14px] text-muted">Sem morada na ficha ({semMorada.length}): {semMorada.map((p, i) => <span key={p.id}>{i ? ', ' : ''}<Link href={`/admin/membros/editar/${p.id}`} className="underline">{p.nome}</Link></span>)}</p>
                    )}
                </section>
            )}
        </div>
    )
}
