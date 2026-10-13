// Um culto na lista de escalas de um ministerio: nome, hora, fotos da equipa e
// tres numeros (pessoas, confirmados, musicas). Toque abre a escala.
import Link from 'next/link'
import { Music2, ThumbsUp, Users } from 'lucide-react'
import type { CultoDoMinisterio } from '@/lib/ministerios-app'
import Avatares from './Avatares'
import { hora } from './datas'

function estadoParaLider(c: CultoDoMinisterio) {
    if (c.funcoesTotal === 0) return null
    if (c.funcoesPreenchidas === 0) return { texto: 'Por montar', cor: 'var(--a-aviso)' }
    if (c.funcoesPreenchidas < c.funcoesTotal) return { texto: `${c.funcoesPreenchidas} de ${c.funcoesTotal} funções`, cor: 'var(--a-aviso)' }
    return null
}

export default function CartaoCulto({ culto, deptoId, eLouvor, gere }: { culto: CultoDoMinisterio; deptoId: number; eLouvor: boolean; gere: boolean }) {
    const aviso = gere ? estadoParaLider(culto) : null
    return (
        <Link href={`/escalas/culto/${culto.id}?equipa=${deptoId}`} className="a-card a-foco block p-4 space-y-3">
            <span className="flex items-start justify-between gap-2">
                <span className="min-w-0">
                    <span className="block truncate text-[18px] font-bold leading-tight">{culto.nome}</span>
                    <span className="block text-[15px] a-suave">{hora(culto.data)}</span>
                </span>
                {culto.euEstou && (
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                        Estou nesta
                    </span>
                )}
            </span>

            {culto.pessoas.length > 0
                ? <Avatares pessoas={culto.pessoas} />
                : <span className="block text-[15px] a-suave">Ninguém escalado ainda</span>}

            <span className="flex items-center gap-4 border-t pt-3 text-[15px] a-suave" style={{ borderColor: 'var(--a-borda)' }}>
                <span className="inline-flex items-center gap-1.5" title="Pessoas"><Users size={17} aria-hidden /> {culto.pessoas.length}<span className="sr-only"> pessoas</span></span>
                <span className="inline-flex items-center gap-1.5" title="Confirmados"><ThumbsUp size={17} aria-hidden /> {culto.confirmados}<span className="sr-only"> confirmados</span></span>
                {eLouvor && <span className="inline-flex items-center gap-1.5" title="Músicas"><Music2 size={17} aria-hidden /> {culto.musicas}<span className="sr-only"> músicas</span></span>}
                {aviso && <span className="ml-auto text-[14px] font-semibold" style={{ color: aviso.cor }}>{aviso.texto}</span>}
            </span>
        </Link>
    )
}
