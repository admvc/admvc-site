"use client"

import { useState } from 'react'
import { CheckCircle2, Loader2, PenLine, Check } from 'lucide-react'
import { assinarTermosAction, assinarDocumentoAction } from '@/actions/membro-actions'
import { useToast } from '@/components/ui/ConfirmDialog'

// ============================================================================
// 1. O BOTÃO ANTIGO (Mantemos como 'export default' para não quebrar o sistema)
// ============================================================================
export default function BotaoAssinar({ membroId }: { membroId: number }) {
    const toast = useToast()
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    async function handleAssinar() {
        setStatus('loading');

        try {
            const result = await assinarTermosAction(membroId);

            if (result.success) {
                setStatus('success');
                // Redireciona de volta para a dashboard após um breve momento
                setTimeout(() => window.location.href = '/membros/dashboard', 1500);
            } else {
                setStatus('idle');
                toast("Ocorreu um erro ao assinar. Tenta novamente.", 'erro');
            }
        } catch (error) {
            setStatus('idle');
            toast("Erro de ligação.", 'erro');
        }
    }

    return (
        <button
            onClick={handleAssinar}
            disabled={status !== 'idle'}
            className={`w-full py-6 rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl
                ${status === 'success' ? 'bg-green-600 text-white' : 'bg-fg text-bg hover:bg-figueira hover:scale-[1.01] active:scale-[0.98]'}`}
        >
            {status === 'loading' && <Loader2 className="animate-spin" size={20} />}
            {status === 'success' && <Check size={20} />}
            {status === 'idle' && "Confirmar e Assinar Digitalmente"}
            {status === 'success' && "Assinado com Sucesso"}
        </button>
    )
}

// ============================================================================
// 2. O BOTÃO NOVO (Usamos 'export function' em vez de 'export default')
// ============================================================================
interface Props {
    membroId: number;
    tipo: 'GDPR' | 'PERMANECER';
    nomeDocumento: string;
}

export function BotaoAssinarDocumento({ membroId, tipo, nomeDocumento }: Props) {
    const toast = useToast()
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    async function handleAssinar() {
        setLoading(true);
        const res = await assinarDocumentoAction(membroId, tipo);

        if (res.ok) {
            setSucesso(true);
        } else {
            toast(res.error || `Erro ao assinar o documento ${nomeDocumento}.`, 'erro');
            setLoading(false);
        }
    }

    if (sucesso) {
        return (
            <div className="w-full flex items-center justify-center gap-2 bg-green-500/10 text-green-600 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-green-500/20">
                <CheckCircle2 size={16} /> Assinado com Sucesso
            </div>
        )
    }

    return (
        <button
            onClick={handleAssinar}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-fg text-bg px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-figueira transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />}
            {loading ? 'A Registar...' : `Assinar ${nomeDocumento}`}
        </button>
    )
}