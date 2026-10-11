'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react' // Mudamos para uma seta real

export default function BotaoVoltar() {
    const router = useRouter();

    return (
        <button
            type="button" // Garante que não submete nenhum form acidentalmente
            onClick={() => router.back()}
            className="p-3 bg-bg2 border border-soft text-muted hover:text-fg hover:border-fg rounded-2xl transition-all active:scale-90 group shadow-sm flex items-center justify-center"
            title="Voltar para a página anterior"
        >
            <ArrowLeft
                size={18}
                className="group-hover:-translate-x-1 transition-transform duration-200"
            />
        </button>
    )
}