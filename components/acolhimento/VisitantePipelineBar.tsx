'use client'

const ETAPAS = [
    { key: 'NOVO', label: 'Novo' },
    { key: 'EM_CONTACTO', label: 'Contacto' },
    { key: 'REUNIAO_PASTOR', label: 'Pastor' },
    { key: 'CONSOLIDADO', label: 'Membro' },
]

const SAIDAS = ['NAO_RETORNOU', 'OUTRA_IGREJA', 'DESISTIU']

export default function VisitantePipelineBar({ status }: { status: string }) {
    if (SAIDAS.includes(status)) {
        const labels: Record<string, string> = {
            NAO_RETORNOU: 'Nao Retornou',
            OUTRA_IGREJA: 'Outra Igreja',
            DESISTIU: 'Desistiu',
        }
        return (
            <div className="flex items-center gap-1.5">
                <span className="text-[7px] font-black uppercase tracking-widest text-red-500 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                    {labels[status] || status}
                </span>
            </div>
        )
    }

    const currentIndex = ETAPAS.findIndex(e => e.key === status)

    return (
        <div className="flex items-center gap-1 w-full">
            {ETAPAS.map((etapa, i) => {
                const isActive = i === currentIndex
                const isPast = i < currentIndex
                const isFuture = i > currentIndex

                return (
                    <div key={etapa.key} className="flex items-center gap-1 flex-1">
                        <div className="flex flex-col items-center flex-1 gap-0.5">
                            <div className={`h-1.5 w-full rounded-full transition-all ${
                                isActive ? 'bg-figueira shadow-sm shadow-figueira/30' :
                                isPast ? 'bg-emerald-500' :
                                'bg-soft'
                            }`} />
                            <span className={`text-[6px] font-black uppercase tracking-widest ${
                                isActive ? 'text-figueira' :
                                isPast ? 'text-emerald-600' :
                                'text-muted/50'
                            }`}>
                                {etapa.label}
                            </span>
                        </div>
                        {i < ETAPAS.length - 1 && (
                            <div className={`w-1 h-1 rounded-full shrink-0 mt-[-8px] ${
                                isPast ? 'bg-emerald-500' : 'bg-soft'
                            }`} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}
