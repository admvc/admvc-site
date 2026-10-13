'use client'

import { useState } from 'react'
import { useToast } from '@/components/ui/ConfirmDialog'
import { ClipboardEdit, X, Loader2, Save } from 'lucide-react'
import { registarAcompanhamento } from '@/actions/visitante-actions'
import { anonimizarVisitanteAction } from '@/actions/rgpd-actions'

interface Visitante {
    id: number
    nome: string
    telefone: string
    status: string
    quantidade_visitas: number
    pedido_oracao?: string | null
    acompanhamentos?: Array<{
        id: number
        tipo_contacto: string
        observacoes: string
        data_contacto: Date
        membro?: { first_name: string; last_name: string } | null
    }>
}

export default function ModalAcompanhamento({ visitante }: { visitante: Visitante }) {
    const toast = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [credenciais, setCredenciais] = useState<{ email: string | null; emailEnviado: boolean } | null>(null)

    async function anonimizar() {
        if (!window.confirm(`Anonimizar "${visitante.nome}"? Apaga nome, telefone, email, pedido de oração e notas. Não se pode desfazer.`)) return;
        setLoading(true);
        const res = await anonimizarVisitanteAction(visitante.id);
        setLoading(false);
        if (res.error) toast(res.error, 'erro');
        else {
            toast('Visitante anonimizado.', 'sucesso');
            setIsOpen(false);
        }
    }

    async function handleAction(formData: FormData) {
        setLoading(true);
        const res = await registarAcompanhamento(formData);
        setLoading(false);

        if (res.error) {
            toast(res.error, 'erro');
        } else if (res.credenciais) {
            setCredenciais(res.credenciais);
        } else {
            setIsOpen(false);
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex-1 bg-fg text-bg text-center py-3 sm:py-2.5 rounded-xl text-[13px] font-bold uppercase tracking-wide hover:bg-figueira hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 min-h-[44px] sm:min-h-0"
            >
                <ClipboardEdit size={12} /> Registar
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-bg2 w-full sm:max-w-xl border border-soft p-6 sm:p-8 rounded-t-[2rem] sm:rounded-[3rem] shadow-2xl relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 text-left max-h-[90vh] overflow-y-auto">

                        <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 p-2 bg-soft text-muted rounded-full hover:bg-red-500 hover:text-white transition-colors">
                            <X size={16} />
                        </button>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-fg flex items-center gap-2">
                                <ClipboardEdit size={20} className="text-figueira" /> Relatório de Contacto
                            </h2>
                            <p className="text-[14px] font-bold text-muted uppercase tracking-wide mt-1">
                                Visitante: <span className="text-fg">{visitante.nome}</span>
                            </p>
                        </div>

                        <form action={handleAction} className="space-y-4">
                            <input type="hidden" name="visitante_id" value={visitante.id} />

                            {/* MUDANÇA AQUI: Grid de 3 colunas para acomodar o novo campo */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[13px] font-bold uppercase text-muted tracking-wide ml-2">Canal</label>
                                    <select name="tipo_contacto" required className="w-full bg-bg border border-soft rounded-2xl p-4 text-xs font-bold text-fg outline-none focus:border-figueira">
                                        <option value="WHATSAPP">WhatsApp</option>
                                        <option value="LIGACAO">Chamada</option>
                                        <option value="PRESENCIAL">Presencial</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[13px] font-bold uppercase text-muted tracking-wide ml-2">Novo Status</label>
                                    <select name="status" required
                                        defaultValue={
                                            visitante.status === 'NOVO' ? 'EM_CONTACTO'
                                            : visitante.status === 'EM_CONTACTO' ? 'REUNIAO_PASTOR'
                                            : visitante.status === 'REUNIAO_PASTOR' ? 'CONSOLIDADO'
                                            : visitante.status
                                        }
                                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-xs font-bold text-fg outline-none focus:border-figueira"
                                    >
                                        <option value="EM_CONTACTO">Em Acompanhamento</option>
                                        <option value="REUNIAO_PASTOR">Reuniao com Pastor</option>
                                        <option value="CONSOLIDADO">Consolidado (Novo Membro)</option>
                                        <option value="NAO_RETORNOU">Nao Retornou</option>
                                        <option value="OUTRA_IGREJA">Foi para Outra Igreja</option>
                                        <option value="DESISTIU">Desistiu</option>
                                    </select>
                                </div>
                                {/* NOVO CAMPO: Quantidade de Visitas */}
                                <div className="space-y-1">
                                    <label className="text-[13px] font-bold uppercase text-muted tracking-wide ml-2">Nº de Visitas</label>
                                    <input
                                        type="number"
                                        name="quantidade_visitas"
                                        min="1"
                                        defaultValue={visitante.quantidade_visitas || 1}
                                        required
                                        className="w-full bg-bg border border-soft rounded-2xl p-4 text-xs font-bold text-fg outline-none focus:border-figueira"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[13px] font-bold uppercase text-muted tracking-wide ml-2">Resumo da Conversa</label>
                                <textarea name="observacoes" rows={4} required placeholder="Como correu? O que ele achou da igreja?" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm font-medium text-fg outline-none focus:border-figueira resize-none"></textarea>
                            </div>

                            {credenciais && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 space-y-2">
                                    <p className="text-[14px] font-bold uppercase tracking-wide text-emerald-600">Membro Criado!</p>
                                    {credenciais.email ? (
                                        <p className="text-xs text-fg font-bold">
                                            {credenciais.emailEnviado
                                                ? <>Enviámos para <span className="font-mono bg-bg px-2 py-1 rounded">{credenciais.email}</span> um link para definir a palavra-passe.</>
                                                : <>Não foi possível enviar o email para {credenciais.email}. Um administrador pode reenviar o link na ficha do membro.</>}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-fg font-bold">O visitante não tem email. Para ter acesso à app, um administrador acrescenta o email na ficha do membro e envia o link.</p>
                                    )}
                                    <button type="button" onClick={() => { setCredenciais(null); setIsOpen(false) }}
                                        className="w-full mt-2 bg-fg text-bg py-3 rounded-xl text-[13px] font-bold uppercase tracking-wide hover:bg-figueira transition-all">
                                        Fechar
                                    </button>
                                </div>
                            )}

                            {!credenciais && (
                                <button disabled={loading} className="w-full flex items-center justify-center gap-2 bg-figueira text-white py-4 rounded-2xl font-bold text-[14px] uppercase tracking-wide hover:brightness-110 transition-all shadow-lg shadow-figueira/20 disabled:opacity-50 mt-2">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    {loading ? 'A Guardar...' : 'Salvar Histórico'}
                                </button>
                            )}

                            {!credenciais && (
                                <button type="button" disabled={loading} onClick={anonimizar}
                                    className="w-full text-center text-[14px] font-bold text-red-500 underline disabled:opacity-50">
                                    Anonimizar este visitante (a pedido dele — RGPD)
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}