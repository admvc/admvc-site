// Cartão pequeno do Início: há artes publicadas do próximo culto para o irmão partilhar (abre a página aberta /divulgar).
import Link from 'next/link'
import { ChevronRight, Megaphone } from 'lucide-react'
import { diaCurto, hora } from './datas'

export default function AjudaDivulgar({ culto }: { culto: { nome: string; data: string } | null }) {
    if (!culto) return null
    return (
        <Link href="/divulgar" className="a-card a-foco flex min-h-[64px] items-center gap-3 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }} aria-hidden>
                <Megaphone size={22} />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">Ajuda a divulgar</span>
                <span className="block truncate text-[14px] a-suave">{culto.nome} · {diaCurto(culto.data)}, {hora(culto.data)}</span>
            </span>
            <ChevronRight size={22} className="shrink-0 a-suave" aria-hidden />
        </Link>
    )
}
