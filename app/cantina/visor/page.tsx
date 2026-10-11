// app/cantina/visor/page.tsx
// Tela virada para o cliente — mostra o carrinho em tempo real
// Abrir num segundo ecra/tablet enquanto o operador usa o POS
'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Coffee } from 'lucide-react'

interface CartItem {
    produtoId: number
    nome: string
    preco: number
    quantidade: number
}

interface CartData {
    cart: CartItem[]
    total: number
    membro: string | null
}

export default function VisorClientePage() {
    const [data, setData] = useState<CartData>({ cart: [], total: 0, membro: null })

    useEffect(() => {
        function sync() {
            try {
                const raw = localStorage.getItem('pos_cart')
                if (raw) setData(JSON.parse(raw))
            } catch {}
        }

        sync()
        // Escutar mudancas de outras abas
        const handleStorage = (e: StorageEvent) => {
            if (e.key === 'pos_cart') sync()
        }
        window.addEventListener('storage', handleStorage)

        // Poll para mudancas na mesma aba (localStorage nao dispara evento na propria aba)
        const interval = setInterval(sync, 500)

        return () => {
            window.removeEventListener('storage', handleStorage)
            clearInterval(interval)
        }
    }, [])

    return (
        <main className="min-h-screen bg-bg flex flex-col">
            {/* Header */}
            <div className="bg-bg2 border-b border-soft px-8 py-6">
                <div className="flex items-center justify-between max-w-2xl mx-auto">
                    <div className="flex items-center gap-3">
                        <Coffee size={24} className="text-figueira" />
                        <h1 className="text-xl font-black uppercase tracking-widest text-fg">Cantina ADMVC</h1>
                    </div>
                    {data.membro && (
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted">Cliente</p>
                            <p className="text-sm font-black text-fg">{data.membro}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Carrinho */}
            <div className="flex-1 flex flex-col justify-center max-w-2xl mx-auto w-full px-8 py-10">
                {data.cart.length === 0 ? (
                    <div className="text-center space-y-4">
                        <ShoppingCart size={48} className="mx-auto text-muted/20" />
                        <p className="text-sm font-black uppercase tracking-widest text-muted">A aguardar produtos...</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Itens */}
                        <div className="space-y-3">
                            {data.cart.map((item, i) => (
                                <div key={i} className="flex items-center justify-between bg-bg2 border border-soft rounded-2xl px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <span className="text-lg font-black text-figueira w-8 text-center">{item.quantidade}x</span>
                                        <span className="text-base font-bold text-fg">{item.nome}</span>
                                    </div>
                                    <span className="text-base font-black text-fg">{(item.preco * item.quantidade).toFixed(2)}€</span>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="border-t-2 border-soft pt-6">
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-black uppercase tracking-widest text-muted">Total</span>
                                <span className="text-4xl font-black italic text-figueira">{data.total.toFixed(2)}€</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-bg2 border-t border-soft px-8 py-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted">Visor do Cliente — Atualiza automaticamente</p>
            </div>
        </main>
    )
}
