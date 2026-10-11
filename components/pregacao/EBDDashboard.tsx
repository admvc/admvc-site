'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    ChevronLeft, ChevronRight, Plus, GraduationCap,
    Calendar, User, Users, BookOpen, Trash2,
    X, Loader2, Check, ChevronDown, Layers, Clock,
    Award, TrendingUp, ExternalLink, Lock, ShieldCheck,
    UserPlus, XCircle, Eye, Edit3
} from 'lucide-react'
import {
    criarCurso, atualizarCurso, removerCurso, aprovarCurso,
    criarTurma, criarEBD, removerEBD, registarPresencasEBD,
    manifestarInteresse, cancelarInteresse,
    aprovarInteresse, rejeitarInteresse
} from '@/actions/pregacao-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

const MESES = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const CATEGORIA_LABELS: Record<string, { label: string; color: string }> = {
    EBD: { label: 'EBD', color: 'bg-indigo-600/10 text-indigo-400 border-indigo-600/20' },
    LIVRE: { label: 'Livre', color: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20' },
    DISCIPULADO: { label: 'Discipulado', color: 'bg-amber-600/10 text-amber-400 border-amber-600/20' },
    SEMINARIO: { label: 'Seminario', color: 'bg-purple-600/10 text-purple-400 border-purple-600/20' },
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    PLANEADO: { label: 'Planeado', color: 'text-blue-400 bg-blue-600/10 border-blue-600/20' },
    EM_CURSO: { label: 'Em Curso', color: 'text-green-400 bg-green-600/10 border-green-600/20' },
    CONCLUIDO: { label: 'Concluido', color: 'text-muted bg-bg border-soft' },
    CANCELADO: { label: 'Cancelado', color: 'text-red-400 bg-red-600/10 border-red-600/20' },
}

const INSCRICAO_LABELS: Record<string, string> = {
    LIVRE: 'Aberto a todos',
    DEPARTAMENTO: 'Departamento exclusivo',
    GRUPO: 'Grupo exclusivo',
}

interface Turma {
    id: string; nome: string; faixa_etaria: string | null
    professores: { id: number; first_name: string; last_name: string }[]
    _count: { matriculas: number; aulas: number; atividades: number }
}

interface Curso {
    id: string; titulo: string; descricao: string | null; ementa: string | null
    categoria: string; trimestre: number | null; ano: number
    data_inicio: string; data_fim: string; carga_horaria: number | null
    vagas_maximas: number | null; material_ref: string | null
    nota_minima: number; presenca_minima: number; status: string
    is_externo: boolean; link_externo: string | null
    responsavel_nome: string | null; responsavel_tel: string | null
    tipo_inscricao: string; departamento_ids: any; grupo_ids: any
    aprovado: boolean; aprovado_em: string | null
    data_abertura_inscricoes: string | null
    criado_por: { first_name: string; last_name: string } | null
    aprovado_por: { first_name: string; last_name: string } | null
    turmas: Turma[]; _count: { turmas: number }
    interesses: Interesse[]
}

interface Interesse {
    id: number; curso_id: string; membro_id: number
    mensagem: string | null; status: string
    created_at: string; aprovado_em: string | null; turma_id: string | null
    membro: { id: number; first_name: string; last_name: string }
}

interface Aula {
    id: string; titulo: string; tema: string | null; data: string
    professor: { first_name: string; last_name: string }
    sermao: { id: string; titulo: string } | null
    turma: { id: string; nome: string } | null
    _count: { presencas: number }; presencas: { membro_id: number }[]
}

interface Membro { id: number; first_name: string; last_name: string }
interface Sermao { id: string; titulo: string; data_pregacao: string }
interface DeptGrupo { id: number; nome: string }

interface Props {
    cursos: Curso[]; aulas: Aula[]; membros: Membro[]; sermoes: Sermao[]
    departamentos: DeptGrupo[]; grupos: DeptGrupo[]
    mes: number; ano: number; sermaoIdInicial: string | null
    podeGerir?: boolean; membroId: number
    meusCursoIds: string[]; minhaTurmaPorCurso?: Record<string, string>; meusInteresses?: Record<string, string>
    membroDeptIds: number[]; membroGrupoIds: number[]
    basePath?: string
}

export default function EBDDashboard({
    cursos, aulas, membros, sermoes, departamentos, grupos,
    mes, ano, sermaoIdInicial, podeGerir = false, membroId,
    meusCursoIds, minhaTurmaPorCurso = {}, meusInteresses = {}, membroDeptIds, membroGrupoIds, basePath = '/ensino'
}: Props) {
    const confirmar = useConfirm()
    const toast = useToast()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [tab, setTab] = useState<'disponiveis' | 'meus' | 'gestao'>('disponiveis')
    const [filtroCategoria, setFiltroCategoria] = useState<string>('TODOS')
    const [modalCurso, setModalCurso] = useState(false)
    const [modalEditarCurso, setModalEditarCurso] = useState<Curso | null>(null)
    const [modalTurma, setModalTurma] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [profsSelecionados, setProfsSelecionados] = useState<number[]>([])
    const [detalhesCurso, setDetalhesCurso] = useState<string | null>(null)
    const [loadingInscricao, setLoadingInscricao] = useState<string | null>(null)

    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (modalCurso || modalEditarCurso || modalTurma || detalhesCurso) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = ''
        return () => { document.body.style.overflow = '' }
    }, [modalCurso, modalEditarCurso, modalTurma, detalhesCurso])

    const agora = new Date()

    // Helpers
    function cursoDisponivel(c: Curso) {
        if (!c.aprovado) return false
        if (c.data_abertura_inscricoes && new Date(c.data_abertura_inscricoes) > agora) return false
        if (c.status === 'CANCELADO' || c.status === 'CONCLUIDO') return false
        return true
    }

    function membroPodeInscrever(c: Curso) {
        if (meusCursoIds.includes(c.id)) return false
        if (c.tipo_inscricao === 'DEPARTAMENTO' && c.departamento_ids) {
            const ids = c.departamento_ids as number[]
            if (!ids.some(id => membroDeptIds.includes(id))) return false
        }
        if (c.tipo_inscricao === 'GRUPO' && c.grupo_ids) {
            const ids = c.grupo_ids as number[]
            if (!ids.some(id => membroGrupoIds.includes(id))) return false
        }
        return true
    }

    function totalInscritos(c: Curso) {
        return c.turmas.reduce((acc, t) => acc + t._count.matriculas, 0)
    }

    function temVagas(c: Curso) {
        if (!c.vagas_maximas) return true
        return totalInscritos(c) < c.vagas_maximas
    }

    function cursoEmBreve(c: Curso) {
        return c.aprovado && c.data_abertura_inscricoes && new Date(c.data_abertura_inscricoes) > agora
    }

    // Listas filtradas
    const cursosDisponiveis = cursos.filter(c => cursoDisponivel(c) && membroPodeInscrever(c) && temVagas(c))
    const cursosEmBreve = cursos.filter(c => cursoEmBreve(c) && membroPodeInscrever(c))
    const meusCursos = cursos.filter(c => meusCursoIds.includes(c.id))
    const cursosFiltrados = (tab === 'gestao' ? cursos : tab === 'meus' ? meusCursos : [...cursosDisponiveis, ...cursosEmBreve])
        .filter(c => filtroCategoria === 'TODOS' || c.categoria === filtroCategoria)

    // Handlers
    async function handleCriarCurso(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const form = new FormData(e.currentTarget)
        const res = await criarCurso(form)
        setLoading(false)
        if (res.ok) { setModalCurso(false); router.refresh() }
        else toast(res.error, 'erro')
    }

    async function handleEditarCurso(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!modalEditarCurso) return
        setLoading(true)
        const res = await atualizarCurso(modalEditarCurso.id, new FormData(e.currentTarget))
        setLoading(false)
        if (res.ok) { setModalEditarCurso(null); router.refresh() }
        else toast(res.error, 'erro')
    }

    async function handleCriarTurma(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const form = new FormData(e.currentTarget)
        form.set('curso_id', modalTurma!)
        const res = await criarTurma(form)
        setLoading(false)
        if (res.ok) { setModalTurma(null); router.refresh() }
        else toast(res.error, 'erro')
    }

    async function handleAprovar(id: string) {
        if (!await confirmar({ mensagem: 'Aprovar este curso e abrir para inscrições?', tipo: 'info' })) return
        setLoading(true)
        const res = await aprovarCurso(id)
        setLoading(false)
        if (res.ok) router.refresh()
        else toast(res.error, 'erro')
    }

    async function handleInteresse(cursoId: string) {
        setLoadingInscricao(cursoId)
        const res = await manifestarInteresse(cursoId)
        setLoadingInscricao(null)
        if (res.ok) router.refresh()
        else toast(res.error, 'erro')
    }

    async function handleCancelarInteresse(cursoId: string) {
        if (!await confirmar({ mensagem: 'Cancelar o seu interesse neste curso?', tipo: 'aviso' })) return
        setLoadingInscricao(cursoId)
        const res = await cancelarInteresse(cursoId)
        setLoadingInscricao(null)
        if (res.ok) router.refresh()
        else toast(res.error, 'erro')
    }

    async function handleAprovarInteresse(interesseId: number, turmaId: string) {
        setLoading(true)
        const res = await aprovarInteresse(interesseId, turmaId)
        setLoading(false)
        if (res.ok) router.refresh()
        else toast(res.error, 'erro')
    }

    async function handleRejeitarInteresse(interesseId: number) {
        if (!await confirmar({ mensagem: 'Rejeitar este interesse?', tipo: 'perigo' })) return
        setLoading(true)
        const res = await rejeitarInteresse(interesseId)
        setLoading(false)
        if (res.ok) router.refresh()
        else toast(res.error, 'erro')
    }

    // Curso card (reutilizavel)
    function CursoCard({ curso, modo }: { curso: Curso; modo: 'disponivel' | 'meu' | 'gestao' }) {
        const cat = CATEGORIA_LABELS[curso.categoria]
        const st = STATUS_LABELS[curso.status] || STATUS_LABELS.PLANEADO
        const inscritos = totalInscritos(curso)
        const emBreve = cursoEmBreve(curso)
        const interesseStatus = meusInteresses[curso.id] || null
        const interessesPendentes = curso.interesses?.filter(i => i.status === 'PENDENTE') || []
        const jaInscrito = meusCursoIds.includes(curso.id)

        return (
            <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden transition-all hover:border-figueira/30">
                <div className="px-5 py-4 space-y-3">
                    {/* Top line */}
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-11 h-11 bg-bg border border-soft rounded-xl flex flex-col items-center justify-center">
                            {curso.trimestre ? (
                                <><span className="text-[9px] font-black text-figueira leading-none">T{curso.trimestre}</span><span className="text-[7px] font-bold text-muted">{curso.ano}</span></>
                            ) : (
                                <span className="text-[9px] font-black text-figueira">{curso.ano}</span>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xs font-black uppercase tracking-wide text-fg truncate">{curso.titulo}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {cat && <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${cat.color}`}>{cat.label}</span>}
                                {modo === 'gestao' && <span className={`text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>}
                                {!curso.aprovado && modo === 'gestao' && <span className="text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-600/20 bg-amber-600/10 text-amber-400">Pendente</span>}
                                {curso.is_externo && <span className="text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-sky-600/20 bg-sky-600/10 text-sky-400">Externo</span>}
                                {curso.tipo_inscricao !== 'LIVRE' && <Lock size={9} className="text-muted" />}
                                {emBreve && <span className="text-[7px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-600/20 bg-blue-600/10 text-blue-400">Em breve</span>}
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex flex-wrap gap-3 text-[9px] text-muted font-bold">
                        <span><Calendar size={9} className="inline mr-0.5" />{new Date(curso.data_inicio).toLocaleDateString('pt-PT')} — {new Date(curso.data_fim).toLocaleDateString('pt-PT')}</span>
                        {curso.carga_horaria && <span><Clock size={9} className="inline mr-0.5" />{curso.carga_horaria}h</span>}
                        {curso.vagas_maximas && <span><Users size={9} className="inline mr-0.5" />{inscritos}/{curso.vagas_maximas} vagas</span>}
                        {!curso.vagas_maximas && <span><Users size={9} className="inline mr-0.5" />{inscritos} inscritos</span>}
                        <span className="text-[8px]">{INSCRICAO_LABELS[curso.tipo_inscricao]}</span>
                    </div>

                    {/* Descricao curta */}
                    {curso.descricao && <p className="text-[10px] text-fg/70 line-clamp-2">{curso.descricao}</p>}

                    {/* Agendamento */}
                    {emBreve && curso.data_abertura_inscricoes && (
                        <p className="text-[9px] font-bold text-blue-400">
                            <Clock size={9} className="inline mr-1" />
                            Inscricoes abrem em {new Date(curso.data_abertura_inscricoes).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        {/* Ver detalhes / ementa */}
                        <button onClick={() => setDetalhesCurso(curso.id)} className="flex items-center gap-1.5 px-4 py-2 bg-bg border border-soft rounded-2xl text-[9px] font-black uppercase tracking-widest text-fg hover:border-figueira/50 transition-colors">
                            <Eye size={10} /> Detalhes
                        </button>

                        {/* Botao 2: Interesse / Externo */}
                        {curso.is_externo && curso.link_externo ? (
                            <a href={curso.link_externo} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600/10 border border-sky-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-sky-400 hover:bg-sky-600/20 transition-colors">
                                <ExternalLink size={10} /> Ver Externo
                            </a>
                        ) : modo === 'meu' && (minhaTurmaPorCurso[curso.id] || curso.turmas[0]) ? (
                            <Link href={`${basePath}/turma/${minhaTurmaPorCurso[curso.id] || curso.turmas[0].id}`} className="flex items-center gap-1.5 px-4 py-2 bg-figueira/10 border border-figueira/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-figueira hover:bg-figueira/20 transition-colors">
                                <GraduationCap size={10} /> Minha Turma
                            </Link>
                        ) : interesseStatus === 'PENDENTE' ? (
                            <button onClick={() => handleCancelarInteresse(curso.id)} disabled={loadingInscricao === curso.id}
                                className="group flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-amber-400 hover:bg-red-600/10 hover:border-red-600/20 hover:text-red-400 transition-all disabled:opacity-50">
                                {loadingInscricao === curso.id ? <Loader2 size={10} className="animate-spin" /> : <><Clock size={10} className="group-hover:hidden" /><XCircle size={10} className="hidden group-hover:block" /></>}
                                <span className="group-hover:hidden">Interesse Enviado</span>
                                <span className="hidden group-hover:inline">Cancelar Interesse</span>
                            </button>
                        ) : interesseStatus === 'REJEITADO' ? (
                            <span className="flex items-center gap-1.5 px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-400">
                                <XCircle size={10} /> Nao Aprovado
                            </span>
                        ) : modo === 'disponivel' && !jaInscrito && !emBreve ? (
                            <button onClick={() => handleInteresse(curso.id)} disabled={loadingInscricao === curso.id}
                                className="flex items-center gap-1.5 px-4 py-2 bg-figueira text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
                                {loadingInscricao === curso.id ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />}
                                Tenho Interesse
                            </button>
                        ) : null}

                        {/* Gestao: aprovar, turmas, remover */}
                        {modo === 'gestao' && podeGerir && (
                            <>
                                <button onClick={() => setModalEditarCurso(curso)} className="flex items-center gap-1.5 px-4 py-2 bg-bg border border-soft rounded-2xl text-[9px] font-black uppercase tracking-widest text-fg hover:border-figueira/50 transition-colors">
                                    <Edit3 size={10} /> Editar
                                </button>
                                {!curso.aprovado && (
                                    <button onClick={() => handleAprovar(curso.id)} className="flex items-center gap-1.5 px-4 py-2 bg-green-600/10 border border-green-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-green-400 hover:bg-green-600/20 transition-colors">
                                        <ShieldCheck size={10} /> Aprovar
                                    </button>
                                )}
                                <button onClick={() => setModalTurma(curso.id)} className="flex items-center gap-1.5 px-4 py-2 bg-figueira/10 border border-figueira/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-figueira hover:bg-figueira/20 transition-colors">
                                    <Plus size={10} /> Turma
                                </button>
                                {curso.turmas.map(t => (
                                    <Link key={t.id} href={`${basePath}/turma/${t.id}`} className="text-[8px] font-bold text-figueira hover:underline flex items-center gap-1">
                                        <Layers size={9} /> {t.nome} ({t._count.matriculas})
                                    </Link>
                                ))}
                                <button onClick={async () => { const ok = await confirmar({ mensagem: 'Remover este curso?', tipo: 'perigo' }); if (ok) { const r = await removerCurso(curso.id); if (r.ok) router.refresh() } }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600/10 border border-red-600/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-600/20 transition-colors ml-auto">
                                    <Trash2 size={10} /> Remover
                                </button>
                            </>
                        )}

                        {/* Interessados pendentes (gestao) */}
                        {modo === 'gestao' && podeGerir && interessesPendentes.length > 0 && (
                            <div className="w-full mt-3 pt-3 border-t border-soft space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                                    <UserPlus size={10} /> {interessesPendentes.length} interessado{interessesPendentes.length !== 1 ? 's' : ''} pendente{interessesPendentes.length !== 1 ? 's' : ''}
                                </p>
                                {interessesPendentes.map(interesse => (
                                    <div key={interesse.id} className="flex items-center gap-3 bg-bg border border-soft rounded-xl px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-fg">{interesse.membro.first_name} {interesse.membro.last_name}</p>
                                            {interesse.mensagem && <p className="text-[8px] text-muted italic truncate">"{interesse.mensagem}"</p>}
                                            <p className="text-[8px] text-muted/50">{new Date(interesse.created_at).toLocaleDateString('pt-PT')}</p>
                                        </div>
                                        {curso.turmas.length > 0 ? (
                                            <select
                                                onChange={e => { if (e.target.value) handleAprovarInteresse(interesse.id, e.target.value) }}
                                                defaultValue=""
                                                className="bg-bg2 border border-emerald-500/30 rounded-lg px-2 py-1.5 text-[8px] font-black text-emerald-400 focus:outline-none cursor-pointer"
                                            >
                                                <option value="" disabled>Aprovar em...</option>
                                                {curso.turmas.map(t => (
                                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-[8px] text-muted">Crie uma turma primeiro</span>
                                        )}
                                        <button onClick={() => handleRejeitarInteresse(interesse.id)}
                                            className="text-red-400 hover:text-red-300 p-1 transition-colors" title="Rejeitar">
                                            <XCircle size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Modal detalhes/ementa
    const detalhesModal = detalhesCurso && mounted ? (() => {
        const c = cursos.find(x => x.id === detalhesCurso)
        if (!c) return null
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="relative w-full max-w-2xl bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                    <div className="sticky top-0 z-10 bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl">
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg">{c.titulo}</h2>
                        <button onClick={() => setDetalhesCurso(null)} className="text-muted hover:text-fg transition-colors"><X size={18} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        {c.descricao && <div><p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Descricao</p><p className="text-[11px] text-fg/80">{c.descricao}</p></div>}
                        {c.ementa && <div><p className="text-[9px] font-black uppercase tracking-widest text-muted mb-1">Ementa / Conteudo Programatico</p><p className="text-[11px] text-fg/80 whitespace-pre-wrap">{c.ementa}</p></div>}
                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                            <div><span className="font-black text-muted uppercase text-[8px]">Periodo</span><p className="text-fg">{new Date(c.data_inicio).toLocaleDateString('pt-PT')} — {new Date(c.data_fim).toLocaleDateString('pt-PT')}</p></div>
                            {c.carga_horaria && <div><span className="font-black text-muted uppercase text-[8px]">Carga Horaria</span><p className="text-fg">{c.carga_horaria} horas</p></div>}
                            <div><span className="font-black text-muted uppercase text-[8px]">Nota Minima</span><p className="text-fg">{c.nota_minima}</p></div>
                            <div><span className="font-black text-muted uppercase text-[8px]">Presenca Minima</span><p className="text-fg">{c.presenca_minima}%</p></div>
                            {c.vagas_maximas && <div><span className="font-black text-muted uppercase text-[8px]">Vagas</span><p className="text-fg">{totalInscritos(c)}/{c.vagas_maximas}</p></div>}
                            <div><span className="font-black text-muted uppercase text-[8px]">Inscricao</span><p className="text-fg">{INSCRICAO_LABELS[c.tipo_inscricao]}</p></div>
                        </div>
                        {c.material_ref && <div><span className="font-black text-muted uppercase text-[8px]">Material</span><p className="text-[11px] text-fg/80">{c.material_ref}</p></div>}
                        {c.is_externo && (
                            <div className="bg-sky-600/5 border border-sky-600/20 rounded-xl p-4 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-sky-400">Curso Externo</p>
                                {c.responsavel_nome && <p className="text-[10px] text-fg">Responsavel: {c.responsavel_nome} {c.responsavel_tel && `· ${c.responsavel_tel}`}</p>}
                                {c.link_externo && <a href={c.link_externo} target="_blank" rel="noopener noreferrer" className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"><ExternalLink size={10} /> {c.link_externo}</a>}
                            </div>
                        )}
                        {c.turmas.length > 0 && (
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted mb-2">Turmas</p>
                                <div className="space-y-1.5">
                                    {c.turmas.map(t => (
                                        <div key={t.id} className="flex items-center gap-2 bg-bg border border-soft rounded-xl px-3 py-2 text-[10px]">
                                            <span className="font-black text-fg">{t.nome}</span>
                                            <span className="text-muted">{t.professores.map(p => `${p.first_name} ${p.last_name}`).join(', ')}</span>
                                            <span className="text-muted ml-auto"><Users size={9} className="inline mr-0.5" />{t._count.matriculas}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>,
            document.body
        )
    })() : null

    // Modal criar curso
    const cursoModal = modalCurso && mounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 z-10 bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Novo Curso</h2>
                    <button onClick={() => setModalCurso(false)} className="text-muted hover:text-fg transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={handleCriarCurso} className="p-6 space-y-4">
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Titulo *</label><input name="titulo" required className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" placeholder="Ex: Frutos do Espirito, Fotografia" /></div>
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Descricao</label><textarea name="descricao" rows={2} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors resize-y" placeholder="Descricao breve..." /></div>
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Ementa / Conteudo Programatico</label><textarea name="ementa" rows={5} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors resize-y" placeholder="Aula 1 - Introducao&#10;Aula 2 - Fundamentos&#10;..." /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Categoria *</label><select name="categoria" required className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"><option value="EBD">EBD</option><option value="LIVRE">Curso Livre</option><option value="DISCIPULADO">Discipulado</option><option value="SEMINARIO">Seminario</option></select></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Vagas Maximas</label><input name="vagas_maximas" type="number" min="1" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" placeholder="Ilimitado" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Carga Horaria (h)</label><input name="carga_horaria" type="number" min="1" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" /></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Trimestre</label><select name="trimestre" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"><option value="">N/A</option><option value="1">1o</option><option value="2">2o</option><option value="3">3o</option><option value="4">4o</option></select></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Ano *</label><input name="ano" type="number" required defaultValue={ano} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Data Inicio *</label><input name="data_inicio" type="date" required className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Data Fim *</label><input name="data_fim" type="date" required className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    </div>
                    {/* Inscricao */}
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Tipo Inscricao</label><select name="tipo_inscricao" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"><option value="LIVRE">Livre (todos)</option><option value="DEPARTAMENTO">Departamento exclusivo</option><option value="GRUPO">Grupo exclusivo</option></select></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Abertura Inscricoes</label><input name="data_abertura_inscricoes" type="datetime-local" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    </div>
                    {/* Externo */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer"><input name="is_externo" type="checkbox" className="w-4 h-4 rounded border-soft accent-figueira" /><span className="text-[10px] font-black uppercase tracking-widest text-muted">Curso Externo</span></label>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Link Externo</label><input name="link_externo" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" placeholder="https://..." /></div>
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Responsavel</label><input name="responsavel_nome" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" /></div>
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Telefone</label><input name="responsavel_tel" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" /></div>
                        </div>
                    </div>
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Material de Referencia</label><input name="material_ref" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Nota Minima</label><input name="nota_minima" type="number" step="0.1" defaultValue={7} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Presenca Minima (%)</label><input name="presenca_minima" type="number" step="1" defaultValue={75} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3 bg-figueira text-white text-[10px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {loading ? 'A criar...' : 'Criar Curso'}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    ) : null

    // Modal turma
    // Modal editar curso
    const editarCursoModal = modalEditarCurso && mounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 z-10 bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Editar Curso</h2>
                    <button onClick={() => setModalEditarCurso(null)} className="text-muted hover:text-fg transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={handleEditarCurso} className="p-6 space-y-4">
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Titulo *</label><input name="titulo" required defaultValue={modalEditarCurso.titulo} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Descricao</label><textarea name="descricao" rows={2} defaultValue={modalEditarCurso.descricao || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors resize-y" /></div>
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Ementa</label><textarea name="ementa" rows={5} defaultValue={modalEditarCurso.ementa || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors resize-y" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Categoria</label><select name="categoria" defaultValue={modalEditarCurso.categoria} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"><option value="EBD">EBD</option><option value="LIVRE">Curso Livre</option><option value="DISCIPULADO">Discipulado</option><option value="SEMINARIO">Seminario</option></select></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Vagas Maximas</label><input name="vagas_maximas" type="number" min="1" defaultValue={modalEditarCurso.vagas_maximas || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" placeholder="Ilimitado" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Carga Horaria (h)</label><input name="carga_horaria" type="number" min="1" defaultValue={modalEditarCurso.carga_horaria || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Trimestre</label><select name="trimestre" defaultValue={modalEditarCurso.trimestre || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"><option value="">N/A</option><option value="1">1o</option><option value="2">2o</option><option value="3">3o</option><option value="4">4o</option></select></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Ano *</label><input name="ano" type="number" required defaultValue={modalEditarCurso.ano} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Data Inicio *</label><input name="data_inicio" type="date" required defaultValue={modalEditarCurso.data_inicio.split('T')[0]} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Data Fim *</label><input name="data_fim" type="date" required defaultValue={modalEditarCurso.data_fim.split('T')[0]} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Tipo Inscricao</label><select name="tipo_inscricao" defaultValue={modalEditarCurso.tipo_inscricao} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"><option value="LIVRE">Livre (todos)</option><option value="DEPARTAMENTO">Departamento exclusivo</option><option value="GRUPO">Grupo exclusivo</option></select></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Abertura Inscricoes</label><input name="data_abertura_inscricoes" type="datetime-local" defaultValue={modalEditarCurso.data_abertura_inscricoes ? modalEditarCurso.data_abertura_inscricoes.slice(0, 16) : ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Status</label><select name="status" defaultValue={modalEditarCurso.status} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors"><option value="PLANEADO">Planeado</option><option value="EM_CURSO">Em Curso</option><option value="CONCLUIDO">Concluido</option><option value="CANCELADO">Cancelado</option></select></div>
                        <div />
                    </div>
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer"><input name="is_externo" type="checkbox" defaultChecked={modalEditarCurso.is_externo} className="w-4 h-4 rounded border-soft accent-figueira" /><span className="text-[10px] font-black uppercase tracking-widest text-muted">Curso Externo</span></label>
                        <div className="grid grid-cols-3 gap-4">
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Link Externo</label><input name="link_externo" defaultValue={modalEditarCurso.link_externo || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Responsavel</label><input name="responsavel_nome" defaultValue={modalEditarCurso.responsavel_nome || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                            <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Telefone</label><input name="responsavel_tel" defaultValue={modalEditarCurso.responsavel_tel || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                        </div>
                    </div>
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Material de Referencia</label><input name="material_ref" defaultValue={modalEditarCurso.material_ref || ''} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Nota Minima</label><input name="nota_minima" type="number" step="0.1" defaultValue={modalEditarCurso.nota_minima} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                        <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Presenca Minima (%)</label><input name="presenca_minima" type="number" step="1" defaultValue={modalEditarCurso.presenca_minima} className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg focus:outline-none focus:border-figueira transition-colors" /></div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full py-3 bg-figueira text-white text-[10px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        {loading ? 'A guardar...' : 'Guardar Alteracoes'}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    ) : null

    const turmaModal = modalTurma && mounted ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-bg2 border border-soft rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 z-10 bg-bg2 border-b border-soft px-6 py-4 flex items-center justify-between rounded-t-2xl">
                    <h2 className="text-sm font-black uppercase tracking-widest text-fg">Nova Turma</h2>
                    <button onClick={() => { setModalTurma(null); setProfsSelecionados([]) }} className="text-muted hover:text-fg transition-colors"><X size={18} /></button>
                </div>
                <form onSubmit={e => { const hidden = e.currentTarget.querySelector('input[name="professor_ids"]') as HTMLInputElement; if (hidden) hidden.value = profsSelecionados.join(','); handleCriarTurma(e) }} className="p-6 space-y-4">
                    <input type="hidden" name="professor_ids" value={profsSelecionados.join(',')} />
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Nome *</label><input name="nome" required className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" placeholder="Ex: Turma A, Adultos" /></div>
                    <div><label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Faixa Etaria</label><input name="faixa_etaria" className="w-full bg-bg border border-soft rounded-2xl px-4 py-2.5 text-xs text-fg placeholder:text-muted/50 focus:outline-none focus:border-figueira transition-colors" placeholder="Ex: 18-35 anos" /></div>
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-muted mb-1">Professores * <span className="text-figueira">({profsSelecionados.length})</span></label>
                        <div className="bg-bg border border-soft rounded-2xl p-2 max-h-48 overflow-y-auto space-y-0.5">
                            {membros.map(m => (
                                <label key={m.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all text-xs ${profsSelecionados.includes(m.id) ? 'bg-figueira/10 text-figueira font-bold' : 'text-fg hover:bg-soft/30'}`}>
                                    <input type="checkbox" checked={profsSelecionados.includes(m.id)} onChange={() => setProfsSelecionados(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} className="w-3.5 h-3.5 rounded border-soft accent-figueira" />
                                    {m.first_name} {m.last_name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <button type="submit" disabled={loading || profsSelecionados.length === 0} className="w-full py-3 bg-figueira text-white text-[10px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        {loading ? 'A criar...' : 'Criar Turma'}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    ) : null

    return (
        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 pb-24 animate-in fade-in duration-700">
            <header className="space-y-4">
                <div className="flex items-center gap-2 text-figueira">
                    <GraduationCap size={16} />
                    <span className="font-black text-[10px] uppercase tracking-[0.3em]">Cursos & Formacao</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    Cursos<span className="text-muted/20">.</span>
                </h1>
            </header>


            {/* Tabs */}
            <div className="flex gap-1 bg-bg2 border border-soft rounded-2xl p-1">
                <button onClick={() => setTab('disponiveis')} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'disponiveis' ? 'bg-figueira text-white' : 'text-muted hover:text-fg'}`}>
                    Disponiveis
                </button>
                <button onClick={() => setTab('meus')} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'meus' ? 'bg-figueira text-white' : 'text-muted hover:text-fg'}`}>
                    Meus Cursos
                </button>
                {podeGerir && (
                    <button onClick={() => setTab('gestao')} className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === 'gestao' ? 'bg-figueira text-white' : 'text-muted hover:text-fg'}`}>
                        Gestao
                    </button>
                )}
            </div>

            {/* Filtros por categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
                {['TODOS', 'EBD', 'LIVRE', 'DISCIPULADO', 'SEMINARIO'].map(cat => (
                    <button key={cat} onClick={() => setFiltroCategoria(cat)}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filtroCategoria === cat ? 'bg-figueira text-white' : 'bg-bg border border-soft text-muted hover:text-fg'}`}>
                        {cat === 'TODOS' ? 'Todos' : CATEGORIA_LABELS[cat]?.label || cat}
                    </button>
                ))}
            </div>

            {/* Action bar (gestao only) */}
            {tab === 'gestao' && podeGerir && (
                <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">{cursosFiltrados.length} curso{cursosFiltrados.length !== 1 ? 's' : ''}</p>
                    <button onClick={() => setModalCurso(true)} className="flex items-center gap-2 px-5 py-2.5 bg-figueira text-white text-[9px] font-black uppercase tracking-widest rounded-[2.5rem] hover:opacity-90 transition-opacity">
                        <Plus size={12} /> Novo Curso
                    </button>
                </div>
            )}

            {/* Course list */}
            {cursosFiltrados.length === 0 ? (
                <div className="py-20 text-center border-2 border-dashed border-soft rounded-[2.5rem]">
                    <GraduationCap size={32} className="mx-auto text-muted/30 mb-4" />
                    <p className="text-xs font-black uppercase text-muted tracking-widest">
                        {tab === 'disponiveis' ? 'Nenhum curso disponivel de momento.' : tab === 'meus' ? 'Ainda nao esta inscrito em nenhum curso.' : 'Nenhum curso encontrado.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {cursosFiltrados.map(c => (
                        <CursoCard key={c.id} curso={c} modo={tab === 'gestao' ? 'gestao' : meusCursoIds.includes(c.id) ? 'meu' : 'disponivel'} />
                    ))}
                </div>
            )}

            {cursoModal}
            {editarCursoModal}
            {turmaModal}
            {detalhesModal}
        </main>
    )
}
