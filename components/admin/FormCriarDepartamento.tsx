'use client'

import { useRef, useTransition } from 'react'
import { criarDepartamento } from '@/actions/admin-actions'
import { Church } from 'lucide-react'
import { useToast } from '@/components/ui/ConfirmDialog'

interface Props {
    congregacoes: { id: number; nome: string; cidade: string }[]
}

export default function FormCriarDepartamento({ congregacoes }: Props) {
    const toast = useToast()
    const formRef = useRef<HTMLFormElement>(null)
    const [isPending, startTransition] = useTransition()

    async function handleAction(fd: FormData) {
        startTransition(async () => {
            try {
                await criarDepartamento(fd)
                toast('Departamento criado com sucesso!', 'sucesso')
                formRef.current?.reset()
            } catch {
                toast('Erro ao criar departamento.', 'erro')
            }
        })
    }

    return (
        <form ref={formRef} action={handleAction} className="space-y-3">
            <input
                name="nome"
                placeholder="Nome do departamento..."
                className="w-full bg-bg border border-soft rounded-xl p-3 text-sm outline-none focus:border-figueira transition-all"
                required
                disabled={isPending}
            />
            {congregacoes.length > 0 && (
                <div className="space-y-1.5">
                    <label className="text-[8px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                        <Church size={10} /> Congregacao (opcional)
                    </label>
                    <select
                        name="congregacaoId"
                        className="w-full bg-bg border border-soft rounded-xl p-3 text-sm outline-none focus:border-figueira transition-all appearance-none"
                        disabled={isPending}
                    >
                        <option value="">Global (toda a igreja)</option>
                        {congregacoes.map(c => (
                            <option key={c.id} value={c.id}>{c.nome} — {c.cidade}</option>
                        ))}
                    </select>
                </div>
            )}
            <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
                {isPending ? 'A criar...' : 'Criar Departamento'}
            </button>
        </form>
    )
}
