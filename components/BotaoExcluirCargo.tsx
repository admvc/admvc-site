"use client"

import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'

interface BotaoExcluirProps {
    id: number;
    nome: string;
    onExcluir: (id: number) => Promise<void>;
}

export default function BotaoExcluirCargo({ id, nome, onExcluir }: BotaoExcluirProps) {
    const confirmar = useConfirm()
    const toast = useToast()
    const handleExcluir = async () => {
        const confirmou = await confirmar({ mensagem: `Tem certeza que deseja excluir o cargo "${nome.toUpperCase()}"?`, tipo: 'perigo' });

        if (confirmou) {
            try {
                await onExcluir(id);
            } catch (error) {
                toast("Erro ao excluir o cargo. Verifique se existem membros vinculados.", 'erro');
            }
        }
    };

    return (
        <button
            onClick={handleExcluir}
            className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-red-500 uppercase px-2 py-1 hover:bg-red-50 rounded-lg transition-all"
        >
            Excluir
        </button>
    );
}