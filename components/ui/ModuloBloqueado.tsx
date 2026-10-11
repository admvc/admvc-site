'use client'

import { Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const NOMES_MODULO: Record<string, string> = {
    escalas: 'Escalas',
    grupos: 'Grupos / Células',
    louvor: 'Louvor & Holyrics',
    financeiro: 'Financeiro',
    cantina: 'Cantina',
    acolhimento: 'Acolhimento',
    inventario: 'Inventário',
    gabinete: 'Gabinete / Agenda',
    mural: 'Mural',
    personalizacao: 'Personalização Visual',
    relatorios: 'Relatórios',
    auditoria: 'Auditoria',
}

export default function ModuloBloqueado() {
    const searchParams = useSearchParams()
    const modulo = searchParams.get('modulo_bloqueado')

    if (!modulo) return null

    const nomeModulo = NOMES_MODULO[modulo] || modulo

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="max-w-sm w-full bg-bg border border-soft rounded-3xl shadow-2xl p-8 text-center space-y-5">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                    <Lock size={28} className="text-orange-500" />
                </div>

                <div>
                    <h2 className="text-lg font-black italic uppercase tracking-tighter text-fg">
                        {nomeModulo}
                    </h2>
                    <p className="text-sm text-muted mt-2">
                        Esta funcionalidade não está incluída no plano actual da sua igreja.
                    </p>
                    <p className="text-xs text-muted/60 mt-1">
                        Contacte a administração para activar este módulo.
                    </p>
                </div>

                <Link
                    href="/membros/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-figueira text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all active:scale-95"
                >
                    <ArrowLeft size={14} /> Voltar ao Painel
                </Link>
            </div>
        </div>
    )
}
