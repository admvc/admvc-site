"use client"

import { useState, useEffect, useRef } from 'react'
import { atualizarDadosMembro, submeterInteresseDepartamento } from '@/actions/membro-actions'
import {
    User, MapPin, Users2, Save, Church, FileSignature, AlertCircle,
    Check, ChevronRight, ArrowLeft, Camera, Loader2, Lock, Home,
    CheckCircle2, XCircle, HeartHandshake, Send
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    membro: any
    escolaridades?: any[]
    departamentos?: { id: number; nome: string }[]
    interessesExistentes?: { departamento_id: number; status: string }[]
    onSucesso?: () => void   // ✅ callback para o drawer refrescar a dashboard
    isDrawer?: boolean       // ✅ esconde o breadcrumb quando está em drawer
}

export default function MeuPerfilClient({
    membro,
    escolaridades = [],
    departamentos = [],
    interessesExistentes = [],
    onSucesso,
    isDrawer = false
}: Props) {
    const toast = useToast()
    const [isPending, setIsPending] = useState(false)
    const [mostrarSucesso, setMostrarSucesso] = useState(false)
    const [abaAtiva, setAbaAtiva] = useState('pessoal')

    const [previewFoto, setPreviewFoto] = useState(membro.avatar_file || null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [buscandoCP, setBuscandoCP] = useState(false)
    const [endereco, setEndereco] = useState({
        postal_code: membro.postal_code || '',
        address_1: membro.address_1 || '',
        neighborhood: membro.neighborhood || '',
        city: membro.id_city || membro.city || '',
        state: membro.state || '',
        country: membro.country || 'Portugal'
    })

    const handleCodigoPostalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let valor = e.target.value.replace(/\D/g, '')
        if (valor.length > 4) valor = valor.substring(0, 4) + '-' + valor.substring(4, 7)
        setEndereco(prev => ({ ...prev, postal_code: valor }))

        if (valor.length === 8) {
            setBuscandoCP(true)
            try {
                // const res = await fetch(`https://json.geoapi.pt/cp/${valor}`)
                const res = await fetch(`/api/codigo-postal?cp=${valor}`)
                if (res.ok) {
                    const data = await res.json()
                    const info = Array.isArray(data) ? data[0] : data
                    if (info && !info.erro) {
                        setEndereco(prev => ({
                            ...prev,
                            address_1: info.rua || (info.ruas && info.ruas[0]) || prev.address_1,
                            neighborhood: info.Freguesia || prev.neighborhood,
                            city: info.Designacao || info.Municipio || info.Município || info.Localidade || prev.city,
                            state: info.Distrito || prev.state,
                            country: 'Portugal',
                        }))
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar Código Postal:', error)
            } finally {
                setBuscandoCP(false)
            }
        }
    }

    const formatDate = (date: any) =>
        date ? new Date(date).toISOString().split('T')[0] : ''

    useEffect(() => {
        if (mostrarSucesso) {
            const timer = setTimeout(() => setMostrarSucesso(false), 4000)
            return () => clearTimeout(timer)
        }
    }, [mostrarSucesso])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => setPreviewFoto(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    async function handleAction(formData: FormData) {
        setIsPending(true)
        const res = await atualizarDadosMembro(membro.id, formData)
        setIsPending(false)

        if (res.sucesso) {
            setMostrarSucesso(true)
            // ✅ Se estiver em drawer, chama o callback em vez de scroll
            if (isDrawer && onSucesso) {
                onSucesso()
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' })
            }
        } else {
            toast(res.erro || 'Erro ao atualizar.', 'erro')
        }
    }

    const StatusDoc = ({ nome, aceite, validade }: any) => {
        const expirado = validade && new Date(validade) < new Date()
        const ok = aceite && !expirado
        return (
            <div className={`flex items-center gap-3 p-3 pr-5 rounded-2xl border ${ok ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${ok ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    {ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </div>
                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${ok ? 'text-green-700' : 'text-red-600'}`}>
                        {nome}
                    </span>
                    <span className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${ok ? 'text-green-600/70' : 'text-red-500/70'}`}>
                        {ok && validade
                            ? `Válido até ${new Date(validade).toLocaleDateString('pt-PT')}`
                            : ok ? 'Assinado' : 'Pendente / Expirado'}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <div className={isDrawer ? 'p-6 space-y-6' : 'max-w-6xl mx-auto p-4 sm:p-6 pb-20 animate-in fade-in duration-700'}>
            <form action={handleAction} className="space-y-6">

                {/* BREADCRUMB — só fora do drawer */}
                {!isDrawer && (
                    <nav className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                        <Link href="/membros/dashboard" className="hover:text-figueira transition-colors flex items-center gap-2">
                            <ArrowLeft size={12} strokeWidth={3} /> Voltar à Dashboard
                        </Link>
                        <ChevronRight size={10} className="opacity-30" />
                        <span className="text-fg italic">O Meu Perfil</span>
                    </nav>
                )}

                {/* HEADER */}
                <header className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-soft pb-6 ${isDrawer ? '' : 'mb-2'}`}>
                    <div className="space-y-1">
                        {!isDrawer && (
                            <span className="text-figueira font-black text-[10px] uppercase tracking-[0.4em] flex items-center gap-2">
                                <User size={14} /> Área Pessoal
                            </span>
                        )}
                        <h1 className={`font-black italic uppercase tracking-tighter text-fg leading-none ${isDrawer ? 'text-2xl' : 'text-4xl md:text-5xl'}`}>
                            {isDrawer ? 'Editar Dados' : <>O Meu <span className="text-muted/20">Perfil.</span></>}
                        </h1>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                        {mostrarSucesso && (
                            <div className="flex items-center gap-3 text-green-500 bg-green-500/10 px-5 py-3 rounded-2xl border border-green-500/20 animate-in fade-in duration-300">
                                <Check size={16} strokeWidth={3} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Atualizado!</span>
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="w-full md:w-auto flex items-center justify-center gap-3 bg-fg text-bg px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-xl active:scale-95 disabled:opacity-50"
                        >
                            {isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {isPending ? 'A guardar...' : 'Guardar Alterações'}
                        </button>
                    </div>
                </header>

                {/* BANNER FAMÍLIA E COMPLIANCE */}
                <div className="bg-bg2 border border-soft p-5 rounded-2xl flex flex-col lg:flex-row gap-5 justify-between items-start lg:items-center">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${membro.familia ? 'bg-figueira text-white shadow-md' : 'bg-soft text-muted'}`}>
                            <Home size={20} />
                        </div>
                        <div>
                            {membro.familia ? (
                                <>
                                    <h3 className="text-base font-black uppercase italic tracking-tighter text-fg leading-none">Família {membro.familia.surname}</h3>
                                    <p className="text-[9px] text-figueira font-black uppercase tracking-widest mt-1 bg-figueira/10 px-2 py-0.5 rounded border border-figueira/20 inline-block">Grupo Familiar Vinculado</p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-base font-black uppercase italic tracking-tighter text-fg leading-none">Sem Família Vinculada</h3>
                                    <p className="text-[9px] text-muted font-black uppercase tracking-widest mt-1">Contacta a secretaria para vincular</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="hidden lg:block w-[1px] h-10 bg-soft" />
                    <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        <StatusDoc nome="Acordo GDPR" aceite={membro.gdpr_aceite} validade={membro.gdpr_validade} />
                        <StatusDoc nome="Termo Permanecer" aceite={membro.permanecer_aceite} validade={membro.permanecer_validade} />
                    </div>
                </div>

                {/* TABS */}
                <nav className={`flex flex-wrap gap-2 border-b border-soft pb-4 ${isDrawer ? 'sticky top-0 bg-bg/95 backdrop-blur-md z-30 pt-2' : 'sticky top-0 bg-bg/90 backdrop-blur-md z-30 pt-4'}`}>
                    {[
                        { id: 'pessoal', label: 'Pessoal', icon: <User size={13} /> },
                        { id: 'endereco', label: 'Morada', icon: <MapPin size={13} /> },
                        { id: 'familia', label: 'Relações', icon: <Users2 size={13} /> },
                        { id: 'eclesiastico', label: 'Eclesiástico', icon: <Church size={13} /> },
                        { id: 'servir', label: 'Servir', icon: <HeartHandshake size={13} /> },
                        { id: 'administrativo', label: 'Admin', icon: <Lock size={13} /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setAbaAtiva(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all ${abaAtiva === tab.id ? 'bg-fg text-bg shadow-md' : 'bg-bg2 text-muted border border-soft hover:bg-soft hover:text-fg'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>

                {/* CONTAINER DOS DADOS */}
                <div className="bg-bg2 border border-soft rounded-[2.5rem] p-6 md:p-8 min-h-[400px]">

                    {/* ABA: PESSOAL */}
                    <div className={abaAtiva === 'pessoal' ? 'block space-y-6 animate-in fade-in slide-in-from-bottom-4' : 'hidden'}>
                        <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-soft/50">
                            <div className="relative group shrink-0">
                                <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-soft relative">
                                    {previewFoto ? (
                                        <Image src={previewFoto} alt="Perfil" fill sizes="128px" className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-muted bg-bg">
                                            <User size={36} />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 bg-fg text-bg p-2.5 rounded-xl shadow-xl hover:bg-figueira transition-all"
                                >
                                    <Camera size={14} strokeWidth={3} />
                                </button>
                                <input type="file" name="avatar" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                            </div>
                            <div>
                                <h4 className="text-lg font-black uppercase italic text-fg">Foto de Perfil</h4>
                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Clica na câmara para alterar.</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Input label="Primeiro Nome" name="first_name" defaultValue={membro.first_name} required />
                            <Input label="Sobrenome" name="last_name" defaultValue={membro.last_name} required />
                            <Input label="E-mail (Bloqueado)" name="email" type="email" defaultValue={membro.email} readOnly
                                className="bg-soft/30 text-muted cursor-not-allowed border-dashed"
                                title="Para alterar o e-mail, contacte a secretaria." />
                            <Input label="Telemóvel" name="phone_1" defaultValue={membro.phone_1} />
                            <Input label="Nascimento" name="birthdate" type="date" defaultValue={formatDate(membro.birthdate)} />
                            <Select label="Gênero" name="gender" defaultValue={membro.gender} options={['Masculino', 'Feminino']} />
                            <Input label="Profissão" name="profession" defaultValue={membro.profession} />
                            <Input label="Nome do Pai" name="father_name" defaultValue={membro.father_name} />
                            <Input label="Nome da Mãe" name="mother_name" defaultValue={membro.mother_name} />
                            <div className="space-y-1.5 lg:col-span-3">
                                <label className="text-[9px] font-black uppercase text-muted tracking-widest ml-4">Escolaridade</label>
                                <select name="escolaridade_id" defaultValue={membro?.escolaridade_id || ''}
                                    className="w-full bg-bg border border-soft rounded-2xl p-4 text-[11px] font-bold text-fg focus:border-figueira outline-none shadow-sm appearance-none cursor-pointer">
                                    <option value="">Selecione...</option>
                                    {escolaridades.map((esc: any) => (
                                        <option key={esc.id} value={esc.id}>{esc.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-soft">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-5">
                                <Lock size={12} className="text-figueira" /> Segurança
                            </p>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                                <Input label="Nova Senha (Opcional)" name="nova_senha" type="password"
                                    autoComplete="new-password" placeholder="Deixe em branco para manter" />
                            </div>
                        </div>
                    </div>

                    {/* ABA: MORADA */}
                    <div className={abaAtiva === 'endereco' ? 'block animate-in fade-in slide-in-from-bottom-4' : 'hidden'}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-6 pb-4 border-b border-soft">
                            <MapPin size={12} className="text-figueira" /> Endereço Residencial
                        </p>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Input label="Morada (Rua/Avenida)" name="address_1" value={endereco.address_1}
                                onChange={(e: any) => setEndereco({ ...endereco, address_1: e.target.value })} className="md:col-span-2 lg:col-span-3" />
                            <Input label="Complemento" name="address_2" defaultValue={membro.address_2} className="md:col-span-2" />
                            <Input label="Número" name="address_number" defaultValue={membro.address_number} />
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Código Postal</label>
                                <input name="postal_code" value={endereco.postal_code} onChange={handleCodigoPostalChange} maxLength={8} placeholder="Ex: 4000-123"
                                    className={`w-full bg-bg border ${buscandoCP ? 'border-figueira/50 bg-figueira/5' : 'border-soft'} rounded-2xl p-4 text-[11px] font-bold text-fg focus:border-figueira outline-none transition-all shadow-sm`} />
                                {buscandoCP && <Loader2 size={14} className="animate-spin text-figueira absolute right-4 top-[38px]" />}
                            </div>
                            <Input label="Cidade" name="id_city" value={endereco.city} onChange={(e: any) => setEndereco({ ...endereco, city: e.target.value })} />
                            <Input label="Distrito / Estado" name="state" value={endereco.state} onChange={(e: any) => setEndereco({ ...endereco, state: e.target.value })} />
                            <Input label="País" name="country" value={endereco.country} onChange={(e: any) => setEndereco({ ...endereco, country: e.target.value })} />
                            <Input label="Freguesia / Bairro" name="neighborhood" value={endereco.neighborhood}
                                onChange={(e: any) => setEndereco({ ...endereco, neighborhood: e.target.value })} className="md:col-span-2" />
                        </div>
                    </div>

                    {/* ABA: FAMÍLIA */}
                    <div className={abaAtiva === 'familia' ? 'block animate-in fade-in slide-in-from-bottom-4' : 'hidden'}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-6 pb-4 border-b border-soft">
                            <Users2 size={12} className="text-figueira" /> Documentação e Relações
                        </p>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Select label="Estado Civil" name="marital_status" defaultValue={membro.marital_status}
                                options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União de Facto']} />
                            <Input label="Nacionalidade" name="nationality" defaultValue={membro.nationality} />
                            <Input label="NIF / CPF" name="tax_id" defaultValue={membro.tax_id} />
                            <Input label="Cartão de Cidadão / RG" name="id_card_number" defaultValue={membro.id_card_number} />
                            <Input label="Idioma" name="lang" defaultValue={membro.lang || 'pt'} />
                            <Input label="Nome do Cônjuge" name="spouse_name" defaultValue={membro.spouse_name} />
                            <Select label="Cônjuge é Cristão?" name="spouse_christian" defaultValue={membro.spouse_christian ? 'true' : 'false'}
                                options={[{ label: 'Sim', value: 'true' }, { label: 'Não', value: 'false' }]} />
                            <Input label="Data de Casamento" name="wedding_date" type="date" defaultValue={formatDate(membro.wedding_date)} />
                            <Select label="Tem Filhos?" name="has_children" defaultValue={membro.has_children ? 'true' : 'false'}
                                options={[{ label: 'Sim', value: 'true' }, { label: 'Não', value: 'false' }]} />
                            <Input label="Número de Filhos" name="children_number" type="number" min="0" defaultValue={membro.children_number || 0} />
                        </div>
                    </div>

                    {/* ABA: ECLESIÁSTICO */}
                    <div className={abaAtiva === 'eclesiastico' ? 'block animate-in fade-in slide-in-from-bottom-4' : 'hidden'}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2 mb-6 pb-4 border-b border-soft">
                            <Church size={12} className="text-figueira" /> Jornada Espiritual
                        </p>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Input label="Entrada na Igreja" name="entry_date" type="date" defaultValue={formatDate(membro.entry_date)} />
                            <Input label="Data de Batismo" name="baptism_date" type="date" defaultValue={formatDate(membro.baptism_date)} />
                            <Input label="Data de Conversão" name="conversion_date" type="date" defaultValue={formatDate(membro.conversion_date)} />
                            <div className="md:col-span-2 lg:col-span-3 space-y-2 mt-2">
                                <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Testemunho / Notas</label>
                                <textarea name="notes" rows={4} defaultValue={membro.notes}
                                    className="w-full bg-bg border border-soft rounded-2xl p-4 text-[11px] font-bold text-fg focus:border-figueira outline-none transition-all shadow-sm resize-none" />
                            </div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-soft">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-5">Histórico Prévio</p>
                            <div className="grid md:grid-cols-3 gap-5">
                                <Input label="Igreja Anterior" name="previous_church" defaultValue={membro.previous_church} />
                                <Input label="Cargo que exercia" name="church_role" defaultValue={membro.church_role} />
                                <Input label="Ministério" name="ministry" defaultValue={membro.ministry} />
                            </div>
                        </div>
                    </div>

                    {/* ABA: QUERO SERVIR */}
                    <div className={abaAtiva === 'servir' ? 'block animate-in fade-in slide-in-from-bottom-4' : 'hidden'}>
                        <ServirSection
                            membroId={membro.id}
                            departamentos={departamentos}
                            interessesExistentes={interessesExistentes}
                            ministeriosAtuais={membro.ministerios?.map((m: any) => m.departamento?.id).filter(Boolean) || []}
                        />
                    </div>

                    {/* ABA: ADMINISTRATIVO */}
                    <div className={abaAtiva === 'administrativo' ? 'block animate-in fade-in slide-in-from-bottom-4' : 'hidden'}>
                        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5 mb-6 flex items-start gap-4">
                            <AlertCircle size={18} className="text-orange-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-black uppercase italic tracking-tighter text-orange-700">Acesso Restrito</h4>
                                <p className="text-[10px] text-orange-600/80 font-bold uppercase tracking-widest mt-1">
                                    Estes dados são geridos pela administração. Apenas para consulta.
                                </p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-5 opacity-70 pointer-events-none">
                            <Input label="Conta Ativa?" value={membro.is_active ? 'Sim (Ativa)' : 'Não (Bloqueada)'} readOnly className="bg-soft/50 border-dashed" />
                            <Input label="Nível de Permissão" value={membro.role || 'USER'} readOnly className="bg-soft/50 border-dashed font-black text-figueira" />
                            <Input label="ID Loyverse (Cantina)" value={membro.loyverse_id || 'Não Integrado'} readOnly className="bg-soft/50 border-dashed" />
                        </div>
                    </div>

                </div>
            </form>
        </div>
    )
}

/* ── COMPONENTES DE SUPORTE ─────────────────────────────────────────────────── */
function Input({ label, className, value, onChange, readOnly, title, ...props }: any) {
    return (
        <div className="space-y-1.5" title={title}>
            <label className="text-[9px] font-black uppercase text-muted ml-4 tracking-widest flex items-center gap-1.5">
                {label} {readOnly && <Lock size={8} className="text-figueira opacity-50" />}
            </label>
            <input value={value} onChange={onChange} readOnly={readOnly} {...props}
                className={`w-full bg-bg border border-soft rounded-2xl p-4 text-[11px] font-bold text-fg focus:border-figueira outline-none transition-all shadow-sm ${readOnly ? 'focus:border-soft' : ''} ${className || ''}`} />
        </div>
    )
}

function ServirSection({ membroId, departamentos, interessesExistentes, ministeriosAtuais }: {
    membroId: number
    departamentos: { id: number; nome: string }[]
    interessesExistentes: { departamento_id: number; status: string }[]
    ministeriosAtuais: number[]
}) {
    const [selecionados, setSelecionados] = useState<number[]>([])
    const [mensagem, setMensagem] = useState('')
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

    // Departamentos onde o membro JA serve ou JA indicou interesse
    const interesseMap = new Map(interessesExistentes.map(i => [i.departamento_id, i.status]))
    const disponíveis = departamentos.filter(d => !ministeriosAtuais.includes(d.id))

    const toggle = (id: number) => {
        setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleSubmit = async () => {
        if (selecionados.length === 0) return
        setLoading(true)
        setFeedback(null)
        const res = await submeterInteresseDepartamento(membroId, selecionados, mensagem)
        setLoading(false)
        if (res.ok) {
            setFeedback({ type: 'success', msg: 'Interesse enviado! A lideranca sera notificada.' })
            setSelecionados([])
            setMensagem('')
        } else {
            setFeedback({ type: 'error', msg: res.error || 'Erro ao enviar.' })
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-figueira/5 border border-figueira/20 rounded-2xl p-5 flex items-start gap-4">
                <HeartHandshake size={18} className="text-figueira shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-black uppercase italic tracking-tighter text-fg">Quero Servir</h4>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                        Indica os departamentos onde gostarias de servir. A lideranca recebe o teu pedido.
                    </p>
                </div>
            </div>

            {feedback && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    {feedback.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {feedback.msg}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {disponíveis.map(d => {
                    const interesse = interesseMap.get(d.id)
                    const jaPediu = !!interesse
                    const isSelected = selecionados.includes(d.id)

                    return (
                        <button
                            key={d.id}
                            type="button"
                            disabled={jaPediu}
                            onClick={() => toggle(d.id)}
                            className={`p-3 rounded-xl border text-left transition-all text-[10px] font-black uppercase tracking-widest ${
                                jaPediu
                                    ? interesse === 'APROVADO'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 cursor-default'
                                        : interesse === 'REJEITADO'
                                        ? 'bg-red-500/10 border-red-500/20 text-red-400 cursor-default line-through'
                                        : 'bg-orange-500/10 border-orange-500/20 text-orange-600 cursor-default'
                                    : isSelected
                                    ? 'bg-figueira/10 border-figueira text-figueira'
                                    : 'bg-bg border-soft text-muted hover:border-figueira/30'
                            }`}
                        >
                            {d.nome}
                            {jaPediu && (
                                <span className="block text-[7px] mt-0.5 normal-case tracking-normal font-bold">
                                    {interesse === 'APROVADO' ? 'Aprovado' : interesse === 'REJEITADO' ? 'Rejeitado' : 'Pendente'}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {ministeriosAtuais.length > 0 && (
                <p className="text-[8px] text-muted font-bold uppercase tracking-widest">
                    Ja serves em {ministeriosAtuais.length} departamento{ministeriosAtuais.length !== 1 ? 's' : ''} (nao listados acima).
                </p>
            )}

            {selecionados.length > 0 && (
                <div className="space-y-3">
                    <textarea
                        value={mensagem}
                        onChange={e => setMensagem(e.target.value)}
                        placeholder="Mensagem opcional (ex: tenho experiencia em som, gosto de cozinhar...)"
                        rows={2}
                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-xs font-medium text-fg outline-none focus:border-figueira resize-none"
                    />
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-figueira text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-lg shadow-figueira/20 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Enviar Interesse ({selecionados.length} departamento{selecionados.length !== 1 ? 's' : ''})
                    </button>
                </div>
            )}
        </div>
    )
}

function Select({ label, options, defaultValue, ...props }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-muted ml-4 tracking-widest">{label}</label>
            <select {...props} defaultValue={defaultValue}
                className="w-full bg-bg border border-soft rounded-2xl p-4 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer shadow-sm">
                <option value="">Selecione...</option>
                {options.map((opt: any) => {
                    const val = typeof opt === 'string' ? opt : opt.value
                    const lbl = typeof opt === 'string' ? opt : opt.label
                    return <option key={val} value={val}>{lbl}</option>
                })}
            </select>
        </div>
    )
}