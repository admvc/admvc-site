'use client'
// components/grupos/FormGrupo.tsx
// Substitui o formulário de criação/edição de grupos na página de configurações

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { salvarGrupoAction } from '@/actions/admin-actions'
import { MapPin, Loader2, CheckCircle2, Globe, EyeOff } from 'lucide-react'

const MapaPreviewGrupo = dynamic(() => import('@/components/grupos/MapaPreviewGrupo'), {
    ssr: false,
    loading: () => <div className="w-full h-[200px] rounded-2xl bg-bg2 border border-soft animate-pulse" />,
})

const REGIOES = ['Norte', 'Centro', 'Sul', 'Lisboa', 'Online']

const DIAS_SEMANA = [
    'Segunda-feira', 'Terca-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sabado', 'Domingo'
]

const CATEGORIAS = ['Celula', 'Jovens', 'Casais', 'Mulheres', 'Homens', 'Criancas', 'Seniores', 'Misto']

interface Props {
    grupo?: any       // undefined = criar novo
    membros?: any[]   // para o select de líder
    onSucesso?: () => void
}

export default function FormGrupo({ grupo, membros = [], onSucesso }: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [sucesso, setSucesso] = useState(false)
    const [erro, setErro] = useState('')
    const [publico, setPublico] = useState(grupo?.publico ?? false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setErro('')

        const formData = new FormData(e.currentTarget)
        formData.set('publico', publico ? 'true' : 'false')

        startTransition(async () => {
            const res = await salvarGrupoAction(formData)
            if (res.ok) {
                setSucesso(true)
                router.refresh()
                onSucesso?.()
                setTimeout(() => setSucesso(false), 3000)
            } else {
                setErro(res.error || 'Erro ao guardar grupo.')
            }
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {grupo && <input type="hidden" name="id" value={grupo.id} />}

            {/* FEEDBACK */}
            {sucesso && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                    <CheckCircle2 size={13} /> Grupo guardado com sucesso!
                </div>
            )}
            {erro && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-700 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest">
                    {erro}
                </div>
            )}

            {/* NOME */}
            <Campo label="Nome do Grupo *" name="nome" defaultValue={grupo?.nome} required />

            {/* DIA + HORA */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">Dia da Semana</label>
                    <select name="dia_semana" defaultValue={grupo?.dia_semana || ''}
                        className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                        <option value="">Selecione...</option>
                        {DIAS_SEMANA.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <Campo label="Horario" name="horario" type="time" defaultValue={grupo?.horario} />
            </div>

            {/* CATEGORIA + PERFIL */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">Categoria</label>
                    <select name="categoria" defaultValue={grupo?.categoria || ''}
                        className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                        <option value="">Selecione...</option>
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <Campo label="Perfil (Adultos, Jovens...)" name="perfil" defaultValue={grupo?.perfil} />
            </div>

            {/* SEPARADOR MORADA */}
            <div className="pt-2 border-t border-soft">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-4">
                    <MapPin size={11} className="text-figueira" /> Morada — preenchida automaticamente no mapa
                </p>
                <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Campo label="Morada / Rua" name="endereco" defaultValue={grupo?.endereco} className="col-span-2" />
                        <Campo label="Numero" name="numero" defaultValue={grupo?.numero} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Campo label="Bairro / Freguesia" name="bairro" defaultValue={grupo?.bairro} />
                        <Campo label="Cidade *" name="cidade" defaultValue={grupo?.cidade} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Campo label="Distrito" name="estado" defaultValue={grupo?.estado} />
                        <Campo label="Pais" name="pais" defaultValue={grupo?.pais || 'Portugal'} />
                    </div>
                </div>
            </div>

            {/* REGIÃO */}
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">
                    Regiao (para filtrar no mapa)
                </label>
                <div className="flex flex-wrap gap-2">
                    {REGIOES.map(r => (
                        <label key={r} className="cursor-pointer">
                            <input type="radio" name="regiao" value={r}
                                defaultChecked={grupo?.regiao === r}
                                className="sr-only peer" />
                            <span className="peer-checked:bg-fg peer-checked:text-bg peer-checked:border-fg px-4 py-2 rounded-xl border border-soft text-[9px] font-black uppercase tracking-widest text-muted hover:border-figueira/30 transition-all">
                                {r}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* LIDER */}
            {membros.length > 0 && (
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">Lider do Grupo</label>
                    <select name="lider_id" defaultValue={grupo?.lideres?.[0]?.id || ''}
                        className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                        <option value="">Sem lider definido</option>
                        {membros.map(m => (
                            <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* DESCRICAO */}
            <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">Descricao</label>
                <textarea name="descricao" rows={3} defaultValue={grupo?.descricao || ''}
                    placeholder="Breve descricao do grupo, tema, dinamica..."
                    className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none resize-none" />
            </div>

            {/* VISIBILIDADE PÚBLICA */}
            <div className={`flex items-center justify-between px-5 py-4 rounded-2xl border transition-all cursor-pointer
                ${publico ? 'bg-blue-500/8 border-blue-500/20' : 'bg-bg border-soft'}`}
                onClick={() => setPublico(!publico)}>
                <div className="flex items-center gap-3">
                    {publico ? <Globe size={16} className="text-blue-600" /> : <EyeOff size={16} className="text-muted" />}
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${publico ? 'text-blue-700' : 'text-fg'}`}>
                            {publico ? 'Visievel no site publico' : 'Privado — apenas admin'}
                        </p>
                        <p className="text-[9px] font-medium text-muted mt-0.5">
                            {publico ? 'Aparece na pagina /grupos com mapa' : 'Nao aparece na pagina publica'}
                        </p>
                    </div>
                </div>
                <div className={`w-10 h-6 rounded-full transition-all relative ${publico ? 'bg-blue-500' : 'bg-soft'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${publico ? 'left-5' : 'left-1'}`} />
                </div>
            </div>

            {/* MAPA DE LOCALIZAÇÃO */}
            <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                    <MapPin size={11} className="text-figueira" /> Localização no Mapa
                </p>
                <MapaPreviewGrupo
                    latitude={grupo?.latitude || null}
                    longitude={grupo?.longitude || null}
                />
                <p className="text-[9px] font-medium text-figueira/80 leading-relaxed">
                    As coordenadas GPS são preenchidas automaticamente com base na morada ao guardar.
                    Precisa de preencher pelo menos a <strong>Cidade</strong>.
                </p>
            </div>

            {/* SUBMIT */}
            <button type="submit" disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-fg text-bg py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-figueira transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {isPending
                    ? <><Loader2 size={14} className="animate-spin" /> A guardar e geocodificar...</>
                    : <><CheckCircle2 size={14} /> Guardar Grupo</>
                }
            </button>
        </form>
    )
}

function Campo({ label, className = '', ...props }: any) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">{label}</label>
            <input {...props}
                className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none transition-all" />
        </div>
    )
}