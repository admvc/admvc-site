'use client'

// "Pedir para retirar esta foto": a foto já está escondida; aqui a Mídia decide.
// Aceitar = apaga a foto (e os ficheiros). Recusar = volta a mostrar-se na galeria.
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import type { PedidoGestao } from '@/lib/fotos-midia'
import { decidirPedido } from './actions'

const quando = (iso: string) => new Date(iso).toLocaleString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(/\./g, '')

export default function Pedidos({ pendentes, recentes }: { pendentes: PedidoGestao[]; recentes: PedidoGestao[] }) {
    const router = useRouter()
    const [ocupado, comecar] = useTransition()
    const [erro, setErro] = useState<string | null>(null)
    const [confirmar, setConfirmar] = useState<number | null>(null)

    function decidir(id: number, aceitar: boolean) {
        setErro(null)
        comecar(async () => {
            const r = await decidirPedido(id, aceitar)
            if ('erro' in r) setErro(r.erro)
            else { setConfirmar(null); router.refresh() }
        })
    }

    return (
        <section className="space-y-4" aria-label="Pedidos para retirar">
            <p className="text-[15px] a-suave">Quem vê o álbum pode pedir para retirar uma foto. Ela fica escondida logo que o pedido chega. <strong>Aceitar</strong> apaga a foto; <strong>Recusar</strong> volta a mostrá-la.</p>
            {erro && <p role="alert" className="text-[15px] font-semibold" style={{ color: 'var(--a-erro, #dc2626)' }}>{erro}</p>}

            {pendentes.length === 0 ? (
                <p className="a-card p-4 a-suave">Não há pedidos à espera.</p>
            ) : (
                <ul className="space-y-3">
                    {pendentes.map((p) => (
                        <li key={p.id} className="a-card p-3">
                            <div className="flex gap-3">
                                {p.mini
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    ? <img src={p.mini} alt="Foto do pedido" className="h-24 w-28 shrink-0 rounded-[12px] object-cover" />
                                    : <span className="block h-24 w-28 shrink-0 rounded-[12px]" style={{ background: 'var(--a-borda)' }} />}
                                <div className="min-w-0 flex-1">
                                    <p className="text-[16px] font-semibold"><Link href={`/midia/fotos/${p.albumId}`} className="underline">{p.albumTitulo}</Link></p>
                                    <p className="text-[14px] a-suave">Pedido em {quando(p.criado_em)}</p>
                                    <p className="mt-1 text-[15px]">{p.motivo ? `“${p.motivo}”` : <span className="a-suave">Sem motivo indicado.</span>}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {confirmar === p.id ? (
                                    <>
                                        <span className="text-[14px] font-semibold">Apagar esta foto para sempre?</span>
                                        <button type="button" disabled={ocupado} onClick={() => decidir(p.id, true)} className="a-botao !min-h-[44px] !px-3 text-[15px]" style={{ background: '#dc2626', color: '#fff' }}>Sim, apagar</button>
                                        <button type="button" onClick={() => setConfirmar(null)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]">Cancelar</button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" disabled={ocupado} onClick={() => setConfirmar(p.id)} className="a-botao a-botao-principal !min-h-[44px] !px-3 text-[15px]"><Check size={17} aria-hidden /> Aceitar (apagar)</button>
                                        <button type="button" disabled={ocupado} onClick={() => decidir(p.id, false)} className="a-botao a-botao-secundario !min-h-[44px] !px-3 text-[15px]"><X size={17} aria-hidden /> Recusar (mostrar outra vez)</button>
                                    </>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {recentes.length > 0 && (
                <details className="a-card p-3">
                    <summary className="a-foco cursor-pointer text-[15px] font-semibold">Decididos há pouco ({recentes.length})</summary>
                    <ul className="a-divide mt-2">
                        {recentes.map((p) => (
                            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[14px]">
                                <span className="truncate">{p.albumTitulo}</span>
                                <span className="a-suave">{p.estado === 'ACEITE' ? 'Aceite (apagada)' : 'Recusado (visível)'} · {p.decidido_em ? quando(p.decidido_em) : ''}</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    )
}
