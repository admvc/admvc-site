'use client'

// Sorteio no telemóvel da organização: os nomes passam depressa e param num.
// Quem já ganhou não volta a sair. Cada vencedora fica na auditoria.
import { useRef, useState } from 'react'
import Link from 'next/link'
import { registarSorteioAction } from '@/actions/inscricao-actions'
import { ArrowLeft, Gift } from 'lucide-react'

type P = { id: number; nome: string }

export default function SorteioClient({ slug, titulo, cor, origem, participantes }: { slug: string; titulo: string; cor: string; origem: 'presentes' | 'confirmadas'; participantes: P[] }) {
    const [vencedoras, setVencedoras] = useState<P[]>([])
    const [mostrado, setMostrado] = useState<string>('')
    const [aSortear, setASortear] = useState(false)
    const temporizador = useRef<ReturnType<typeof setInterval> | null>(null)

    const restantes = participantes.filter(p => !vencedoras.some(v => v.id === p.id))

    function sortear() {
        if (restantes.length === 0 || aSortear) return
        setASortear(true)
        // Escolha com o gerador seguro do navegador
        const n = new Uint32Array(1); crypto.getRandomValues(n)
        const escolhida = restantes[n[0] % restantes.length]
        let passos = 0
        temporizador.current = setInterval(() => {
            setMostrado(restantes[Math.floor(Math.random() * restantes.length)].nome)
            if (++passos >= 28) {
                clearInterval(temporizador.current!)
                setMostrado(escolhida.nome)
                setVencedoras(v => [...v, escolhida])
                setASortear(false)
                registarSorteioAction(slug, escolhida.id).catch(() => {})
            }
        }, 70 + passos * 4)
    }

    return (
        <div className="space-y-6 text-center">
            <Link href={`/inscricoes/${slug}`} className="inline-flex items-center gap-1 text-[15px] a-suave"><ArrowLeft size={16} aria-hidden /> {titulo}</Link>
            <h1 className="text-[28px] font-bold flex items-center justify-center gap-2"><Gift size={28} style={{ color: cor }} aria-hidden /> Sorteio</h1>
            <p className="text-[16px] a-suave">
                Entre {participantes.length} {origem === 'presentes' ? 'presentes (quem chegou)' : 'inscrições confirmadas (ainda não há entradas marcadas)'}
            </p>

            <div className="a-card min-h-[140px] flex items-center justify-center p-6" style={{ borderColor: cor, borderWidth: 2 }} aria-live="polite">
                <p className={`font-bold leading-tight ${aSortear ? 'text-[26px] a-suave' : 'text-[34px]'}`} style={!aSortear && mostrado ? { color: cor } : undefined}>
                    {mostrado || '—'}
                </p>
            </div>

            <button type="button" onClick={sortear} disabled={aSortear || restantes.length === 0}
                className="a-botao w-full !min-h-[60px] !text-[20px] text-white disabled:opacity-50" style={{ background: cor }}>
                {restantes.length === 0 ? 'Já saíram todas' : vencedoras.length ? 'Sortear outra' : 'Sortear'}
            </button>

            {vencedoras.length > 0 && (
                <ol className="a-card p-4 text-left space-y-1 list-decimal list-inside text-[17px]">
                    {vencedoras.map(v => <li key={v.id}>{v.nome}</li>)}
                </ol>
            )}
        </div>
    )
}
