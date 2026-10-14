"use client"

// O meu perfil, no telemovel: uma so pagina com secoes que abrem e fecham (sem
// separadores), letra grande e "Guardar" sempre a vista. Todos os campos vao no
// formulario (a action grava todos), mesmo os das secoes fechadas.

import { useState, useEffect, useRef } from 'react'
import { atualizarDadosMembro, submeterInteresseDepartamento } from '@/actions/membro-actions'
import {
    User, MapPin, Users2, Save, Church, Check, ChevronDown, Camera, Loader2, Lock, Home,
    CheckCircle2, HeartHandshake, Send, Download, FileSignature,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    membro: any
    escolaridades?: any[]
    departamentos?: { id: number; nome: string }[]
    interessesExistentes?: { departamento_id: number; status: string }[]
}

const CAMPO = 'a-foco min-h-[52px] w-full rounded-[14px] border px-4 text-[17px]'
const ESTILO_CAMPO = { background: 'var(--a-bg)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

export default function MeuPerfilClient({ membro, escolaridades = [], departamentos = [], interessesExistentes = [] }: Props) {
    const toast = useToast()
    const [isPending, setIsPending] = useState(false)
    const [mostrarSucesso, setMostrarSucesso] = useState(false)

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
        const res: any = await atualizarDadosMembro(membro.id, formData)
        setIsPending(false)

        if (res.sucesso) {
            setMostrarSucesso(true)
            toast('Dados guardados.', 'sucesso')
        } else {
            // A senha recusada vem em `error`; o resto em `erro`
            toast(res.erro || res.error || 'Erro ao atualizar.', 'erro')
        }
    }

    const termoOk = (aceite: boolean, validade: any) => aceite && !(validade && new Date(validade) < new Date())
    const permanecerOk = termoOk(membro.permanecer_aceite, membro.permanecer_validade)
    const gdprOk = termoOk(membro.gdpr_aceite, membro.gdpr_validade)

    return (
        <div className="app-novo mx-auto max-w-2xl space-y-5 px-4 pb-40 pt-4 md:pb-24" style={{ background: 'transparent' }}>
            <form action={handleAction} className="space-y-4">
                <h1 className="text-[28px] font-bold leading-tight">O meu perfil</h1>

                {/* FOTO E NOME */}
                <div className="a-card flex items-center gap-4 p-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full" style={{ background: 'var(--a-bg)' }}>
                        {previewFoto ? (
                            <Image src={previewFoto} alt="A sua foto" fill sizes="80px" className="object-cover" />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center a-suave"><User size={36} aria-hidden /></div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                        <p className="truncate text-[19px] font-semibold">{membro.first_name} {membro.last_name}</p>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="a-botao a-botao-secundario !min-h-[44px]">
                            <Camera size={20} aria-hidden /> Mudar a foto
                        </button>
                        <input type="file" name="avatar" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                    </div>
                </div>

                {/* TERMOS E FAMILIA (so leitura) */}
                <div className="a-card a-divide">
                    <Linha Icone={Home} titulo={membro.familia ? `Família ${membro.familia.surname}` : 'Sem família associada'}
                        texto={membro.familia ? undefined : 'Para associar, fale com a secretaria.'} />
                    <Linha Icone={FileSignature} titulo="Termo Permanecer"
                        texto={permanecerOk
                            ? (membro.permanecer_validade ? `Aceite, válido até ${new Date(membro.permanecer_validade).toLocaleDateString('pt-PT')}` : 'Aceite')
                            : 'Por aceitar'}
                        ok={permanecerOk} href={permanecerOk ? undefined : '/membros/termos'} />
                    <Linha Icone={Lock} titulo="Proteção de dados (RGPD)"
                        texto={gdprOk ? 'Aceite' : 'Por aceitar'} ok={gdprOk} href={gdprOk ? undefined : '/membros/termos'} />
                </div>

                <Secao Icone={User} titulo="Dados pessoais" aberta>
                    <Campo label="Primeiro nome" name="first_name" defaultValue={membro.first_name} required autoComplete="given-name" />
                    <Campo label="Apelido" name="last_name" defaultValue={membro.last_name} required autoComplete="family-name" />
                    <Campo label="Email" name="email" type="email" defaultValue={membro.email} readOnly
                        ajuda="Para mudar o email, fale com a secretaria." />
                    <Campo label="Telemóvel" name="phone_1" type="tel" defaultValue={membro.phone_1} autoComplete="tel" />
                    <Campo label="Data de nascimento" name="birthdate" type="date" defaultValue={formatDate(membro.birthdate)} />
                    <Escolha label="Género" name="gender" defaultValue={membro.gender} options={['Masculino', 'Feminino']} />
                    <Campo label="Profissão" name="profession" defaultValue={membro.profession} />
                    <Escolha label="Escolaridade" name="escolaridade_id" defaultValue={membro?.escolaridade_id || ''}
                        options={escolaridades.map((e: any) => ({ label: e.nome, value: e.id }))} />
                    <Campo label="Nome do pai" name="father_name" defaultValue={membro.father_name} />
                    <Campo label="Nome da mãe" name="mother_name" defaultValue={membro.mother_name} />
                </Secao>

                <Secao Icone={MapPin} titulo="Morada">
                    <div className="relative">
                        <Campo label="Código postal" name="postal_code" value={endereco.postal_code} onChange={handleCodigoPostalChange}
                            maxLength={8} inputMode="numeric" ajuda="Ao escrever o código postal, a rua e a cidade preenchem-se sozinhas." />
                        {buscandoCP && <Loader2 size={20} className="absolute right-4 top-[46px] animate-spin" style={{ color: 'var(--a-destaque)' }} aria-hidden />}
                    </div>
                    <Campo label="Rua" name="address_1" value={endereco.address_1} onChange={(e: any) => setEndereco({ ...endereco, address_1: e.target.value })} />
                    <Campo label="Número" name="address_number" defaultValue={membro.address_number} />
                    <Campo label="Andar, porta…" name="address_2" defaultValue={membro.address_2} />
                    <Campo label="Freguesia / bairro" name="neighborhood" value={endereco.neighborhood} onChange={(e: any) => setEndereco({ ...endereco, neighborhood: e.target.value })} />
                    <Campo label="Cidade" name="id_city" value={endereco.city} onChange={(e: any) => setEndereco({ ...endereco, city: e.target.value })} />
                    <Campo label="Distrito" name="state" value={endereco.state} onChange={(e: any) => setEndereco({ ...endereco, state: e.target.value })} />
                    <Campo label="País" name="country" value={endereco.country} onChange={(e: any) => setEndereco({ ...endereco, country: e.target.value })} />
                </Secao>

                <Secao Icone={Users2} titulo="Família e documentos">
                    <Escolha label="Estado civil" name="marital_status" defaultValue={membro.marital_status}
                        options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União de Facto']} />
                    <Campo label="Nome do cônjuge" name="spouse_name" defaultValue={membro.spouse_name} />
                    <Escolha label="O cônjuge é cristão?" name="spouse_christian" defaultValue={membro.spouse_christian ? 'true' : 'false'}
                        options={[{ label: 'Sim', value: 'true' }, { label: 'Não', value: 'false' }]} />
                    <Campo label="Data de casamento" name="wedding_date" type="date" defaultValue={formatDate(membro.wedding_date)} />
                    <Escolha label="Tem filhos?" name="has_children" defaultValue={membro.has_children ? 'true' : 'false'}
                        options={[{ label: 'Sim', value: 'true' }, { label: 'Não', value: 'false' }]} />
                    <Campo label="Número de filhos" name="children_number" type="number" min="0" inputMode="numeric" defaultValue={membro.children_number || 0} />
                    <Campo label="Nacionalidade" name="nationality" defaultValue={membro.nationality} />
                    <Campo label="NIF / CPF" name="tax_id" defaultValue={membro.tax_id} inputMode="numeric" />
                    <Campo label="Cartão de Cidadão / RG" name="id_card_number" defaultValue={membro.id_card_number} />
                    <input type="hidden" name="lang" value={membro.lang || 'pt'} />
                </Secao>

                <Secao Icone={Church} titulo="Vida na igreja">
                    <Campo label="Entrada na igreja" name="entry_date" type="date" defaultValue={formatDate(membro.entry_date)} />
                    <Campo label="Data de batismo" name="baptism_date" type="date" defaultValue={formatDate(membro.baptism_date)} />
                    <Campo label="Data de conversão" name="conversion_date" type="date" defaultValue={formatDate(membro.conversion_date)} />
                    <div className="space-y-2">
                        <label htmlFor="perfil-notes" className="block text-[16px] font-semibold">Testemunho</label>
                        <textarea id="perfil-notes" name="notes" rows={4} defaultValue={membro.notes}
                            className={`${CAMPO} resize-none py-3`} style={ESTILO_CAMPO} />
                    </div>
                    <Campo label="Igreja anterior" name="previous_church" defaultValue={membro.previous_church} />
                    <Campo label="Cargo que tinha" name="church_role" defaultValue={membro.church_role} />
                    <Campo label="Ministério onde servia" name="ministry" defaultValue={membro.ministry} />
                </Secao>

                <Secao Icone={Lock} titulo="Palavra-passe">
                    <Campo label="Nova palavra-passe" name="nova_senha" type="password" autoComplete="new-password"
                        ajuda="Deixe em branco para manter a atual. Mínimo 10 caracteres: uma frase curta é fácil de lembrar e difícil de adivinhar." />
                </Secao>

                {/* GUARDAR: sempre a vista, por cima da barra de baixo */}
                <div className="fixed inset-x-0 z-40 px-4 bottom-[calc(72px+env(safe-area-inset-bottom))] md:bottom-4 md:left-auto md:right-6 md:w-80 md:px-0">
                    <button type="submit" disabled={isPending} className="a-botao a-botao-principal w-full !min-h-[56px] shadow-lg">
                        {isPending ? <Loader2 className="animate-spin" size={20} aria-hidden /> : mostrarSucesso ? <Check size={20} aria-hidden /> : <Save size={20} aria-hidden />}
                        {isPending ? 'A guardar…' : mostrarSucesso ? 'Guardado' : 'Guardar alterações'}
                    </button>
                </div>
            </form>

            {/* Fora do formulario: tem o seu proprio botao */}
            <Secao Icone={HeartHandshake} titulo="Quero servir">
                <ServirSection
                    membroId={membro.id}
                    departamentos={departamentos}
                    interessesExistentes={interessesExistentes}
                    ministeriosAtuais={membro.ministerios?.map((m: any) => m.departamento?.id).filter(Boolean) || []}
                />
            </Secao>

            <Secao Icone={Download} titulo="Os meus dados">
                <p className="text-[16px] a-suave">
                    Pode descarregar tudo o que a app guarda sobre si. Para corrigir ou apagar os seus dados, veja a{' '}
                    <Link href="/privacidade" className="underline" style={{ color: 'var(--a-texto)' }}>Política de privacidade</Link>.
                </p>
                <a href="/api/membros/meus-dados" className="a-botao a-botao-secundario w-full">
                    <Download size={20} aria-hidden /> Descarregar os meus dados
                </a>
            </Secao>
        </div>
    )
}

/* ── COMPONENTES DE SUPORTE ─────────────────────────────────────────────────── */

function Secao({ Icone, titulo, aberta, children }: { Icone: typeof User; titulo: string; aberta?: boolean; children: React.ReactNode }) {
    return (
        <details className="a-card group" open={aberta}>
            <summary className="a-foco flex min-h-[60px] cursor-pointer list-none items-center gap-3 px-4 py-3">
                <Icone size={22} className="shrink-0" style={{ color: 'var(--a-destaque)' }} aria-hidden />
                <span className="flex-1 text-[18px] font-semibold">{titulo}</span>
                <ChevronDown size={22} className="shrink-0 a-suave transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="space-y-4 border-t px-4 py-4" style={{ borderColor: 'var(--a-borda)' }}>{children}</div>
        </details>
    )
}

function Linha({ Icone, titulo, texto, ok, href }: { Icone: typeof User; titulo: string; texto?: string; ok?: boolean; href?: string }) {
    const corpo = (
        <>
            <Icone size={22} className="shrink-0" style={{ color: ok === false ? 'var(--a-erro)' : 'var(--a-destaque)' }} aria-hidden />
            <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{titulo}</span>
                {texto && <span className="block text-[15px] a-suave">{texto}</span>}
            </span>
            {ok && <CheckCircle2 size={22} className="shrink-0" style={{ color: 'var(--a-destaque)' }} aria-label="Em dia" />}
            {href && <span className="shrink-0 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>Ver</span>}
        </>
    )
    return href
        ? <Link href={href} className="a-foco flex min-h-[60px] items-center gap-3 px-4 py-3">{corpo}</Link>
        : <div className="flex min-h-[60px] items-center gap-3 px-4 py-3">{corpo}</div>
}

function Campo({ label, name, ajuda, readOnly, ...props }: any) {
    const id = `perfil-${name}`
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="flex items-center gap-1.5 text-[16px] font-semibold">
                {label} {readOnly && <Lock size={14} className="a-suave" aria-label="Não editável" />}
            </label>
            <input id={id} name={name} readOnly={readOnly} {...props}
                className={`${CAMPO} ${readOnly ? 'a-suave' : ''}`} style={ESTILO_CAMPO} />
            {ajuda && <p className="text-[15px] a-suave">{ajuda}</p>}
        </div>
    )
}

function Escolha({ label, name, options, defaultValue }: { label: string; name: string; options: any[]; defaultValue?: any }) {
    const id = `perfil-${name}`
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="block text-[16px] font-semibold">{label}</label>
            <select id={id} name={name} defaultValue={defaultValue ?? ''} className={`${CAMPO} cursor-pointer`} style={ESTILO_CAMPO}>
                <option value="">Escolher…</option>
                {options.map((opt: any) => {
                    const val = typeof opt === 'string' ? opt : opt.value
                    const lbl = typeof opt === 'string' ? opt : opt.label
                    return <option key={val} value={val}>{lbl}</option>
                })}
            </select>
        </div>
    )
}

function ServirSection({ membroId, departamentos, interessesExistentes, ministeriosAtuais }: {
    membroId: number
    departamentos: { id: number; nome: string }[]
    interessesExistentes: { departamento_id: number; status: string }[]
    ministeriosAtuais: number[]
}) {
    const toast = useToast()
    const [selecionados, setSelecionados] = useState<number[]>([])
    const [mensagem, setMensagem] = useState('')
    const [loading, setLoading] = useState(false)

    // Departamentos onde o membro JA serve ficam de fora; os ja pedidos mostram o estado
    const interesseMap = new Map(interessesExistentes.map(i => [i.departamento_id, i.status]))
    const disponiveis = departamentos.filter(d => !ministeriosAtuais.includes(d.id))

    const toggle = (id: number) => {
        setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleSubmit = async () => {
        if (selecionados.length === 0) return
        setLoading(true)
        const res = await submeterInteresseDepartamento(membroId, selecionados, mensagem)
        setLoading(false)
        if (res.ok) {
            toast('Pedido enviado! A liderança vai receber o seu interesse.', 'sucesso')
            setSelecionados([])
            setMensagem('')
        } else {
            toast(res.error || 'Erro ao enviar.', 'erro')
        }
    }

    const ESTADO: Record<string, string> = { APROVADO: 'Aprovado', REJEITADO: 'Não aprovado' }

    return (
        <div className="space-y-4">
            <p className="text-[16px] a-suave">Escolha onde gostaria de servir. A liderança recebe o seu pedido.</p>

            <ul className="space-y-2">
                {disponiveis.map(d => {
                    const interesse = interesseMap.get(d.id)
                    const marcado = selecionados.includes(d.id)
                    return (
                        <li key={d.id}>
                            <label className={`a-card flex min-h-[56px] items-center gap-3 px-4 py-2 ${interesse ? '' : 'cursor-pointer'}`}
                                style={marcado ? { borderColor: 'var(--a-destaque)', background: 'var(--a-destaque-suave)' } : undefined}>
                                <input type="checkbox" checked={marcado} disabled={!!interesse} onChange={() => toggle(d.id)}
                                    className="h-6 w-6 shrink-0" style={{ accentColor: 'var(--a-destaque)' }} />
                                <span className="flex-1 text-[17px]">{d.nome}</span>
                                {interesse && <span className="text-[15px] a-suave">{ESTADO[interesse] || 'Pedido enviado'}</span>}
                            </label>
                        </li>
                    )
                })}
            </ul>

            {ministeriosAtuais.length > 0 && (
                <p className="text-[15px] a-suave">
                    Já serve em {ministeriosAtuais.length} ministério{ministeriosAtuais.length !== 1 ? 's' : ''} (não aparece{ministeriosAtuais.length !== 1 ? 'm' : ''} acima).
                </p>
            )}

            {selecionados.length > 0 && (
                <div className="space-y-3">
                    <label htmlFor="servir-msg" className="block text-[16px] font-semibold">Mensagem <span className="font-normal a-suave">(se quiser)</span></label>
                    <textarea id="servir-msg" value={mensagem} onChange={e => setMensagem(e.target.value)} rows={2}
                        placeholder="Ex.: tenho experiência em som"
                        className={`${CAMPO} resize-none py-3`} style={ESTILO_CAMPO} />
                    <button type="button" onClick={handleSubmit} disabled={loading} className="a-botao a-botao-principal w-full">
                        {loading ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Send size={20} aria-hidden />}
                        Enviar pedido
                    </button>
                </div>
            )}
        </div>
    )
}
