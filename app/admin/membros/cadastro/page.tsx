"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { criarNovoMembroAction, buscarCargos } from "@/actions/admin-actions";
import Breadcrumb from '@/components/ui/Breadcrumb';
import {
    Camera, User, ShieldCheck, MapPin, Scale, Loader2,
    CheckCircle2, ChevronRight, ChevronLeft, Lock, AlertCircle
} from "lucide-react";
import Image from "next/image";

interface FormValues {
    first_name: string; last_name: string; email: string; password: string
    phone_1: string; birthdate: string; gender: string; marital_status: string
    profession: string; nationality: string; tax_id: string
    father_name: string; mother_name: string; escolaridade_id: string
    postal_code: string; address_1: string; address_number: string
    address_2: string; neighborhood: string; city: string; state: string; country: string
    conversion_date: string; baptism_date: string; admission_date: string
    church_role: string; status: string; role: string; loyverse_id: string; notes: string
    spouse_name: string; children_count: string
    gdpr_aceite: boolean; permanecer_aceite: boolean
}

const INITIAL_VALUES: FormValues = {
    first_name: '', last_name: '', email: '', password: '', phone_1: '',
    birthdate: '', gender: 'Masculino', marital_status: 'Solteiro(a)',
    profession: '', nationality: 'Brasileira', tax_id: '',
    father_name: '', mother_name: '', escolaridade_id: '',
    postal_code: '', address_1: '', address_number: '', address_2: '',
    neighborhood: '', city: '', state: '', country: 'Portugal',
    conversion_date: '', baptism_date: '',
    admission_date: new Date().toISOString().split('T')[0],
    church_role: 'Membro', status: 'ATIVO', role: 'USER',
    loyverse_id: '', notes: '',
    spouse_name: '', children_count: '0',
    gdpr_aceite: false, permanecer_aceite: false
}

const ABAS = [
    { id: 1, label: 'Dados Pessoais', icon: <User size={14} /> },
    { id: 2, label: 'Morada', icon: <MapPin size={14} /> },
    { id: 3, label: 'Eclesiastico', icon: <ShieldCheck size={14} /> },
    { id: 4, label: 'Familia e Legal', icon: <Scale size={14} /> },
]

