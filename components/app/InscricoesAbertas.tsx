// Início da app: eventos com inscrições abertas. Quem já se inscreveu vê o
// estado, o código e o que falta pagar; quem não, o botão "Inscrever-me".
import Link from 'next/link'
import prisma from '@/lib/prisma'
import type { SessionData } from '@/lib/auth-utils'
import { inscricoesAbertas, conviteDivulgado, dataDoEvento } from '@/lib/inscricoes'
import { mesmoTelefone } from '@/lib/visitante-registo'
import { ClipboardList } from 'lucide-react'
import QRCode from 'react-qr-code'
import CartaoFechavel from './CartaoFechavel'

export default async function InscricoesAbertas({ sessao }: { sessao: SessionData }) {
    const [eventos, membro] = await Promise.all([
        prisma.eventoInscricao.findMany({
            where: { tenant_id: sessao.tenantId, estado: 'ABERTO' },
            orderBy: { inicio: 'asc' },
            select: {
                id: true, slug: true, titulo: true, inicio: true, inscricoes_ate: true, estado: true, local: true,
                preco_eur: true, pagamento: true, cor_principal: true, convite_visivel: true, divulgar_em: true, mostrar_preco: true,
                inscricoes: { where: { estado: { not: 'CANCELADA' } }, select: { membro_id: true, telefone: true, estado: true, pago: true, codigo: true } },
            },
        }),
        prisma.membro.findUnique({ where: { id: sessao.membroId }, select: { phone_1: true, phone_2: true } }),
    ])
    const abertos = eventos.filter(e => inscricoesAbertas(e) && conviteDivulgado(e))
    if (abertos.length === 0) return null

    return (
        <section className="space-y-3" aria-label="Inscrições abertas">
            {abertos.map(e => {
                const minha = e.inscricoes.find(i => i.membro_id === sessao.membroId
                    || mesmoTelefone(i.telefone, membro?.phone_1) || mesmoTelefone(i.telefone, membro?.phone_2))
                const { dia, hora } = dataDoEvento(e.inicio)
                const cobra = e.mostrar_preco && !!e.preco_eur && e.preco_eur > 0
                return (
                    <CartaoFechavel key={e.id} id={`inscricao-${e.slug}`} titulo={e.titulo}>
                    <article className="a-card p-4 space-y-3" style={{ borderColor: e.cor_principal, borderWidth: 2 }}>
                        <div className="flex items-start gap-3 pr-20">
                            <ClipboardList size={24} style={{ color: e.cor_principal }} className="shrink-0 mt-0.5" aria-hidden />
                            <div className="min-w-0">
                                <p className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: e.cor_principal }}>
                                    {minha ? 'A tua inscrição' : 'Inscrições abertas'}
                                </p>
                                <h2 className="text-[19px] font-bold leading-tight">{e.titulo}</h2>
                                <p className="text-[15px] a-suave first-letter:uppercase">{dia} · {hora}{e.local ? ` · ${e.local}` : ''}</p>
                            </div>
                        </div>
                        {minha ? (
                            <div className="flex items-start gap-3">
                            <div className="space-y-1 text-[16px] flex-1 min-w-0">
                                <p>
                                    <strong>{minha.estado === 'CONFIRMADA' ? 'Confirmada ✅' : 'Recebida: a organização vai confirmar'}</strong>
                                    {' · '}código <strong className="tracking-widest">{minha.codigo}</strong>
                                </p>
                                {cobra && (minha.pago
                                    ? <p>Pagamento recebido. Obrigado!</p>
                                    : <p>Falta pagar {e.preco_eur!.toLocaleString('pt-PT')} €{e.pagamento ? ` (${e.pagamento})` : ''}, com o código na descrição.</p>)}
                                <p className="text-[14px] a-suave">Mostra o QR à entrada.</p>
                            </div>
                            <div className="shrink-0 rounded-lg bg-white p-2">
                                <QRCode value={minha.codigo} size={84} fgColor="#3B2A22" aria-label={`QR do código ${minha.codigo}`} />
                            </div>
                            </div>
                        ) : (
                            <Link href={`/i/${e.slug}`} className="a-botao !min-h-[48px] w-full text-white" style={{ background: e.cor_principal }}>
                                Inscrever-me{cobra ? ` · ${e.preco_eur!.toLocaleString('pt-PT')} €` : ''}
                            </Link>
                        )}
                    </article>
                    </CartaoFechavel>
                )
            })}
        </section>
    )
}
