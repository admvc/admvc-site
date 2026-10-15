'use client'

// Página da rotina de um culto: todos leem e partilham; quem gere altera,
// começa de um modelo ou do culto anterior, e passa-a aos próximos da série.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Edit3, Printer, Repeat, Share2 } from 'lucide-react'
import { aplicarRotinaASerie, guardarRotina } from '@/actions/rotina-actions'
import { duracaoTotal, minutosPorExtenso, semNotas, textoDaRotina, type ItemRotina } from '@/lib/rotina-culto'
import type { DadosRotina } from '@/lib/rotina-culto-dados'
import { useConfirm, useToast } from '@/components/ui/ConfirmDialog'
import EditorRotina, { useRotina } from './EditorRotina'
import RotinaLista from './RotinaLista'

const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', timeZone: 'UTC' })

export default function RotinaDoCulto({ dados }: { dados: DadosRotina }) {
    const router = useRouter()
    const confirmar = useConfirm()
    const toast = useToast()
    const [pendente, iniciar] = useTransition()
    const [editar, setEditar] = useState(false)
    const [escolherInicio, setEscolherInicio] = useState(false)
    const [aviso, setAviso] = useState<string | null>(null)
    const rotina = useRotina(dados.itens)
    const { evento, itens, membros } = dados

    const texto = textoDaRotina(evento, itens, new Map(membros.map((m) => [m.id, m])))
    const total = duracaoTotal(itens)
    const botao = 'a-foco inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-[15px] font-semibold'
    const estiloBotao = { borderColor: 'var(--a-borda)', background: 'var(--a-card)' }

    function abrirEditor() {
        setAviso(null)
        rotina.substituir(dados.itens)
        // Sem rotina: perguntar de onde começar (se houver de onde)
        setEscolherInicio(dados.itens.length === 0 && (dados.modelos.length > 0 || !!dados.anterior))
        setEditar(true)
    }

    function comecar(itens: ItemRotina[]) {
        rotina.substituir(semNotas(itens))
        setEscolherInicio(false)
    }

    function guardar() {
        setAviso(null)
        const semNome = rotina.itens.findIndex((i) => !i.momento.trim())
        if (semNome >= 0) {
            setAviso(`O momento ${semNome + 1} não tem nome. Escreva-o ou tire-o.`)
            return
        }
        iniciar(async () => {
            const r = await guardarRotina(evento.id, rotina.itens)
            if ('error' in r) setAviso(r.error)
            else {
                toast(rotina.itens.length ? 'Rotina guardada.' : 'Rotina apagada.', 'sucesso')
                setEditar(false)
                router.refresh()
            }
        })
    }

    async function passarASerie() {
        const ok = await confirmar({
            titulo: 'Passar aos próximos cultos',
            mensagem: `A mesma rotina (sem as notas) fica nos próximos cultos "${evento.nome}" à mesma hora. Os que já têm rotina ficam como estão.`,
            botaoConfirmar: 'Passar',
            tipo: 'info',
        })
        if (!ok) return
        iniciar(async () => {
            const r = await aplicarRotinaASerie(evento.id, false)
            if ('error' in r) toast(r.error, 'erro')
            else {
                const partes = [`Rotina passada a ${r.aplicados} culto(s).`]
                if (r.ignorados) partes.push(`${r.ignorados} já tinham rotina e ficaram como estavam.`)
                toast(partes.join(' '), 'sucesso')
            }
        })
    }

    async function copiar() {
        try {
            await navigator.clipboard.writeText(texto)
            toast('Texto copiado.', 'sucesso')
        } catch {
            toast('Não foi possível copiar.', 'erro')
        }
    }

    if (editar) {
        if (escolherInicio) {
            return (
                <section className="space-y-3">
                    <h2 className="text-[20px] font-bold">Começar a partir de</h2>
                    {dados.modelos.map((m) => (
                        <button key={m.id} type="button" className="a-card a-foco block w-full p-4 text-left" onClick={() => comecar(m.itens)}>
                            <span className="block text-[17px] font-semibold">Modelo: {m.nome}</span>
                            <span className="block text-[15px] a-suave">{m.itens.map((i) => i.momento).join(' · ')}</span>
                        </button>
                    ))}
                    {dados.anterior && (
                        <button type="button" className="a-card a-foco block w-full p-4 text-left" onClick={() => comecar(dados.anterior!.itens)}>
                            <span className="block text-[17px] font-semibold">O culto anterior ({dataCurta(dados.anterior.data)})</span>
                            <span className="block text-[15px] a-suave">{dados.anterior.itens.map((i) => i.momento).join(' · ')}</span>
                        </button>
                    )}
                    <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => comecar([])}>Começar em branco</button>
                    <button type="button" className="a-botao a-botao-secundario w-full" onClick={() => setEditar(false)}>Cancelar</button>
                </section>
            )
        }
        return (
            <section className="space-y-4">
                <h2 className="text-[20px] font-bold">Alterar a rotina</h2>
                <EditorRotina linhas={rotina.linhas} setLinhas={rotina.setLinhas} membros={membros} inicio={evento.data} desativado={pendente} />
                {aviso && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro)' }}>{aviso}</p>}
                <div className="sticky bottom-24 z-10 flex gap-2 md:bottom-4">
                    <button type="button" className="a-botao a-botao-secundario flex-1" disabled={pendente} onClick={() => setEditar(false)}>Cancelar</button>
                    <button type="button" className="a-botao a-botao-principal flex-[2]" disabled={pendente} onClick={guardar}>
                        {pendente ? 'A guardar…' : 'Guardar rotina'}
                    </button>
                </div>
            </section>
        )
    }

    return (
        <section className="space-y-4">
            {itens.length > 0 ? (
                <>
                    <div className="flex flex-wrap gap-2 no-print">
                        <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className={botao} style={estiloBotao}>
                            <Share2 size={17} aria-hidden /> Partilhar
                        </a>
                        <button type="button" className={botao} style={estiloBotao} onClick={copiar}><Copy size={17} aria-hidden /> Copiar texto</button>
                        <button type="button" className={botao} style={estiloBotao} onClick={() => window.print()}><Printer size={17} aria-hidden /> Imprimir</button>
                    </div>
                    <RotinaLista inicio={evento.data} itens={itens} membros={membros} />
                    {total && <p className="text-[15px] a-suave">Duração prevista: {minutosPorExtenso(total)}</p>}
                </>
            ) : (
                <p className="a-card p-5 text-[16px] a-suave">
                    Ainda não há rotina para este culto.{dados.podeEditar ? '' : ' Quem organiza o culto ainda a vai pôr aqui.'}
                </p>
            )}

            {dados.podeEditar && (
                <div className="space-y-2 no-print">
                    <button type="button" className="a-botao a-botao-principal w-full" disabled={pendente} onClick={abrirEditor}>
                        <Edit3 size={18} aria-hidden /> {itens.length ? 'Alterar rotina' : 'Fazer a rotina'}
                    </button>
                    {itens.length > 0 && (
                        <button type="button" className="a-botao a-botao-secundario w-full" disabled={pendente} onClick={passarASerie}>
                            <Repeat size={18} aria-hidden /> Passar aos próximos cultos desta série
                        </button>
                    )}
                </div>
            )}
        </section>
    )
}
