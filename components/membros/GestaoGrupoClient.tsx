'use client'

// O meu grupo, no telemovel: tres partes com nome (Grupo, Novo encontro, Encontros),
// letra grande. Quem nao e lider ve os dados como texto, sem campos apagados.

import { useState, useRef } from 'react'
import {
    ChevronDown, Users, Save, Loader2, Check, MapPin, CalendarDays, User,
    History, Image as ImageIcon, Camera,
} from 'lucide-react'
import { registrarEncontroAction, atualizarDadosGrupoAction } from '@/actions/grupo-actions'
import dynamic from 'next/dynamic'
import type { PontoArea } from '@/lib/area-grupo'
import { useToast } from '@/components/ui/ConfirmDialog'
import { reduzirImagensDoForm } from '@/lib/reduzir-imagem'

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

export default function GestaoGrupoClient({ grupo, ehLider }: { grupo: any, ehLider: boolean }) {
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

    const [presentes, setPresentes] = useState<number[]>([])
    const [previewFoto, setPreviewFoto] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Lideres primeiro, sem repetir quem e lider e membro
    const participantesMap = new Map()
    grupo.lideres?.forEach((l: any) => participantesMap.set(l.id, { ...l, isLider: true }))
    grupo.membros?.forEach((m: any) => { if (!participantesMap.has(m.id)) participantesMap.set(m.id, { ...m, isLider: false }) })
    const todosParticipantes = Array.from(participantesMap.values())

    const handleInputChange = (e: any) => {
        if (!ehLider) return
        setDadosForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const togglePresenca = (membroId: number) => {
        setPresentes(prev => prev.includes(membroId) ? prev.filter(id => id !== membroId) : [...prev, membroId])
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => setPreviewFoto(reader.result as string)
            reader.readAsDataURL(file)
        }
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

    async function handleRegistrarEncontro(formData: FormData) {
        if (!ehLider) return
        await reduzirImagensDoForm(formData)
        if (!formData.get('data') || !formData.get('tema')) {
            toast('Escreva a data e o resumo do encontro.', 'aviso')
            return
        }
        setLoading(true)
        formData.append('grupo_id', grupo.id.toString())
        const res = await registrarEncontroAction(formData, presentes)
        setLoading(false)
        if (res.sucesso) {
            toast('Encontro registado.', 'sucesso')
            setPresentes([])
            setPreviewFoto(null)
            setAba('historico')
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            toast(res.erro, 'erro')
        }
    }

    const abas: { valor: Aba; texto: string }[] = [
        { valor: 'grupo', texto: 'Grupo' },
        ...(ehLider ? [{ valor: 'encontro' as Aba, texto: 'Novo encontro' }] : []),
        { valor: 'historico', texto: 'Encontros' },
    ]

    const morada = [dadosForm.endereco && `${dadosForm.endereco}${dadosForm.numero ? `, ${dadosForm.numero}` : ''}`, dadosForm.bairro, dadosForm.cidade]
        .filter(Boolean).join(' · ')

    return (
        <main className="app-novo mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-20 md:pb-10 md:pt-8" style={{ background: 'transparent' }}>
            <div className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight">{grupo.nome}</h1>
                <p className="text-[17px] a-suave">{grupo.categoria || 'Grupo familiar'}</p>
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
                <form action={handleRegistrarEncontro} className="space-y-4">
                    <section className="a-card space-y-4 p-4">
                        <Campo label="Data do encontro" name="data" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                        <div className="space-y-2">
                            <label htmlFor="grupo-tema" className="block text-[16px] font-semibold">O que foi falado</label>
                            <textarea id="grupo-tema" name="tema" required rows={4} className={`${CAMPO} resize-none py-3`} style={ESTILO_CAMPO} />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[16px] font-semibold">Fotografia <span className="font-normal a-suave">(se quiser)</span></p>
                            {previewFoto && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={previewFoto} className="aspect-video w-full rounded-[14px] object-cover" alt="Fotografia escolhida" />
                            )}
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="a-botao a-botao-secundario w-full">
                                <Camera size={20} aria-hidden /> {previewFoto ? 'Trocar a fotografia' : 'Escolher fotografia'}
                            </button>
                            <input type="file" name="foto" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />
                        </div>
                    </section>

                    <section className="a-card">
                        <h2 className="flex items-center gap-3 px-4 pt-4 text-[18px] font-semibold">
                            <span className="flex-1">Quem esteve</span>
                            <span className="text-[16px] font-normal a-suave">{presentes.length} de {todosParticipantes.length}</span>
                        </h2>
                        <ul className="a-divide mt-2">
                            {todosParticipantes.map((membro: any) => {
                                const presente = presentes.includes(membro.id)
                                return (
                                    <li key={membro.id}>
                                        <button type="button" role="checkbox" aria-checked={presente} onClick={() => togglePresenca(membro.id)}
                                            className="a-foco flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2"
                                                style={presente
                                                    ? { background: 'var(--a-destaque)', borderColor: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' }
                                                    : { borderColor: 'var(--a-borda)' }}>
                                                {presente && <Check size={20} strokeWidth={3} aria-hidden />}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-[17px]">{membro.first_name} {membro.last_name}</span>
                                            {membro.isLider && <span className="shrink-0 text-[15px] a-suave">Líder</span>}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>

                    <button type="submit" disabled={loading} className="a-botao a-botao-principal w-full !min-h-[56px]">
                        {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Save size={20} aria-hidden />}
                        {loading ? 'A guardar…' : 'Guardar o encontro'}
                    </button>
                </form>
            )}

            {aba === 'historico' && (
                grupo.encontros && grupo.encontros.length > 0 ? (
                    <ul className="space-y-3">
                        {grupo.encontros.map((encontro: any) => (
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
                        <p className="text-[16px] a-suave">{ehLider ? 'Registe o primeiro em "Novo encontro".' : 'Os encontros aparecem aqui.'}</p>
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
