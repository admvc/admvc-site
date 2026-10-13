'use client'

// "Sugerir uma pessoa para a equipa" (lider ou nomeado): procura um membro da
// igreja que ainda nao esta na equipa, escolhe as funcoes e envia. Um
// administrador aprova; ate la fica em "A aguardar aprovação".

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Search, UserPlus } from 'lucide-react'
import { procurarMembrosParaSugerir, sugerirPessoaNoMinisterio } from '@/actions/sugestao-actions'
import { diaCurto } from './datas'

type Funcao = { id: number; nome: string }
type Pendente = { id: number; nome: string; data: string }

export default function SugerirPessoa({ deptoId, funcoes, pendentes }: { deptoId: number; funcoes: Funcao[]; pendentes: Pendente[] }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [aberto, setAberto] = useState(false)
    const [texto, setTexto] = useState('')
    const [lista, setLista] = useState<{ id: number; nome: string }[]>([])
    const [escolhida, setEscolhida] = useState<{ id: number; nome: string } | null>(null)
    const [marcadas, setMarcadas] = useState<number[]>([])
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)

    useEffect(() => {
        if (!aberto || escolhida) return
        const t = setTimeout(async () => {
            const r = await procurarMembrosParaSugerir(deptoId, texto)
            setLista(r.ok ? r.membros : [])
        }, 250)
        return () => clearTimeout(t)
    }, [texto, aberto, escolhida, deptoId])

    function enviar() {
        if (!escolhida) return
        setAviso(null)
        iniciar(async () => {
            const r = await sugerirPessoaNoMinisterio(deptoId, escolhida.id, marcadas)
            if (!r.ok) { setAviso({ ok: false, texto: r.error }); return }
            setAviso({ ok: true, texto: `Sugestão enviada. Um administrador vai aprovar ${escolhida.nome}.` })
            setEscolhida(null); setTexto(''); setMarcadas([]); setAberto(false)
            router.refresh()
        })
    }

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border pl-12 pr-4 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <section className="a-card p-4 space-y-3" aria-labelledby="sugerir">
            <h2 id="sugerir" className="text-[19px] font-bold">Sugerir uma pessoa para a equipa</h2>
            <p className="text-[15px] a-suave">Um administrador da igreja aprova antes de a pessoa entrar.</p>

            {pendentes.length > 0 && (
                <div className="space-y-1">
                    <p className="text-[15px] font-semibold">A aguardar aprovação</p>
                    <ul className="a-divide">
                        {pendentes.map((p) => (
                            <li key={p.id} className="flex justify-between gap-2 py-2 text-[15px]">
                                <span>{p.nome}</span><span className="a-suave">{diaCurto(p.data)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {!aberto ? (
                <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => { setAberto(true); setAviso(null) }}>
                    <UserPlus size={20} aria-hidden /> Sugerir pessoa
                </button>
            ) : escolhida ? (
                <div className="space-y-3">
                    <p className="text-[17px] font-semibold">{escolhida.nome}</p>
                    {funcoes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-[15px] a-suave">Que funções sabe fazer?</p>
                            <div className="flex flex-wrap gap-2">
                                {funcoes.map((f) => {
                                    const sim = marcadas.includes(f.id)
                                    return (
                                        <button key={f.id} type="button" aria-pressed={sim}
                                            onClick={() => setMarcadas((m) => (sim ? m.filter((x) => x !== f.id) : [...m, f.id]))}
                                            className="a-foco inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold"
                                            style={sim ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)', borderColor: 'var(--a-destaque)' } : { borderColor: 'var(--a-borda)' }}>
                                            {sim && <Check size={16} aria-hidden />} {f.nome}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" className="a-botao a-botao-secundario" onClick={() => setEscolhida(null)}>Voltar</button>
                        <button type="button" className="a-botao a-botao-principal" disabled={pendente} onClick={enviar}>Enviar sugestão</button>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <label className="relative block">
                        <span className="sr-only">Nome da pessoa</span>
                        <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 a-suave" aria-hidden />
                        <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nome da pessoa" className={campo} style={estilo} />
                    </label>
                    {texto.trim().length >= 2 && lista.length === 0 && <p className="text-[15px] a-suave">Ninguém com esse nome fora da equipa.</p>}
                    <ul className="space-y-2">
                        {lista.map((m) => (
                            <li key={m.id}>
                                <button type="button" onClick={() => setEscolhida(m)} className="a-card a-foco flex min-h-[52px] w-full items-center px-4 text-left text-[16px] font-semibold">
                                    {m.nome}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button type="button" className="text-[15px] underline a-suave" onClick={() => setAberto(false)}>Cancelar</button>
                </div>
            )}

            {aviso && <p role="status" className="text-[15px] font-semibold" style={{ color: aviso.ok ? 'var(--a-ok)' : 'var(--a-erro)' }}>{aviso.texto}</p>}
        </section>
    )
}
