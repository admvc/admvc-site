'use client'

// Copia o link público da página de inscrição (para o WhatsApp das irmãs).
import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopiarLink({ caminho }: { caminho: string }) {
    const [copiado, setCopiado] = useState(false)
    async function copiar() {
        const url = `${window.location.origin}${caminho}`
        try {
            await navigator.clipboard.writeText(url)
            setCopiado(true)
            setTimeout(() => setCopiado(false), 2500)
        } catch {
            window.prompt('Copie o link:', url)
        }
    }
    return (
        <button type="button" onClick={copiar} className="a-botao a-botao-secundario !min-h-[44px] !text-[15px]">
            {copiado ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copiado ? 'Copiado!' : 'Copiar link'}
        </button>
    )
}
