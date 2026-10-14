'use client'

// Topo da ficha do visitante: responsável (líder), próximo contacto (equipa)
// e notas do líder (só líderes). As actions revalidam o painel.
import { useState } from 'react'
import { useToast } from '@/components/ui/ConfirmDialog'
import { atribuirResponsavel, agendarProximoContacto, guardarNotaLider, definirCongregacaoVisitante } from '@/actions/visitante-actions'
import { Loader2, UserPlus, CalendarClock, StickyNote, Church } from 'lucide-react'

export interface MembroEquipa { id: number; nome: string }
export interface CongregacaoOpcao { id: number; nome: string }

interface Props {
    visitante: { id: number; responsavel_id?: number | null; proximo_contacto?: Date | string | null; notas_lider?: string | null; congregacao_id?: number | null }
    equipa: MembroEquipa[]
    congregacoes: CongregacaoOpcao[]
    isLider: boolean
}

const paraInput = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '')

const rotulo = 'text-[13px] font-bold uppercase text-muted tracking-wide flex items-center gap-1.5'
const campo = 'w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-sm font-medium text-fg outline-none focus:border-figueira'
const botao = 'shrink-0 bg-fg text-bg px-3 py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wide hover:bg-figueira transition-all disabled:opacity-50'

export default function GestaoVisitante({ visitante, equipa, congregacoes, isLider }: Props) {
    const toast = useToast()
    const [aGuardar, setAGuardar] = useState(false)
    const [responsavel, setResponsavel] = useState(visitante.responsavel_id ? String(visitante.responsavel_id) : '')
    const [proximo, setProximo] = useState(paraInput(visitante.proximo_contacto))
    const [nota, setNota] = useState(visitante.notas_lider ?? '')
    const [congregacao, setCongregacao] = useState(visitante.congregacao_id ? String(visitante.congregacao_id) : '')
    // O que está gravado (atualiza logo ao gravar, sem esperar que o painel recarregue)
    const [gravado, setGravado] = useState({
        responsavel: visitante.responsavel_id ? String(visitante.responsavel_id) : '',
        proximo: paraInput(visitante.proximo_contacto),
        nota: visitante.notas_lider ?? '',
        congregacao: visitante.congregacao_id ? String(visitante.congregacao_id) : '',
    })

    // Só bloqueia enquanto grava; o painel atualiza-se depois, em segundo plano
    async function correr(fn: () => Promise<{ ok?: boolean; error?: string }>, sucesso: string, novo: Partial<typeof gravado>) {
        setAGuardar(true)
        try {
            const res = await fn()
            if (res.error) toast(res.error, 'erro')
            else {
                setGravado(g => ({ ...g, ...novo }))
                toast(sucesso, 'sucesso')
            }
        } catch {
            toast('Não foi possível guardar. Tente outra vez.', 'erro')
        } finally {
            setAGuardar(false)
        }
    }

    // Quem já é responsável mas saiu da equipa continua a aparecer na lista
    const opcoes = visitante.responsavel_id && !equipa.some(m => m.id === visitante.responsavel_id)
        ? [...equipa, { id: visitante.responsavel_id, nome: '(fora da equipa)' }]
        : equipa

    return (
        <div className="space-y-4 mb-6 shrink-0">
            {isLider && (
                <div className="space-y-1.5">
                    <label htmlFor={`resp-${visitante.id}`} className={rotulo}><UserPlus size={12} /> Responsável</label>
                    <div className="flex gap-2">
                        <select id={`resp-${visitante.id}`} value={responsavel} onChange={e => setResponsavel(e.target.value)} className={campo}>
                            <option value="">Sem responsável</option>
                            {opcoes.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                        </select>
                        <button type="button" disabled={aGuardar || responsavel === gravado.responsavel} className={botao}
                            onClick={() => correr(() => atribuirResponsavel(visitante.id, responsavel ? Number(responsavel) : null), 'Responsável guardado.', { responsavel })}>
                            Guardar
                        </button>
                    </div>
                    {equipa.length === 0 && (
                        <p className="text-[13px] text-muted">Ainda não há ninguém no departamento de acolhimento.</p>
                    )}
                </div>
            )}

            {congregacoes.length > 0 && (
                <div className="space-y-1.5">
                    <label htmlFor={`cong-${visitante.id}`} className={rotulo}><Church size={12} /> Congregação</label>
                    <div className="flex gap-2">
                        <select id={`cong-${visitante.id}`} value={congregacao} onChange={e => setCongregacao(e.target.value)} className={campo}>
                            <option value="">Não sabemos</option>
                            {congregacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                        <button type="button" disabled={aGuardar || congregacao === gravado.congregacao} className={botao}
                            onClick={() => correr(() => definirCongregacaoVisitante(visitante.id, congregacao ? Number(congregacao) : null), 'Congregação guardada.', { congregacao })}>
                            Guardar
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-1.5">
                <label htmlFor={`prox-${visitante.id}`} className={rotulo}><CalendarClock size={12} /> Próximo contacto</label>
                <div className="flex gap-2">
                    <input id={`prox-${visitante.id}`} type="date" value={proximo} onChange={e => setProximo(e.target.value)} className={campo} />
                    <button type="button" disabled={aGuardar || proximo === gravado.proximo} className={botao}
                        onClick={() => correr(() => agendarProximoContacto(visitante.id, proximo), proximo ? 'Próximo contacto marcado.' : 'Data retirada.', { proximo })}>
                        Guardar
                    </button>
                </div>
            </div>

            {isLider && (
                <div className="space-y-1.5">
                    <label htmlFor={`nota-${visitante.id}`} className={rotulo}><StickyNote size={12} /> Notas do líder <span className="normal-case font-medium">(só líderes veem)</span></label>
                    <textarea id={`nota-${visitante.id}`} rows={3} value={nota} onChange={e => setNota(e.target.value)} className={`${campo} resize-none`} />
                    <button type="button" disabled={aGuardar || nota.trim() === gravado.nota} className={`${botao} w-full`}
                        onClick={() => correr(() => guardarNotaLider(visitante.id, nota), 'Nota guardada.', { nota: nota.trim() })}>
                        Guardar nota
                    </button>
                </div>
            )}

            {aGuardar && <p className="text-[13px] text-muted flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> A guardar…</p>}
        </div>
    )
}
