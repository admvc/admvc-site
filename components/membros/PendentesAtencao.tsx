import { AlertCircle, Calendar, Wallet2, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

interface Pendente {
    tipo: 'escala' | 'pledge' | 'gdpr' | 'recarga' | 'encomenda'
    titulo: string
    descricao: string
    link?: string
    cor: string
}

interface Props {
    pendentes: Pendente[]
}

export default function PendentesAtencao({ pendentes }: Props) {
    if (pendentes.length === 0) return null

    const icons: Record<string, any> = { escala: Calendar, pledge: Wallet2, recarga: Wallet2, encomenda: ShoppingCart, gdpr: AlertCircle }

    return (
        <div className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                <AlertCircle size={12} /> Requer a tua atencao ({pendentes.length})
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {pendentes.map((p, i) => {
                    const Icon = icons[p.tipo] || AlertCircle
                    const content = (
                        <div key={i} className={`flex items-center gap-3 bg-bg2 border border-soft rounded-2xl px-4 py-3 hover:border-orange-500/30 transition-all ${p.link ? 'cursor-pointer' : ''}`}>
                            <Icon size={14} className={p.cor} />
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase text-fg truncate">{p.titulo}</p>
                                <p className="text-[9px] text-muted truncate">{p.descricao}</p>
                            </div>
                        </div>
                    )
                    return p.link ? <Link href={p.link} key={i}>{content}</Link> : <div key={i}>{content}</div>
                })}
            </div>
        </div>
    )
}
