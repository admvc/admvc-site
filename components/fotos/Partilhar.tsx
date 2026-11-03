'use client'

// Partilhar o album ou a foto: no telemovel abre a lista de apps (WhatsApp, Instagram…);
// no computador copia o endereco. Sem imagens: o que se partilha e o link publico.
import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import s from './galeria.module.css'

export default function Partilhar({ url, titulo, escuro = false, rotulo = 'Partilhar' }: {
    url?: string
    titulo: string
    escuro?: boolean
    rotulo?: string
}) {
    const [feito, setFeito] = useState(false)

    async function partilhar() {
        const endereco = url || window.location.href
        try {
            if (navigator.share) {
                await navigator.share({ title: titulo, url: endereco })
                return
            }
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return
        }
        try {
            await navigator.clipboard.writeText(endereco)
            setFeito(true)
            setTimeout(() => setFeito(false), 2200)
        } catch {
            window.prompt('Copia o endereço do álbum:', endereco)
        }
    }

    return (
        <button type="button" onClick={partilhar} className={`${s.botao} ${escuro ? s.botaoEscuro : ''}`}>
            {feito ? <Check size={16} aria-hidden /> : <Share2 size={16} aria-hidden />}
            {feito ? 'Link copiado' : rotulo}
        </button>
    )
}
