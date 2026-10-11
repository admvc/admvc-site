'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Church } from 'lucide-react'
import { Suspense } from 'react'

interface Congregacao {
    id: number
    nome: string
    cidade: string
}

function FilterSelect({
    congregacoes,
    fixedValue,
    disabled,
}: {
    congregacoes: Congregacao[]
    fixedValue?: number
    disabled: boolean
}) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const currentValue = disabled && fixedValue
        ? fixedValue.toString()
        : searchParams.get('congregacao') ?? 'todas'

    function handleChange(value: string) {
        const params = new URLSearchParams(searchParams.toString())
        if (value === '' || value === 'todas') {
            params.delete('congregacao')
        } else {
            params.set('congregacao', value)
        }
        const qs = params.toString()
        router.push(qs ? `${pathname}?${qs}` : pathname)
    }

    return (
        <div className="flex items-center gap-2">
            <Church size={14} className="text-muted shrink-0" />
            <select
                value={currentValue}
                onChange={(e) => handleChange(e.target.value)}
                disabled={disabled}
                className="w-full bg-bg border border-soft rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-fg appearance-none cursor-pointer hover:border-figueira/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed pr-7"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.2em 1.2em',
                }}
            >
                {!disabled && <option value="todas">Todas</option>}
                {congregacoes.map(c => (
                    <option key={c.id} value={c.id.toString()}>
                        {c.nome} — {c.cidade}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default function CongregacaoFilter({
    congregacoes,
    selected,
    disabled = false,
}: {
    congregacoes: Congregacao[]
    selected?: number
    disabled?: boolean
}) {
    if (congregacoes.length === 0) return null

    return (
        <Suspense fallback={
            <div className="flex items-center gap-2">
                <Church size={14} className="text-muted shrink-0" />
                <div className="h-8 bg-bg border border-soft rounded-xl animate-pulse flex-1" />
            </div>
        }>
            <FilterSelect
                congregacoes={congregacoes}
                fixedValue={selected}
                disabled={disabled}
            />
        </Suspense>
    )
}
