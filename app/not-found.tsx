import { Search, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-figueira/10 flex items-center justify-center">
                    <Search size={32} className="text-figueira" />
                </div>

                <div>
                    <h1 className="text-6xl font-black italic text-fg tracking-tighter">404</h1>
                    <p className="text-sm text-muted mt-2">
                        A página que procura não foi encontrada.
                    </p>
                </div>

                <div className="flex gap-3 justify-center">
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-figueira text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
                    >
                        <Home size={14} /> Início
                    </Link>
                    <Link
                        href="/membros/dashboard"
                        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-bg2 border border-soft text-fg text-xs font-black uppercase tracking-widest hover:border-figueira transition-all active:scale-95"
                    >
                        <ArrowLeft size={14} /> Painel
                    </Link>
                </div>
            </div>
        </div>
    )
}
