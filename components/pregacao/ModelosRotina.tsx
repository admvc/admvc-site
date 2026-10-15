'use client'

// Lista e edição dos modelos de rotina (por congregação).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { apagarModelo, guardarModelo } from '@/actions/rotina-actions'
import { duracaoTotal, minutosPorExtenso, type ItemRotina, type MembroRotina } from '@/lib/rotina-culto'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import EditorRotina, { useRotina } from './EditorRotina'
import RotinaLista from './RotinaLista'

type Modelo = { id: number; nome: string; congregacaoId: number | null; itens: ItemRotina[] }

const TODAS = 'todas'

export default function ModelosRotina({ modelos, congregacoes, podeTodas, membros }: {
    modelos: Modelo[]
    congregacoes: { id: number; nome: string }[]
    podeTodas: boolean
    membros: MembroRotina[]
}) {
    const router = useRouter()
    const confirmar = useConfirm()
    const toast = useToast()
    const [pendente, iniciar] = useTransition()
    const [aberto, setAberto] = useState<Modelo | 'novo' | null>(null)
    const [nome, setNome] = useState('')
    const [cong, setCong] = useState('')
    const [aviso, setAviso] = useState<string | null>(null)
    const rotina = useRotina([])

    const nomeCong = (id: number | null) => (id ? congregacoes.find((c) => c.id === id)?.nome ?? '—' : 'Todas as congregações')

    function abrir(m: Modelo | 'novo') {
        setAviso(null)
        setAberto(m)
        if (m === 'novo') {
            setNome('')
            setCong(congregacoes[0] ? String(congregacoes[0].id) : TODAS)
            rotina.substituir([{ momento: 'Louvor' }])
        } else {
            setNome(m.nome)
            setCong(m.congregacaoId ? String(m.congregacaoId) : TODAS)
            rotina.substituir(m.itens)
        }
    }

    function guardar() {
        setAviso(null)
        if (rotina.itens.some((i) => !i.momento.trim())) {
            setAviso('Há um momento sem nome. Escreva-o ou tire-o.')
            return
        }
        iniciar(async () => {
            const r = await guardarModelo({
                id: aberto && aberto !== 'novo' ? aberto.id : undefined,
                nome,
                congregacaoId: cong && cong !== TODAS ? Number(cong) : null,
                itens: rotina.itens,
            })
            if ('error' in r) setAviso(r.error)
            else {
                toast('Modelo guardado.', 'sucesso')
                setAberto(null)
                router.refresh()
            }
        })
    }

    async function apagar(m: Modelo) {
        const ok = await confirmar({
            titulo: 'Apagar modelo',
            mensagem: `Apagar o modelo "${m.nome}"? As rotinas já feitas a partir dele ficam como estão.`,
            botaoConfirmar: 'Apagar',
        })
        if (!ok) return
        iniciar(async () => {
            const r = await apagarModelo(m.id)
            if ('error' in r) toast(r.error, 'erro')
            else router.refresh()
        })
    }

    const campo = 'a-foco min-h-[48px] w-full rounded-[14px] border px-3 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    if (aberto) {
        return (
            <section className="space-y-4">
                <h2 className="text-[20px] font-bold">{aberto === 'novo' ? 'Novo modelo' : `Alterar "${aberto.nome}"`}</h2>
                <label className="block space-y-1">
                    <span className="text-[15px] font-semibold">Nome do modelo</span>
                    <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: Culto de domingo" className={campo} style={estilo} />
                </label>
                <label className="block space-y-1">
                    <span className="text-[15px] font-semibold">Congregação</span>
                    <select value={cong} onChange={(e) => setCong(e.target.value)} className={campo} style={estilo}>
                        {congregacoes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        {podeTodas && <option value={TODAS}>Todas as congregações</option>}
                    </select>
                </label>
                <p className="text-[15px] a-suave">Os responsáveis são opcionais: deixe &quot;Ninguém em especial&quot; quando muda de culto para culto.</p>
                <EditorRotina linhas={rotina.linhas} setLinhas={rotina.setLinhas} membros={membros} desativado={pendente} />
                {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}
                <div className="sticky bottom-24 z-10 flex gap-2 md:bottom-4">
                    <button type="button" className="a-botao a-botao-secundario flex-1" disabled={pendente} onClick={() => setAberto(null)}>Cancelar</button>
                    <button type="button" className="a-botao a-botao-principal flex-[2]" disabled={pendente} onClick={guardar}>
                        {pendente ? 'A guardar…' : 'Guardar modelo'}
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-4">
            <button type="button" className="a-botao a-botao-principal w-full" onClick={() => abrir('novo')}>
                <Plus size={20} aria-hidden /> Novo modelo
            </button>
            {modelos.length === 0 && <p className="a-card p-5 text-[16px] a-suave">Ainda não há modelos.</p>}
            {modelos.map((m) => {
                const total = duracaoTotal(m.itens)
                return (
                    <article key={m.id} className="a-card space-y-3 p-4">
                        <div>
                            <h3 className="text-[19px] font-bold leading-snug">{m.nome}</h3>
                            <p className="text-[15px] a-suave">{nomeCong(m.congregacaoId)}{total ? ` · ${minutosPorExtenso(total)}` : ''}</p>
                        </div>
                        <RotinaLista itens={m.itens} membros={membros} compacta />
                        <div className="flex gap-2">
                            <button type="button" className="a-botao a-botao-secundario flex-1 !min-h-[44px]" disabled={pendente} onClick={() => abrir(m)}>
                                <Edit3 size={18} aria-hidden /> Alterar
                            </button>
                            <button type="button" className="a-botao a-botao-secundario !min-h-[44px] !px-3" disabled={pendente}
                                aria-label={`Apagar ${m.nome}`} style={{ color: 'var(--a-erro)' }} onClick={() => apagar(m)}>
                                <Trash2 size={20} aria-hidden />
                            </button>
                        </div>
                    </article>
                )
            })}
        </section>
    )
}
