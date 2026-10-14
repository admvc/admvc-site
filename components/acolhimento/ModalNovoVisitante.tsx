'use client'

// "Registar visitante": para quem chega ao culto sem telemóvel ou sem o QR.
// Se o telefone já existe, o servidor soma a visita em vez de duplicar.
import { useState } from 'react'
import { useToast } from '@/components/ui/ConfirmDialog'
import { registarVisitanteAction } from '@/actions/visitante-actions'
import { UserPlus, X, Loader2, Save } from 'lucide-react'

const rotulo = 'text-[13px] font-bold uppercase text-muted tracking-wide ml-2'
const campo = 'w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-medium text-fg outline-none focus:border-figueira'

interface Props {
    congregacoes: Array<{ id: number; nome: string }>
    /** A congregação de quem regista (escolhida no início da sessão) */
    padrao?: number | null
}

export default function ModalNovoVisitante({ congregacoes, padrao }: Props) {
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleAction(formData: FormData) {
        setLoading(true)
        try {
            const res = await registarVisitanteAction(formData)
            if ('error' in res && res.error) {
                toast(res.error, 'erro')
                return
            }
            if ('novo' in res) {
                if (res.novo) toast(`${res.nome} registado.`, 'sucesso')
                else if (res.repetido) toast(`${res.nome} já tinha sido registado agora mesmo.`, 'info')
                else toast(`${res.nome} já estava registado: somámos a visita (${res.visitas}.ª)${res.reativado ? ' e voltou aos novos registos' : ''}.`, 'sucesso')
            }
            setIsOpen(false)
        } catch {
            toast('Não foi possível registar. Tente outra vez.', 'erro')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-figueira text-white px-3 py-2 rounded-xl text-[13px] md:text-[14px] font-bold uppercase tracking-wide hover:brightness-110 transition-all shadow-sm">
                <UserPlus size={13} /> <span className="hidden sm:inline">Registar visitante</span>
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 w-full sm:max-w-xl border border-soft p-6 sm:p-8 rounded-t-[2rem] sm:rounded-[3rem] shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsOpen(false)} aria-label="Fechar"
                            className="absolute top-6 right-6 p-2 bg-soft text-muted rounded-full hover:bg-red-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>

                        <div className="mb-6 pr-10">
                            <h2 className="text-2xl font-bold text-fg flex items-center gap-2">
                                <UserPlus size={20} className="text-figueira" /> Registar visitante
                            </h2>
                            <p className="text-[14px] text-muted mt-1">
                                Se o telefone já estiver registado, somamos a visita a essa pessoa.
                            </p>
                        </div>

                        <form action={handleAction} className="space-y-4">
                            <div className="space-y-1">
                                <label htmlFor="nv-nome" className={rotulo}>Nome</label>
                                <input id="nv-nome" name="nome" required autoComplete="off" className={campo} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label htmlFor="nv-telefone" className={rotulo}>Telefone</label>
                                    <input id="nv-telefone" name="telefone" type="tel" required autoComplete="off" placeholder="912 345 678" className={campo} />
                                </div>
                                <div className="space-y-1">
                                    <label htmlFor="nv-email" className={rotulo}>Email (opcional)</label>
                                    <input id="nv-email" name="email" type="email" autoComplete="off" className={campo} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label htmlFor="nv-origem" className={rotulo}>Como chegou</label>
                                    <select id="nv-origem" name="origem" defaultValue="PRESENCIAL" className={campo}>
                                        <option value="PRESENCIAL">Veio ao culto</option>
                                        <option value="INDICACAO">Convidado por alguém</option>
                                        <option value="REDES_SOCIAIS">Redes sociais</option>
                                    </select>
                                </div>
                                {congregacoes.length > 0 && (
                                    <div className="space-y-1">
                                        <label htmlFor="nv-congregacao" className={rotulo}>Congregação</label>
                                        <select id="nv-congregacao" name="congregacao_id" className={campo}
                                            defaultValue={padrao && congregacoes.some(c => c.id === padrao) ? String(padrao) : ''}>
                                            <option value="">Não sabemos</option>
                                            {congregacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label htmlFor="nv-pedido" className={rotulo}>Pedido de oração (opcional)</label>
                                <textarea id="nv-pedido" name="pedido_oracao" rows={3} className={`${campo} resize-none`} />
                            </div>
                            <label className="flex items-start gap-3 bg-bg border border-soft rounded-2xl p-4 cursor-pointer">
                                <input type="checkbox" name="consentimento" required className="mt-0.5 w-4 h-4 accent-figueira shrink-0" />
                                <span className="text-sm text-fg">
                                    A pessoa autorizou que a igreja guarde estes dados para a contactar.
                                </span>
                            </label>

                            <button disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-figueira text-white py-4 rounded-2xl font-bold text-[14px] uppercase tracking-wide hover:brightness-110 transition-all shadow-lg shadow-figueira/20 disabled:opacity-50">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {loading ? 'A registar...' : 'Registar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
