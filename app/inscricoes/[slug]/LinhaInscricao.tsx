'use client'

// Uma inscrição na lista da organização: confirmar, pago, cancelar e WhatsApp.
import { useState } from 'react'
import { alterarInscricaoAction, type AcaoInscricao } from '@/actions/inscricao-actions'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import { Check, Euro, MessageCircle, X, Undo2, Loader2 } from 'lucide-react'

interface Props {
    inscricao: {
        id: number; nome: string; telefone: string; email: string | null; codigo: string; estado: string
        pago: boolean; quer_contacto: boolean; criado_em: string; membro: string | null; faltam: string[]
    }
    cobra: boolean
    cor: string
    whatsapp: string
}

export default function LinhaInscricao({ inscricao: i, cobra, cor, whatsapp }: Props) {
    const toast = useToast()
    const confirmar = useConfirm()
    const [aGuardar, setAGuardar] = useState<AcaoInscricao | null>(null)

    async function fazer(acao: AcaoInscricao) {
        if (acao === 'CANCELAR' && !(await confirmar({ mensagem: `Cancelar a inscrição de ${i.nome}?`, tipo: 'perigo' }))) return
        setAGuardar(acao)
        const r = await alterarInscricaoAction(i.id, acao)
        setAGuardar(null)
        if (!r.ok) toast(r.error || 'Não foi possível guardar.', 'erro')
    }

    const botao = 'flex items-center gap-1.5 rounded-xl px-3 min-h-[40px] text-[14px] font-semibold border disabled:opacity-50'
    const icone = (acao: AcaoInscricao, I: typeof Check) => aGuardar === acao ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <I size={15} aria-hidden />
    const cancelada = i.estado === 'CANCELADA'

    return (
        <li className={`a-card p-4 space-y-2 ${cancelada ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-[17px] font-semibold">{i.nome}</p>
                    <p className="text-[14px] a-suave">
                        {i.membro ? `Membro${i.membro.toLowerCase() !== i.nome.toLowerCase() ? ` · ficha: ${i.membro}` : ''}` : 'Visitante'}
                        {i.quer_contacto && ' · quer ser contactada'}
                    </p>
                    <p className="text-[14px] a-suave">
                        <a href={`tel:${i.telefone}`} className="underline">{i.telefone}</a>
                        {i.email && <> · {i.email}</>}
                    </p>
                </div>
                <div className="text-right">
                    <p className="font-mono text-[16px] font-bold tracking-widest" style={{ color: cor }}>{i.codigo}</p>
                    <p className="text-[13px] a-suave">{new Date(i.criado_em).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 text-[13px] font-semibold">
                <span className={`rounded-full px-2 py-0.5 ${i.estado === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-800' : i.estado === 'PENDENTE' ? 'bg-amber-100 text-amber-900' : 'bg-gray-200 text-gray-700'}`}>
                    {i.estado === 'CONFIRMADA' ? 'Confirmada' : i.estado === 'PENDENTE' ? 'Por confirmar' : 'Cancelada'}
                </span>
                {cobra && <span className={`rounded-full px-2 py-0.5 ${i.pago ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{i.pago ? 'Pago' : 'Por pagar'}</span>}
                {i.faltam.map(t => <span key={t} className="rounded-full px-2 py-0.5 bg-red-100 text-red-800">Sem: {t}</span>)}
            </div>

            <div className="flex flex-wrap gap-1.5">
                {cancelada ? (
                    <button type="button" onClick={() => fazer('PENDENTE')} disabled={!!aGuardar} className={botao} style={{ borderColor: 'var(--a-borda)' }}>
                        {icone('PENDENTE', Undo2)} Reativar
                    </button>
                ) : (
                    <>
                        {i.estado === 'PENDENTE'
                            ? <button type="button" onClick={() => fazer('CONFIRMAR')} disabled={!!aGuardar} className={`${botao} text-white`} style={{ background: cor, borderColor: cor }}>{icone('CONFIRMAR', Check)} Confirmar</button>
                            : <button type="button" onClick={() => fazer('PENDENTE')} disabled={!!aGuardar} className={botao} style={{ borderColor: 'var(--a-borda)' }}>{icone('PENDENTE', Undo2)} Desconfirmar</button>}
                        {cobra && (i.pago
                            ? <button type="button" onClick={() => fazer('NAO_PAGO')} disabled={!!aGuardar} className={botao} style={{ borderColor: 'var(--a-borda)' }}>{icone('NAO_PAGO', Undo2)} Afinal não pagou</button>
                            : <button type="button" onClick={() => fazer('PAGO')} disabled={!!aGuardar} className={botao} style={{ borderColor: 'var(--a-borda)' }}>{icone('PAGO', Euro)} Pago</button>)}
                        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${botao} text-emerald-700`} style={{ borderColor: 'var(--a-borda)' }}>
                            <MessageCircle size={15} aria-hidden /> WhatsApp
                        </a>
                        <button type="button" onClick={() => fazer('CANCELAR')} disabled={!!aGuardar} className={`${botao} text-red-700`} style={{ borderColor: 'var(--a-borda)' }}>
                            {icone('CANCELAR', X)} Cancelar
                        </button>
                    </>
                )}
            </div>
        </li>
    )
}