export default function AdminCadastroMembroPage() {
    const router = useRouter()
    const [cargos, setCargos] = useState<any[]>([])
    const [abaAtiva, setAbaAtiva] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [erros, setErros] = useState<string[]>([])
    const [previewFoto, setPreviewFoto] = useState<string | null>(null)

    // FIX FOTO: guarda o File no estado React em vez de depender do fileInputRef
    // O input de ficheiro e desmontado ao mudar de aba, por isso o ref fica vazio no submit
    const [fotoFile, setFotoFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [temFilhos, setTemFilhos] = useState('false')
    const [buscandoCP, setBuscandoCP] = useState(false)
    const [formValues, setFormValues] = useState<FormValues>(INITIAL_VALUES)

    useEffect(() => { buscarCargos().then(setCargos) }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target
        const checked = (e.target as HTMLInputElement).checked
        setFormValues(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    }

    // FIX CODIGO POSTAL: chama a API interna /api/codigo-postal em vez da geoapi directamente
    // A geoapi nao permite chamadas do browser (CORS) e tem rate limit (erro 429)
    const handleCodigoPostalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        let valor = e.target.value.replace(/\D/g, '')
        if (valor.length > 4) valor = valor.substring(0, 4) + '-' + valor.substring(4, 7)
        setFormValues(prev => ({ ...prev, postal_code: valor }))

        if (valor.length !== 8) return

        console.log(`[CP] A pesquisar: ${valor}`)
        setBuscandoCP(true)

        try {
            const res = await fetch(`/api/codigo-postal?cp=${valor}`)
            console.log(`[CP] Status: ${res.status}`)

            if (!res.ok) {
                console.warn(`[CP] Nao encontrado (${res.status})`)
                return
            }

            const data = await res.json()
            console.log('[CP] Dados:', data)

            const info = Array.isArray(data) ? data[0] : data
            if (!info || info.erro) {
                console.warn('[CP] Resposta invalida:', info)
                return
            }

            setFormValues(prev => ({
                ...prev,
                address_1: info.ruas?.[0] || info.rua || prev.address_1,
                neighborhood: info.Freguesia || prev.neighborhood,
                city: info.Designacao || info['Municipio'] || info['Município'] || info.Localidade || prev.city,
                state: info.Distrito || prev.state,
                country: 'Portugal'
            }))

            console.log('[CP] Campos preenchidos!')
        } catch (err: any) {
            console.error('[CP] Erro:', err.message)
        } finally {
            setBuscandoCP(false)
        }
    }

    // FIX FOTO: guarda o File no estado imediatamente ao seleccionar
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        console.log(`[FOTO] Ficheiro seleccionado: ${file.name} (${file.size} bytes, ${file.type})`)
        setFotoFile(file)  // guarda no estado React

        const reader = new FileReader()
        reader.onloadend = () => setPreviewFoto(reader.result as string)
        reader.readAsDataURL(file)
    }

    const validarAba = (aba: number): string[] => {
        const errs: string[] = []
        if (aba === 1) {
            if (!formValues.first_name.trim()) errs.push('Primeiro nome obrigatorio')
            if (!formValues.last_name.trim()) errs.push('Sobrenome obrigatorio')
            if (!formValues.email.trim()) errs.push('E-mail obrigatorio')
            if (!formValues.password.trim()) errs.push('Senha obrigatoria')
        }
        return errs
    }

    const avancar = () => {
        const errsAba = validarAba(abaAtiva)
        if (errsAba.length > 0) { setErros(errsAba); return }
        setErros([])
        setAbaAtiva(a => Math.min(a + 1, 4))
    }

    const recuar = () => { setErros([]); setAbaAtiva(a => Math.max(a - 1, 1)) }

    async function handleSubmit() {
        const errsFinais = validarAba(1)
        if (errsFinais.length > 0) {
            setErros(errsFinais)
            setAbaAtiva(1)
            return
        }

        setIsSubmitting(true)
        setErros([])

        try {
            const formData = new FormData()

            // Campos de texto
            Object.entries(formValues).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.set(key, String(value))
                }
            })

            // Campo separado do state
            formData.set('has_children', temFilhos)

            // Foto — usa o estado fotoFile (nao o ref que pode estar desmontado)
            if (fotoFile) {
                console.log(`[SUBMIT] A anexar foto: ${fotoFile.name} (${fotoFile.size} bytes)`)
                formData.set('avatar', fotoFile)
            } else {
                console.log('[SUBMIT] Sem foto')
            }

            // USA FETCH PARA API ROUTE em vez do Server Action
            // Server Actions nao transmitem File objects quando chamados manualmente com formData
            const response = await fetch('/api/admin/criar-membro', {
                method: 'POST',
                body: formData,
                // NAO definir Content-Type — o browser define automaticamente com o boundary correcto
            })
            console.log('[FETCH] status:', response.status)
            const result = await response.json()
            console.log('[SUBMIT] Resposta:', result)

            if (!response.ok || result.error) {
                setErros([result.error || 'Erro ao criar membro.'])
                setIsSubmitting(false)
            } else {
                router.push('/admin/membros?sucesso=true')
            }
        } catch (err: any) {
            console.error('[SUBMIT] Erro:', err.message)
            setErros(['Erro ao comunicar com o servidor.'])
            setIsSubmitting(false)
        }
    }

    const pctConcluido = Math.round(
        (Object.values(formValues).filter(v => v !== '' && v !== false && v !== '0').length /
            Object.keys(formValues).length) * 100
    )

    return (
        <main className="max-w-6xl mx-auto space-y-8 py-10 px-4 sm:px-6 lg:px-8 animate-in fade-in pb-32">

            <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-soft pb-6 gap-6">
                <div className="space-y-2">
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                        <ShieldCheck size={14} /> Modulo Administrativo
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Novo <span className="text-muted/20">Membro.</span>
                    </h1>
                </div>
                <div className="w-full md:w-64 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted">Perfil preenchido</span>
                        <span className="text-[9px] font-black text-figueira">{pctConcluido}%</span>
                    </div>
                    <div className="h-1.5 bg-soft rounded-full overflow-hidden">
                        <div className="h-full bg-figueira rounded-full transition-all duration-500" style={{ width: `${pctConcluido}%` }} />
                    </div>
                </div>
            </header>

            {erros.length > 0 && (
                <div className="bg-red-500/8 border border-red-500/20 rounded-2xl px-5 py-4 flex items-start gap-3 animate-in slide-in-from-top-2 duration-200">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div>{erros.map((e, i) => <p key={i} className="text-[10px] font-black uppercase tracking-widest text-red-600">{e}</p>)}</div>
                </div>
            )}

            <nav className="flex flex-wrap gap-2 bg-bg2 p-1.5 rounded-2xl border border-soft">
                {ABAS.map(tab => (
                    <button key={tab.id} type="button" onClick={() => { setErros([]); setAbaAtiva(tab.id) }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all
                            ${abaAtiva === tab.id ? 'bg-fg text-bg shadow-lg' : 'text-muted hover:bg-soft hover:text-fg'}`}>
                        {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </nav>

            <div className="bg-bg2 border border-soft rounded-[2.5rem] p-6 md:p-10 shadow-sm min-h-[480px]">

                {/* ABA 1 */}
                {abaAtiva === 1 && (
                    <div className="space-y-8 animate-in fade-in duration-200">
                        <div className="flex items-center gap-6 pb-6 border-b border-soft/50">
                            <div className="relative shrink-0">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-soft">
                                    {previewFoto
                                        ? <Image src={previewFoto} alt="Preview" fill sizes="128px" className="object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-muted"><User size={32} /></div>
                                    }
                                </div>
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 bg-fg text-bg p-2 rounded-xl shadow-lg hover:bg-figueira transition-all">
                                    <Camera size={14} />
                                </button>
                                {/* input SEMPRE presente — o File e guardado no estado fotoFile */}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase italic text-fg">Fotografia de Perfil</p>
                                <p className="text-[9px] text-muted font-bold uppercase tracking-widest mt-1">
                                    {fotoFile ? `${fotoFile.name} selecionada` : 'Clica no icone para carregar'}
                                </p>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Campo label="Primeiro Nome *" name="first_name" value={formValues.first_name} onChange={handleInputChange} />
                            <Campo label="Sobrenome *" name="last_name" value={formValues.last_name} onChange={handleInputChange} />
                            <Campo label="E-mail *" name="email" type="email" value={formValues.email} onChange={handleInputChange} />
                            <Campo label="Senha *" name="password" type="password" value={formValues.password} onChange={handleInputChange} placeholder="Minimo 6 caracteres" />
                            <Campo label="Telemovel" name="phone_1" value={formValues.phone_1} onChange={handleInputChange} />
                            <Campo label="Data de Nascimento" name="birthdate" type="date" value={formValues.birthdate} onChange={handleInputChange} />
                            <SelecionarOpcoes label="Genero" name="gender" value={formValues.gender} onChange={handleInputChange} opcoes={['Masculino', 'Feminino']} />
                            <SelecionarOpcoes label="Estado Civil" name="marital_status" value={formValues.marital_status} onChange={handleInputChange} opcoes={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viuvo(a)', 'Uniao de Facto']} />
                            <Campo label="NIF / Contribuinte" name="tax_id" value={formValues.tax_id} onChange={handleInputChange} />
                            <Campo label="Profissao" name="profession" value={formValues.profession} onChange={handleInputChange} />
                            <Campo label="Nacionalidade" name="nationality" value={formValues.nationality} onChange={handleInputChange} />
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">Escolaridade</label>
                                <select name="escolaridade_id" value={formValues.escolaridade_id} onChange={handleInputChange}
                                    className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none">
                                    <option value="">Selecione...</option>
                                    <option value="1">Ensino Basico</option>
                                    <option value="2">Ensino Secundario</option>
                                    <option value="3">Licenciatura</option>
                                    <option value="4">Mestrado / Doutoramento</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 2 */}
                {abaAtiva === 2 && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2 pb-4 border-b border-soft">
                            <MapPin size={11} className="text-figueira" /> Morada Residencial
                        </p>
                        <div className="grid md:grid-cols-4 gap-5">
                            <div className="relative">
                                <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest block mb-1.5">Codigo Postal (PT)</label>
                                <input name="postal_code" value={formValues.postal_code} onChange={handleCodigoPostalChange}
                                    placeholder="0000-000" maxLength={8}
                                    className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none" />
                                {buscandoCP && <Loader2 size={13} className="animate-spin text-figueira absolute right-4 top-9" />}
                            </div>
                            <Campo label="Pais" name="country" value={formValues.country} onChange={handleInputChange} className="md:col-span-3" />
                            <Campo label="Morada / Rua" name="address_1" value={formValues.address_1} onChange={handleInputChange} className="md:col-span-2" />
                            <Campo label="No / Porta" name="address_number" value={formValues.address_number} onChange={handleInputChange} />
                            <Campo label="Lote / Apt." name="address_2" value={formValues.address_2} onChange={handleInputChange} />
                            <Campo label="Freguesia / Bairro" name="neighborhood" value={formValues.neighborhood} onChange={handleInputChange} />
                            <Campo label="Cidade / Municipio" name="city" value={formValues.city} onChange={handleInputChange} />
                            <Campo label="Distrito" name="state" value={formValues.state} onChange={handleInputChange} />
                        </div>
                    </div>
                )}

                {/* ABA 3 */}
                {abaAtiva === 3 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="bg-figueira/5 border border-figueira/15 rounded-2xl p-5 space-y-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-figueira flex items-center gap-2">
                                <Lock size={11} /> Nivel de Acesso
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {['USER', 'LEADER', 'FINANCE', 'ADMIN'].map(r => (
                                    <button key={r} type="button" onClick={() => setFormValues(prev => ({ ...prev, role: r }))}
                                        className={`py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all
                                            ${formValues.role === r ? 'bg-fg text-bg border-fg' : 'bg-bg text-muted border-soft hover:border-figueira/30'}`}>
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid md:grid-cols-3 gap-5">
                            <Campo label="Data de Admissao" name="admission_date" type="date" value={formValues.admission_date} onChange={handleInputChange} />
                            <Campo label="Data de Batismo" name="baptism_date" type="date" value={formValues.baptism_date} onChange={handleInputChange} />
                            <Campo label="Data de Conversao" name="conversion_date" type="date" value={formValues.conversion_date} onChange={handleInputChange} />
                            <SelecionarOpcoes label="Cargo" name="church_role" value={formValues.church_role} onChange={handleInputChange}
                                opcoes={cargos.length > 0 ? cargos.map((c: any) => c.nome) : ['Membro', 'Diacono', 'Pastor', 'Evangelista']} />
                            <SelecionarOpcoes label="Status" name="status" value={formValues.status} onChange={handleInputChange}
                                opcoes={['ATIVO', 'INATIVO', 'VISITANTE', 'PENDENTE']} />
                            <Campo label="ID Loyverse" name="loyverse_id" value={formValues.loyverse_id} onChange={handleInputChange} placeholder="UUID do cliente" />
                            <div className="md:col-span-3 space-y-1.5">
                                <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">Notas Pastorais</label>
                                <textarea name="notes" rows={4} value={formValues.notes} onChange={handleInputChange}
                                    className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none resize-none"
                                    placeholder="Testemunho, contexto pastoral, observacoes..." />
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 4 */}
                {abaAtiva === 4 && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        <div className="grid md:grid-cols-2 gap-5">
                            <Campo label="Nome do Pai" name="father_name" value={formValues.father_name} onChange={handleInputChange} />
                            <Campo label="Nome da Mae" name="mother_name" value={formValues.mother_name} onChange={handleInputChange} />
                            <Campo label="Nome do Conjuge" name="spouse_name" value={formValues.spouse_name} onChange={handleInputChange} />
                            <div className="grid grid-cols-2 gap-4">
                                <SelecionarOpcoes label="Tem Filhos?" name="has_children" value={temFilhos}
                                    onChange={(e: any) => setTemFilhos(e.target.value)}
                                    opcoes={[{ label: 'Sim', value: 'true' }, { label: 'Nao', value: 'false' }]} />
                                {temFilhos === 'true' && (
                                    <Campo label="Quantos?" name="children_count" type="number" value={formValues.children_count} onChange={handleInputChange} />
                                )}
                            </div>
                        </div>

                        <div className="border-t border-soft pt-6 space-y-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                <Scale size={11} className="text-figueira" /> Termos Legais
                            </p>
                            <div className="bg-bg border border-soft rounded-2xl p-5 space-y-4">
                                <label className="flex items-start gap-4 cursor-pointer group">
                                    <input type="checkbox" name="gdpr_aceite" checked={formValues.gdpr_aceite} onChange={handleInputChange}
                                        className="mt-1 w-5 h-5 accent-figueira cursor-pointer shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-fg group-hover:text-figueira transition-colors">Autorizacao GDPR</p>
                                        <p className="text-[9px] text-muted font-medium mt-0.5">Autorizo o tratamento de dados pessoais para fins pastorais.</p>
                                    </div>
                                </label>
                                <label className="flex items-start gap-4 cursor-pointer group">
                                    <input type="checkbox" name="permanecer_aceite" checked={formValues.permanecer_aceite} onChange={handleInputChange}
                                        className="mt-1 w-5 h-5 accent-figueira cursor-pointer shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-fg group-hover:text-figueira transition-colors">Termo Permanecer</p>
                                        <p className="text-[9px] text-muted font-medium mt-0.5">Concordo com a visao e regras de conduta da ADMVC.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* RESUMO */}
                        <div className="bg-figueira/5 border border-figueira/20 rounded-2xl p-5 space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-figueira flex items-center gap-2">
                                <CheckCircle2 size={11} /> Resumo do Registo
                            </p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                {[
                                    ['Nome', `${formValues.first_name} ${formValues.last_name}`],
                                    ['E-mail', formValues.email],
                                    ['Telefone', formValues.phone_1 || '-'],
                                    ['Role', formValues.role],
                                    ['Status', formValues.status],
                                    ['Foto', fotoFile ? fotoFile.name : 'Sem foto'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex gap-2">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted min-w-[48px]">{label}</span>
                                        <span className="text-[8px] font-bold text-fg truncate">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* NAVEGACAO */}
            <div className="flex justify-between items-center bg-bg2 p-4 rounded-2xl border border-soft shadow-lg sticky bottom-4 z-10">
                <button type="button" onClick={recuar} disabled={abaAtiva === 1}
                    className={`px-6 py-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted hover:text-fg transition-all rounded-xl hover:bg-soft
                        ${abaAtiva === 1 ? 'opacity-0 pointer-events-none' : ''}`}>
                    <ChevronLeft size={14} /> Anterior
                </button>

                <div className="flex items-center gap-2">
                    {ABAS.map(tab => (
                        <div key={tab.id} className={`rounded-full transition-all duration-300
                            ${tab.id === abaAtiva ? 'w-6 h-2 bg-figueira' : tab.id < abaAtiva ? 'w-2 h-2 bg-emerald-500' : 'w-2 h-2 bg-soft'}`} />
                    ))}
                </div>

                {abaAtiva < 4 ? (
                    <button type="button" onClick={avancar}
                        className="px-6 py-3 bg-fg text-bg rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-figueira transition-all flex items-center gap-2 active:scale-95">
                        Proximo <ChevronRight size={14} />
                    </button>
                ) : (
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                        className={`px-8 py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 active:scale-95
                            ${isSubmitting ? 'bg-soft text-muted cursor-wait' : 'bg-figueira text-white hover:bg-figueira/90'}`}>
                        {isSubmitting
                            ? <><Loader2 className="animate-spin" size={15} /> A processar...</>
                            : <><CheckCircle2 size={15} /> Finalizar Cadastro</>
                        }
                    </button>
                )}
            </div>
        </main>
    )
}

function Campo({ label, className = '', ...props }: any) {
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">{label}</label>
            <input {...props} className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none transition-all" />
        </div>
    )
}

function SelecionarOpcoes({ label, opcoes, ...props }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-muted ml-1 tracking-widest">{label}</label>
            <select {...props} className="w-full bg-bg border border-soft rounded-2xl px-4 py-3 text-[11px] font-bold text-fg focus:border-figueira outline-none appearance-none cursor-pointer">
                <option value="">Selecione...</option>
                {opcoes.map((opt: any) => {
                    const v = typeof opt === 'string' ? opt : opt.value
                    const l = typeof opt === 'string' ? opt : opt.label
                    return <option key={v} value={v}>{l}</option>
                })}
            </select>
        </div>
    )
}