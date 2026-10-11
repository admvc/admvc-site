'use client'

import { useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { GraduationCap, X, ChevronRight, Calendar, Users, Loader2 } from 'lucide-react'
import { manifestarInteresse } from '@/actions/pregacao-actions'

interface Curso {
    id: string
    titulo: string
    descricao?: string | null
    categoria: string
    status: string
    data_inicio: string
    data_fim: string
    vagas_maximas?: number | null
    turmas?: { _count?: { matriculas?: number } }[]
    _count?: { turmas?: number }
}

interface Props {
    aberto: boolean
    onClose: () => void
    cursos: Curso[]
    meusInteresseIds: string[]
}

export default function ModalCursosMembro({ aberto, onClose, cursos, meusInteresseIds }: Props) {
    const [interesseEnviado, setInteresseEnviado] = useState<string[]>(meusInteresseIds)
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    if (!aberto) return null

    async function handleInteresse(cursoId: string) {
        setPendingId(cursoId)
        startTransition(async () => {
            const result = await manifestarInteresse(cursoId)
            if (result.ok) {
                setInteresseEnviado(prev => [...prev, cursoId])
            }
            setPendingId(null)
        })
    }

    const totalMatriculas = (curso: Curso) =>
        curso.turmas?.reduce((acc, t) => acc + (t._count?.matriculas || 0), 0) || 0

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="bg-bg w-full max-w-md rounded-t-[2rem] border-t border-soft shadow-2xl animate-in slide-in-from-bottom-4 duration-200 max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-soft shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                            <GraduationCap size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Cursos</h3>
                            <p className="text-[8px] font-bold text-muted uppercase tracking-widest">{cursos.length} disponíveis</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-soft text-muted hover:text-fg rounded-xl transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Lista de cursos */}
                <div className="overflow-y-auto p-4 space-y-2 flex-1">
                    {cursos.length > 0 ? (
                        cursos.map((curso) => {
                            const jaTemInteresse = interesseEnviado.includes(curso.id)
                            const loading = isPending && pendingId === curso.id
                            const matriculas = totalMatriculas(curso)
                            const dataInicio = new Date(curso.data_inicio).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
                            const dataFim = new Date(curso.data_fim).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })

                            return (
                                <div key={curso.id} className="bg-bg2 border border-soft rounded-xl p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                            <GraduationCap size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[11px] font-black uppercase italic text-fg">{curso.titulo}</h4>
                                            {curso.descricao && (
                                                <p className="text-[9px] text-muted mt-0.5 line-clamp-2">{curso.descricao}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="flex items-center gap-1 text-[8px] text-muted font-bold">
                                                    <Calendar size={10} className="shrink-0" /> {dataInicio} — {dataFim}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                                    {curso.categoria}
                                                </span>
                                                {curso._count?.turmas && curso._count.turmas > 0 && (
                                                    <span className="flex items-center gap-1 text-[8px] text-muted font-bold">
                                                        <Users size={10} /> {matriculas}{curso.vagas_maximas ? `/${curso.vagas_maximas}` : ''} inscritos
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {jaTemInteresse ? (
                                        <div className="w-full py-2 text-center rounded-xl bg-figueira/10 text-figueira text-[9px] font-black uppercase tracking-widest border border-figueira/20">
                                            Interesse Manifestado
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleInteresse(curso.id)}
                                            disabled={loading}
                                            className="w-full py-2.5 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-purple-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 size={13} className="animate-spin" /> : <GraduationCap size={13} />}
                                            {loading ? 'A enviar...' : 'Tenho Interesse'}
                                        </button>
                                    )}
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-8">
                            <GraduationCap size={28} className="mx-auto text-muted/20 mb-2" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted">Sem cursos disponíveis de momento</p>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}
