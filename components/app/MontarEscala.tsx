'use client'

// Montar a escala de um culto: cada funcao com quem esta escalado; tocar em
// "Escolher" abre a equipa (quem sabe a funcao primeiro, com quem nao pode e
// quem ja esta noutra funcao marcados). No fim: WhatsApp e lembrete.

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Check, MessageCircle, Plus, X } from 'lucide-react'
import { escalarNaFuncao, lembrarQuemNaoConfirmou, tirarDaEscala } from '@/actions/escala-app-actions'
import type { MontarEscalaDados, PessoaDaEquipa } from '@/lib/escalas-app'
import { diaPorExtenso, haQuanto, hora } from './datas'
import Estado from './Estado'

type Funcao = MontarEscalaDados['funcoes'][number]

export default function MontarEscala({ dados }: { dados: MontarEscalaDados }) {
    const router = useRouter()
    const [pendente, iniciar] = useTransition()
    const [escolher, setEscolher] = useState<Funcao | null>(null)
    const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
    const { evento, departamento, funcoes, equipa } = dados

    function correr(f: () => Promise<{ ok?: boolean; error?: string }>, ok?: string) {
        setAviso(null)
        iniciar(async () => {
            const r = await f()
            if (r?.error) setAviso({ tipo: 'erro', texto: r.error })
            else {
                if (ok) setAviso({ tipo: 'ok', texto: ok })
                router.refresh()
            }
        })
    }

    const porConfirmar = funcoes.flatMap((f) => f.escalados).filter((e) => e.estado === 'POR_CONFIRMAR').length

    const mensagemWhatsApp = useMemo(() => {
        const linhas = funcoes.map((f) => {
            const quem = f.escalados.filter((e) => e.estado !== 'NAO_PODE').map((e) => e.nome).join(', ')
            return `• ${f.nome}: ${quem || '(por preencher)'}`
        })
        return [
            `*Escala ${departamento.nome}*`,
            `${evento.nome} — ${diaPorExtenso(evento.data)}, às ${hora(evento.data)}`,
            '',
            ...linhas,
            '',
            'Confirmem na app, por favor. 🙏',
        ].join('\n')
    }, [funcoes, departamento.nome, evento])

    return (
        <div className="space-y-5">
            <Link href="/membros/dashboard" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                <ArrowLeft size={20} aria-hidden /> Escalas
            </Link>

            <header className="space-y-1">
                <p className="text-[15px] font-semibold a-suave">{departamento.nome}</p>
                <h1 className="text-[24px] font-bold leading-tight">{evento.nome}</h1>
                <p className="text-[17px]">{diaPorExtenso(evento.data)}, às {hora(evento.data)}</p>
            </header>

            {funcoes.length === 0 && (
                <p className="a-card p-4 text-[16px] a-suave">Esta equipa ainda não tem funções (ex.: Voz, Teclas). Um administrador cria-as no computador, em Departamentos.</p>
            )}

            <ul className="space-y-3">
                {funcoes.map((f) => (
                    <li key={f.id} className="a-card p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-[19px] font-bold">{f.nome}</h2>
                            <button type="button" className="a-botao a-botao-secundario !min-h-[44px] text-[15px]" onClick={() => setEscolher(f)}>
                                <Plus size={18} aria-hidden /> Escolher
                            </button>
                        </div>
                        {f.escalados.length === 0 ? (
                            <p className="text-[15px]" style={{ color: 'var(--a-aviso)' }}>Ninguém escalado</p>
                        ) : (
                            <ul className="space-y-2">
                                {f.escalados.map((e) => (
                                    <li key={e.escalaId} className="flex items-center justify-between gap-2">
                                        <span className="min-w-0">
                                            <span className="block truncate text-[17px] font-semibold">{e.nome}</span>
                                            <Estado estado={e.estado} />
                                            {e.motivo && <span className="mt-1 block text-[14px] a-suave">{e.motivo}</span>}
                                        </span>
                                        <button type="button" disabled={pendente} className="a-botao a-suave !min-h-[44px] !px-3"
                                            aria-label={`Tirar ${e.nome} de ${f.nome}`}
                                            onClick={() => correr(() => tirarDaEscala(e.escalaId))}>
                                            <X size={20} aria-hidden />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>

            {funcoes.length > 0 && (
                <section className="a-card p-4 space-y-3" aria-labelledby="avisar">
                    <h2 id="avisar" className="text-[19px] font-bold">Avisar a equipa</h2>
                    <p className="text-[15px] a-suave">Quem é escalado recebe logo uma notificação na app. Pode também enviar a escala no WhatsApp.</p>
                    <a href={`https://wa.me/?text=${encodeURIComponent(mensagemWhatsApp)}`} target="_blank" rel="noopener noreferrer"
                        className="a-botao a-botao-principal w-full">
                        <MessageCircle size={20} aria-hidden /> Enviar no WhatsApp
                    </a>
                    <button type="button" disabled={pendente || porConfirmar === 0} className="a-botao a-botao-secundario w-full"
                        onClick={() => correr(async () => {
                            const r = await lembrarQuemNaoConfirmou(evento.id, departamento.id)
                            return r.ok ? { ok: true } : r
                        }, `Lembrete enviado a ${porConfirmar} pessoa${porConfirmar > 1 ? 's' : ''}.`)}>
                        <Bell size={20} aria-hidden /> {porConfirmar > 0 ? `Lembrar quem não confirmou (${porConfirmar})` : 'Todos confirmaram'}
                    </button>
                </section>
            )}

            {aviso && (
                <p role="status" className="text-[15px] font-semibold" style={{ color: aviso.tipo === 'ok' ? 'var(--a-ok)' : 'var(--a-erro)' }}>{aviso.texto}</p>
            )}

            {escolher && (
                <EscolherPessoa
                    funcao={funcoes.find((f) => f.id === escolher.id) ?? escolher}
                    equipa={equipa}
                    pendente={pendente}
                    onFechar={() => setEscolher(null)}
                    onEscalar={(p) => correr(() => escalarNaFuncao(evento.id, departamento.id, escolher.id, p.membroId))}
                    onTirar={(escalaId) => correr(() => tirarDaEscala(escalaId))}
                />
            )}
        </div>
    )
}

function EscolherPessoa({ funcao, equipa, pendente, onFechar, onEscalar, onTirar }: {
    funcao: Funcao
    equipa: PessoaDaEquipa[]
    pendente: boolean
    onFechar: () => void
    onEscalar: (p: PessoaDaEquipa) => void
    onTirar: (escalaId: number) => void
}) {
    // Quem sabe a funcao primeiro; dentro disso, disponiveis antes de quem ja tem
    // outra funcao, e quem nao pode por ultimo.
    const ordem = (p: PessoaDaEquipa) => (p.indisponivel ? 2 : p.noutraFuncao ? 1 : 0)
    const sabem = equipa.filter((p) => p.funcoes.includes(funcao.id)).sort((a, b) => ordem(a) - ordem(b))
    const outros = equipa.filter((p) => !p.funcoes.includes(funcao.id)).sort((a, b) => ordem(a) - ordem(b))

    const Linha = ({ p }: { p: PessoaDaEquipa }) => {
        const escalada = funcao.escalados.find((e) => e.membroId === p.membroId)
        const detalhe = p.indisponivel
            ? { texto: `Não pode: ${p.indisponivel}`, cor: 'var(--a-erro)' }
            : p.noutraFuncao && !escalada
                ? { texto: `Já está em: ${p.noutraFuncao}`, cor: 'var(--a-aviso)' }
                : { texto: haQuanto(p.ultimaVez), cor: 'var(--a-suave)' }
        return (
            <li>
                <button type="button" disabled={pendente}
                    onClick={() => (escalada ? onTirar(escalada.escalaId) : onEscalar(p))}
                    className="a-card a-foco flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left"
                    style={escalada ? { borderColor: 'var(--a-destaque)', background: 'var(--a-destaque-suave)' } : undefined}
                    aria-pressed={!!escalada}>
                    <span className="flex-1 min-w-0">
                        <span className="block truncate text-[17px] font-semibold">{p.nome}</span>
                        <span className="block text-[14px]" style={{ color: detalhe.cor }}>{detalhe.texto}</span>
                    </span>
                    {escalada && <Check size={24} style={{ color: 'var(--a-destaque)' }} aria-label="Escalado" />}
                </button>
            </li>
        )
    }

    return (
        <div className="app-novo fixed inset-0 z-[60] flex flex-col" role="dialog" aria-modal="true" aria-label={`Escolher para ${funcao.nome}`}
            style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
                <h2 className="text-[22px] font-bold">{funcao.nome}</h2>
                <button type="button" onClick={onFechar} className="a-botao a-botao-principal">Feito</button>
            </div>
            <div className="mx-auto w-full max-w-md flex-1 space-y-5 overflow-y-auto px-4 pb-8">
                <p className="text-[15px] a-suave">Toque para escalar. Toque outra vez para tirar.</p>
                {sabem.length > 0 && (
                    <section className="space-y-2">
                        <h3 className="text-[15px] font-semibold a-suave">Fazem {funcao.nome}</h3>
                        <ul className="space-y-2">{sabem.map((p) => <Linha key={p.membroId} p={p} />)}</ul>
                    </section>
                )}
                {outros.length > 0 && (
                    <section className="space-y-2">
                        <h3 className="text-[15px] font-semibold a-suave">Outros da equipa</h3>
                        <ul className="space-y-2">{outros.map((p) => <Linha key={p.membroId} p={p} />)}</ul>
                    </section>
                )}
                {equipa.length === 0 && <p className="text-[16px] a-suave">Esta equipa ainda não tem pessoas.</p>}
            </div>
        </div>
    )
}
