'use client'

// Etiquetas da igreja (só Mídia/administração): criar, mudar nome/cor/ícone, apagar, e ver "todas as fotos com a etiqueta X".
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { apagarEtiqueta, criarEtiqueta, guardarEtiqueta } from './actions'

export type EtiquetaLinha = { id: number; nome: string; cor: string; icone: string | null; esconde: boolean; fotos: number }

export default function GestaoEtiquetas({ etiquetas, atual }: { etiquetas: EtiquetaLinha[]; atual: number | null }) {
    const router = useRouter()
    const [pendente, comecar] = useTransition()
    const [erro, setErro] = useState<string | null>(null)
    const [editar, setEditar] = useState<EtiquetaLinha | null>(null)
    const [nova, setNova] = useState({ nome: '', cor: '#2b6cb0', icone: '', esconde: false })

    function correr(fn: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) {
        setErro(null)
        comecar(async () => {
            const r = await fn()
            if (!r.ok) setErro(r.erro ?? 'Não foi possível concluir.')
            else { depois?.(); router.refresh() }
        })
    }

    const campo = 'a-foco min-h-[48px] rounded-[14px] border px-3 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <section className="space-y-4" aria-label="Etiquetas">
            <p className="text-[15px] a-suave">As etiquetas são só para a equipa: o público não as vê. &quot;Não publicar&quot; esconde a foto da galeria. Marque as fotos dentro de cada álbum.</p>
            {erro && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}

            <ul className="space-y-2">
                {etiquetas.map((e) => (
                    <li key={e.id} className="a-card p-3">
                        {editar?.id === e.id ? (
                            <form className="flex flex-wrap items-center gap-2" onSubmit={(ev) => {
                                ev.preventDefault()
                                correr(() => guardarEtiqueta(e.id, editar), () => setEditar(null))
                            }}>
                                <input aria-label="Ícone" value={editar.icone ?? ''} maxLength={8} onChange={(ev) => setEditar({ ...editar, icone: ev.target.value })} className={`${campo} w-16 text-center`} style={estilo} />
                                <input aria-label="Nome" value={editar.nome} maxLength={30} required onChange={(ev) => setEditar({ ...editar, nome: ev.target.value })} className={`${campo} min-w-[9rem] flex-1`} style={estilo} />
                                <input aria-label="Cor" type="color" value={editar.cor} onChange={(ev) => setEditar({ ...editar, cor: ev.target.value })} className="h-12 w-14 rounded-[14px] border" style={{ borderColor: 'var(--a-borda)' }} />
                                <label className="flex min-h-[48px] items-center gap-2 text-[15px]">
                                    <input type="checkbox" checked={editar.esconde} onChange={(ev) => setEditar({ ...editar, esconde: ev.target.checked })} className="h-5 w-5" /> Esconde da galeria
                                </label>
                                <button type="submit" disabled={pendente} className="a-botao a-botao-principal !min-h-[44px] !px-3 text-[15px]">Guardar</button>
                                <button type="button" onClick={() => setEditar(null)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Cancelar</button>
                            </form>
                        ) : (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex min-h-[40px] items-center gap-2 rounded-full px-3 text-[16px] font-semibold text-white" style={{ background: e.cor }}>
                                    {e.icone && <span aria-hidden>{e.icone}</span>} {e.nome}
                                </span>
                                {e.esconde && <span className="text-[13px] a-suave">esconde da galeria</span>}
                                <span className="ml-auto flex flex-wrap items-center gap-2">
                                    <Link href={`/midia/fotos?aba=etiquetas&etiqueta=${e.id}`} aria-current={atual === e.id ? 'true' : undefined}
                                        className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px] aria-[current=true]:ring-2 aria-[current=true]:ring-[var(--a-destaque)]">
                                        Ver as fotos ({e.fotos})
                                    </Link>
                                    <button type="button" onClick={() => setEditar(e)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Mudar</button>
                                    <button type="button" aria-label={`Apagar a etiqueta ${e.nome}`} disabled={pendente}
                                        onClick={() => { if (window.confirm(`Apagar a etiqueta "${e.nome}"? As fotos ficam sem ela.`)) correr(() => apagarEtiqueta(e.id)) }}
                                        className="a-botao a-botao-secundario !min-h-[44px] !px-3" style={{ color: '#dc2626' }}><Trash2 size={17} aria-hidden /></button>
                                </span>
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            <form className="a-card flex flex-wrap items-center gap-2 p-3" onSubmit={(ev) => {
                ev.preventDefault()
                correr(() => criarEtiqueta(nova), () => setNova({ nome: '', cor: '#2b6cb0', icone: '', esconde: false }))
            }}>
                <span className="w-full text-[15px] font-semibold">Nova etiqueta</span>
                <input aria-label="Ícone (emoji)" placeholder="🙂" value={nova.icone} maxLength={8} onChange={(ev) => setNova({ ...nova, icone: ev.target.value })} className={`${campo} w-16 text-center`} style={estilo} />
                <input aria-label="Nome da etiqueta" placeholder="Nome" value={nova.nome} maxLength={30} required onChange={(ev) => setNova({ ...nova, nome: ev.target.value })} className={`${campo} min-w-[9rem] flex-1`} style={estilo} />
                <input aria-label="Cor" type="color" value={nova.cor} onChange={(ev) => setNova({ ...nova, cor: ev.target.value })} className="h-12 w-14 rounded-[14px] border" style={{ borderColor: 'var(--a-borda)' }} />
                <label className="flex min-h-[48px] items-center gap-2 text-[15px]">
                    <input type="checkbox" checked={nova.esconde} onChange={(ev) => setNova({ ...nova, esconde: ev.target.checked })} className="h-5 w-5" /> Esconde da galeria
                </label>
                <button type="submit" disabled={pendente} className="a-botao a-botao-principal"><Plus size={18} aria-hidden /> Criar</button>
            </form>
        </section>
    )
}
