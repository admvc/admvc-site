'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function BotaoPrivacidade() {
    const [oculto, setOculto] = useState(false)

    // Ao carregar a página, verifica se já estava oculto antes
    useEffect(() => {
        const modoSalvo = localStorage.getItem('privacidadeFinanceira')
        if (modoSalvo === 'true') {
            setOculto(true)
            document.body.classList.add('modo-privacidade')
        }
    }, [])

    // Função para alternar o modo
    const togglePrivacidade = () => {
        const novoEstado = !oculto
        setOculto(novoEstado)
        localStorage.setItem('privacidadeFinanceira', String(novoEstado))
        
        if (novoEstado) {
            document.body.classList.add('modo-privacidade')
        } else {
            document.body.classList.remove('modo-privacidade')
        }
    }

    return (
        <button
            onClick={togglePrivacidade}
            className="h-12 w-12 bg-bg2 border border-soft text-fg rounded-2xl flex items-center justify-center hover:bg-soft transition-all active:scale-95 shadow-sm group"
            title={oculto ? "Mostrar Valores" : "Ocultar Valores (Modo Privacidade)"}
        >
            {oculto ? (
                <EyeOff size={18} className="text-muted group-hover:text-fg transition-colors" />
            ) : (
                <Eye size={18} className="text-figueira transition-colors" />
            )}
        </button>
    )
}