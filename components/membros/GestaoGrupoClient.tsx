'use client'

// O meu grupo, no telemovel: tres partes com nome (Grupo, Registar, Encontros),
// letra grande. Quem nao e lider ve os dados como texto, sem campos apagados.

import { useState } from 'react'
import {
    ChevronDown, Users, Save, Loader2, MapPin, CalendarDays, User,
    History, Image as ImageIcon,
} from 'lucide-react'
import { atualizarDadosGrupoAction } from '@/actions/grupo-actions'
import dynamic from 'next/dynamic'
import type { PontoArea } from '@/lib/area-grupo'
import { useToast } from '@/components/ui/ConfirmDialog'
import FotoDoGrupo from './FotoDoGrupo'

const EditorAreaGrupo = dynamic(() => import('@/components/grupos/EditorAreaGrupo'), {
    ssr: false,
    loading: () => <div className="h-[320px] animate-pulse rounded-[14px]" style={{ background: 'var(--a-bg)' }} />,
})

const CAMPO = 'a-foco min-h-[52px] w-full rounded-[14px] border px-4 text-[17px]'
const ESTILO_CAMPO = { background: 'var(--a-bg)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }
const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo']
const PAISES = ['Portugal', 'Brasil', 'Angola', 'Moçambique', 'Cabo Verde', 'São Tomé e Príncipe', 'Guiné-Bissau',
    'Espanha', 'França', 'Reino Unido', 'Estados Unidos', 'Canadá', 'Suíça', 'Luxemburgo']

type Aba = 'grupo' | 'encontro' | 'historico'

type Reuniao = { id: number; titulo: string; inicio: string; registo: string | null; presentes: number | null; foto_url: string | null; presentes_membros: { id: number; first_name: string; last_name: string }[] }
const dataReuniao = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })

