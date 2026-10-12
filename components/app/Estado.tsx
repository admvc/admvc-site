import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import type { EstadoEscala } from '@/lib/escalas-app'

const ESTILO: Record<EstadoEscala, { texto: string; cor: string; fundo: string; Icone: typeof Clock }> = {
    CONFIRMADA: { texto: 'Confirmada', cor: 'var(--a-ok)', fundo: 'var(--a-ok-suave)', Icone: CheckCircle2 },
    POR_CONFIRMAR: { texto: 'Por confirmar', cor: 'var(--a-aviso)', fundo: 'var(--a-aviso-suave)', Icone: Clock },
    NAO_PODE: { texto: 'Não pode', cor: 'var(--a-erro)', fundo: 'var(--a-erro-suave)', Icone: XCircle },
}

/** Etiqueta pequena com icone e texto (nunca so cor). */
export default function Estado({ estado }: { estado: EstadoEscala }) {
    const { texto, cor, fundo, Icone } = ESTILO[estado]
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold" style={{ color: cor, background: fundo }}>
            <Icone size={15} aria-hidden /> {texto}
        </span>
    )
}