export default function GestaoGrupoClient({ grupo, ehLider, reunioes = [] }: { grupo: any, ehLider: boolean, reunioes?: Reuniao[] }) {
    const toast = useToast()
    const [aba, setAba] = useState<Aba>('grupo')
    const [loading, setLoading] = useState(false)

    const [dadosForm, setDadosForm] = useState({
        dia_semana: grupo.dia_semana || '',
        horario: grupo.horario || '',
        endereco: grupo.endereco || '',
        numero: grupo.numero || '',
        bairro: grupo.bairro || '',
        cidade: grupo.cidade || '',
        distrito: grupo.estado || '',
        pais: grupo.pais || 'Portugal'
    })

    // Zona que o grupo abrange (desenhada no mapa)
    const [area, setArea] = useState<PontoArea[] | null>(grupo.area ?? null)
    const [verMapa, setVerMapa] = useState(false)

    // Lideres primeiro, sem repetir quem e lider e membro
    const participantesMap = new Map()
    grupo.lideres?.forEach((l: any) => participantesMap.set(l.id, { ...l, isLider: true }))
    grupo.membros?.forEach((m: any) => { if (!participantesMap.has(m.id)) participantesMap.set(m.id, { ...m, isLider: false }) })
    const todosParticipantes = Array.from(participantesMap.values())

    const handleInputChange = (e: any) => {
        if (!ehLider) return
        setDadosForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    async function handleSalvarConfig() {
        if (!ehLider) return
        setLoading(true)
        const formData = new FormData()
        formData.append('grupo_id', grupo.id.toString())
        Object.entries(dadosForm).forEach(([key, value]) => formData.append(key, value))
        // Sem mapa ligado o editor nao aparece: a zona guardada fica como esta
        if (grupo.mostrar_mapa) formData.append('area', area ? JSON.stringify(area) : '')

        const res = await atualizarDadosGrupoAction(formData)
        setLoading(false)
        if (res.sucesso) toast('Dados do grupo guardados.', 'sucesso')
        else toast(res.erro, 'erro')
    }

    // Histórico: os encontros antigos + as reuniões da agenda já registadas, do mais recente para o mais antigo
    const historico: any[] = [
        ...(grupo.encontros ?? []).map((e: any) => ({ ...e, quando: new Date(e.data).getTime() })),
        ...reunioes.filter((r) => r.registo || r.foto_url || r.presentes_membros.length).map((r) => ({
            id: `a${r.id}`, data: r.inicio, tema: r.registo || r.titulo, foto_url: r.foto_url, presentes: r.presentes_membros, quando: new Date(r.inicio).getTime(),
        })),
    ].sort((a, b) => b.quando - a.quando)

    const abas: { valor: Aba; texto: string }[] = [
        { valor: 'grupo', texto: 'Grupo' },
        ...(ehLider ? [{ valor: 'encontro' as Aba, texto: 'Registar' }] : []),
        { valor: 'historico', texto: 'Encontros' },
    ]

    const morada = [dadosForm.endereco && `${dadosForm.endereco}${dadosForm.numero ? `, ${dadosForm.numero}` : ''}`, dadosForm.bairro, dadosForm.cidade]
        .filter(Boolean).join(' · ')

    return (
        <main className="app-novo mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-20 md:pb-10 md:pt-8" style={{ background: 'transparent' }}>
            <div className="space-y-3">
                <div className="space-y-1">
                    <h1 className="text-[28px] font-bold leading-tight">{grupo.nome}</h1>
                    <p className="text-[17px] a-suave">{grupo.categoria || 'Grupo familiar'}</p>
                </div>
                <FotoDoGrupo grupoId={grupo.id} nome={grupo.nome} url={grupo.foto_url ?? null} podeMudar={ehLider} />
            </div>

            <div role="tablist" aria-label="Partes do grupo" className="flex gap-2">
                {abas.map(a => (
                    <button key={a.valor} type="button" role="tab" aria-selected={aba === a.valor} onClick={() => setAba(a.valor)}
                        className={`a-botao flex-1 !min-h-[48px] !px-2 ${aba === a.valor ? 'a-botao-principal' : 'a-botao-secundario'}`}>
                        {a.texto}
                    </button>
                ))}
            </div>

            {aba === 'grupo' && (
                <div className="space-y-3">
                    {/* Secções que abrem e fecham: no telemóvel não fica uma lista sem fim */}
                    <details open className="a-card group/sec">
                        <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 text-[18px] font-semibold">
                            <Users size={22} style={{ color: 'var(--a-destaque)' }} aria-hidden />
                            <span className="flex-1">Pessoas</span>
                            <span className="text-[16px] font-normal a-suave">{todosParticipantes.length}</span>
                            <ChevronDown size={20} className="a-suave transition-transform group-open/sec:rotate-180" aria-hidden />
                        </summary>
                        {todosParticipantes.length > 0 ? (
                            <ul className="a-divide">
                                {todosParticipantes.map((membro: any) => (
                                    <li key={membro.id} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                                        <Avatar src={membro.avatar_file} />
                                        <span className="min-w-0 flex-1 truncate text-[17px]">{membro.first_name} {membro.last_name}</span>
                                        {membro.isLider && <span className="shrink-0 text-[15px] font-semibold" style={{ color: 'var(--a-destaque)' }}>Líder</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="px-4 pb-4 text-[16px] a-suave">Ainda não há pessoas neste grupo.</p>
                        )}
                    </details>

                    <details className="a-card group/sec">
                        <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 py-3">
                            <MapPin size={22} style={{ color: 'var(--a-destaque)' }} aria-hidden />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[18px] font-semibold">Onde e quando</span>
                                <span className="block truncate text-[15px] a-suave">
                                    {[dadosForm.dia_semana, dadosForm.horario].filter(Boolean).join(', às ') || 'Dia por definir'} · {morada || 'morada por definir'}
                                </span>
                            </span>
                            <ChevronDown size={20} className="shrink-0 a-suave transition-transform group-open/sec:rotate-180" aria-hidden />
                        </summary>
                        <div className="space-y-4 px-4 pb-4">
                            {ehLider ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Escolha label="Dia" name="dia_semana" value={dadosForm.dia_semana} onChange={handleInputChange} options={DIAS} />
                                        <Campo label="Hora" name="horario" type="time" value={dadosForm.horario} onChange={handleInputChange} />
                                    </div>
                                    <div className="grid grid-cols-[1fr_96px] gap-3">
                                        <Campo label="Rua" name="endereco" value={dadosForm.endereco} onChange={handleInputChange} />
                                        <Campo label="Número" name="numero" value={dadosForm.numero} onChange={handleInputChange} />
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Campo label="Freguesia / bairro" name="bairro" value={dadosForm.bairro} onChange={handleInputChange} />
                                        <Campo label="Cidade" name="cidade" value={dadosForm.cidade} onChange={handleInputChange} />
                                        <Campo label="Distrito" name="distrito" value={dadosForm.distrito} onChange={handleInputChange} />
                                        <Escolha label="País" name="pais" value={dadosForm.pais} onChange={handleInputChange} options={PAISES} />
                                    </div>
                                </>
                            ) : (
                                <dl className="space-y-3 text-[17px]">
                                    <div><dt className="text-[15px] a-suave">Quando</dt><dd>{[dadosForm.dia_semana, dadosForm.horario].filter(Boolean).join(', às ') || 'Por definir'}</dd></div>
                                    <div><dt className="text-[15px] a-suave">Onde</dt><dd>{morada || 'Por definir'}</dd></div>
                                </dl>
                            )}
                            {ehLider && (
                                <button type="button" onClick={handleSalvarConfig} disabled={loading} className="a-botao a-botao-principal w-full">
                                    {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Save size={20} aria-hidden />}
                                    {loading ? 'A guardar…' : 'Guardar'}
                                </button>
                            )}
                        </div>
                    </details>

                    {grupo.mostrar_mapa && (
                        <details className="a-card group/sec" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setVerMapa(true) }}>
                            <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 text-[18px] font-semibold">
                                <MapPin size={22} style={{ color: 'var(--a-destaque)' }} aria-hidden />
                                <span className="flex-1">Zona do grupo no mapa</span>
                                <ChevronDown size={20} className="a-suave transition-transform group-open/sec:rotate-180" aria-hidden />
                            </summary>
                            <div className="space-y-2 px-4 pb-4">
                                {ehLider && <p className="text-[15px] a-suave">Desenhe a zona no mapa e depois toque em &quot;Guardar zona&quot;.</p>}
                                {/* o mapa só se desenha depois de abrir (fechado não tem tamanho) */}
                                {verMapa && <EditorAreaGrupo latitude={grupo.latitude} longitude={grupo.longitude} valor={grupo.area}
                                    onChange={ehLider ? setArea : undefined} />}
                                {ehLider && (
                                    <button type="button" onClick={handleSalvarConfig} disabled={loading} className="a-botao a-botao-principal w-full">
                                        {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Save size={20} aria-hidden />}
                                        {loading ? 'A guardar…' : 'Guardar zona'}
                                    </button>
                                )}
                            </div>
                        </details>
                    )}
                </div>
            )}

            {aba === 'encontro' && ehLider && (
                <div className="space-y-3">
                    <p className="text-[16px] a-suave">O registo de cada encontro (o que se fez, quem esteve, a foto) faz-se no dia da agenda do grupo.</p>
                    {reunioes.length === 0 ? (
                        <div className="a-card space-y-3 p-5 text-center">
                            <p className="text-[17px] font-semibold">Ainda não há reuniões na agenda</p>
                            <a href={`/membros/grupo/${grupo.id}/agenda?novo=1`} className="a-botao a-botao-principal w-full">Criar na agenda</a>
                        </div>
                    ) : (
                        <>
                            <ul className="space-y-2">
                                {reunioes.map((r) => {
                                    const feito = !!(r.registo || r.foto_url || r.presentes_membros.length)
                                    return (
                                        <li key={r.id} className="a-card flex items-center gap-3 p-4">
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[17px] font-semibold">{r.titulo}</span>
                                                <span className="block text-[15px] a-suave">{dataReuniao(r.inicio)} · {feito ? 'Registado' : 'Por registar'}</span>
                                            </span>
                                            <a href={`/membros/grupo/${grupo.id}/agenda?mes=${r.inicio.slice(0, 7)}`} className={`a-botao !min-h-[44px] ${feito ? 'a-botao-secundario' : 'a-botao-principal'}`}>
                                                {feito ? 'Ver' : 'Registar'}
                                            </a>
                                        </li>
                                    )
                                })}
                            </ul>
                            <a href={`/membros/grupo/${grupo.id}/agenda?novo=1`} className="a-botao a-botao-secundario w-full">Criar na agenda</a>
                        </>
                    )}
                </div>
            )}

            {aba === 'historico' && (
                historico.length > 0 ? (
                    <ul className="space-y-3">
                        {historico.map((encontro: any) => (
                            <li key={encontro.id}>
                                <details className="a-card group">
                                    <summary className="a-foco flex min-h-[64px] cursor-pointer list-none items-center gap-3 px-4 py-3">
                                        <CalendarDays size={22} className="shrink-0" style={{ color: 'var(--a-destaque)' }} aria-hidden />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-[17px] font-semibold">
                                                {new Date(encontro.data).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </span>
                                            <span className="block text-[15px] a-suave">
                                                {encontro.presentes?.length || 0} {encontro.presentes?.length === 1 ? 'pessoa' : 'pessoas'}
                                            </span>
                                        </span>
                                        <ChevronDown size={22} className="shrink-0 a-suave transition-transform group-open:rotate-180" aria-hidden />
                                    </summary>
                                    <div className="space-y-4 border-t px-4 py-4" style={{ borderColor: 'var(--a-borda)' }}>
                                        {encontro.foto_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={encontro.foto_url} className="aspect-video w-full rounded-[14px] object-cover" alt="Fotografia do encontro" />
                                        ) : (
                                            <p className="flex items-center gap-2 text-[15px] a-suave"><ImageIcon size={18} aria-hidden /> Sem fotografia</p>
                                        )}
                                        <p className="whitespace-pre-wrap text-[17px] leading-relaxed">{encontro.tema}</p>
                                        <div className="space-y-1">
                                            <p className="text-[15px] a-suave">Estiveram presentes</p>
                                            <p className="text-[17px]">
                                                {encontro.presentes?.length
                                                    ? encontro.presentes.map((p: any) => `${p.first_name} ${p.last_name}`).join(', ')
                                                    : 'Ninguém marcado.'}
                                            </p>
                                        </div>
                                    </div>
                                </details>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="a-card space-y-2 p-6 text-center">
                        <History size={36} className="mx-auto a-suave" aria-hidden />
                        <p className="text-[18px] font-semibold">Ainda sem encontros</p>
                        <p className="text-[16px] a-suave">{ehLider ? 'Registe o primeiro em "Registar".' : 'Os encontros aparecem aqui.'}</p>
                    </div>
                )
            )}
        </main>
    )
}

function Avatar({ src }: { src?: string | null }) {
    return (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full a-suave" style={{ background: 'var(--a-bg)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src ? <img src={src} className="h-full w-full object-cover" alt="" /> : <User size={22} aria-hidden />}
        </span>
    )
}

function Campo({ label, name, ...props }: any) {
    const id = `grupo-${name}`
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-[16px] font-semibold">{label}</label>
            <input id={id} name={name} {...props} className={CAMPO} style={ESTILO_CAMPO} />
        </div>
    )
}

function Escolha({ label, name, value, onChange, options }: { label: string; name: string; value: string; onChange: any; options: string[] }) {
    const id = `grupo-${name}`
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-[16px] font-semibold">{label}</label>
            <select id={id} name={name} value={value} onChange={onChange} className={`${CAMPO} cursor-pointer`} style={ESTILO_CAMPO}>
                <option value="">Escolher…</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    )
}
