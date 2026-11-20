// Mídia → Rotina do culto: as definições do alerta das artes e do botão "Iniciar o culto" do Holyrics, e o histórico de cada início.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { configDaIgreja, historicoInicios } from '@/lib/rotina-alertas'
import RotinaCultoForm from '@/components/midia/RotinaCultoForm'

export const dynamic = 'force-dynamic'

const quando = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const diaCulto = (iso: string) => new Date(iso).toLocaleString('pt-PT', { timeZone: 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default async function RotinaDoCulto() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a Mídia e a administração.')}`)
    const [cfg, historico] = await Promise.all([configDaIgreja(sessao.tenantId), historicoInicios(sessao.tenantId)])

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl space-y-6 px-4 pt-20 pb-10 md:pt-8">
                <header className="space-y-1">
                    <Link href="/midia/divulgacao" className="a-foco inline-flex min-h-[44px] items-center text-[16px] font-semibold underline">← Divulgação do culto</Link>
                    <h1 className="text-[24px] font-bold">Rotina do culto</h1>
                    <p className="text-[16px] a-suave">O alerta das artes (véspera e dia do culto) e o que o botão &quot;Iniciar o culto&quot; do Holyrics usa.</p>
                </header>

                <RotinaCultoForm inicial={cfg} />

                <section className="space-y-3" aria-labelledby="hist">
                    <h2 id="hist" className="text-[19px] font-bold">Inícios de culto</h2>
                    {historico.length === 0 ? (
                        <p className="text-[16px] a-suave">Ainda ninguém carregou em &quot;Iniciar o culto&quot; no Holyrics.</p>
                    ) : (
                        <ul className="space-y-3">
                            {historico.map((h) => (
                                <li key={h.id} className="a-card space-y-2 p-4">
                                    <p className="text-[16px]">
                                        <strong>{h.evento ? `${h.evento.nome} · ${diaCulto(h.evento.data)}` : 'Culto'}</strong><br />
                                        <span className="a-suave">{h.operador || 'Holyrics'} · {quando(h.criadoEm)} · {h.ok ? 'tudo certo' : 'com falhas'}</span>
                                    </p>
                                    <ul className="space-y-1">
                                        {h.passos.map((p, i) => (
                                            <li key={`${p.id}-${i}`} className="flex items-start gap-2 text-[15px]">
                                                {p.ok ? <Check size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--a-sucesso, #2e7d32)' }} aria-label="feito" /> : <X size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--a-perigo, #c0392b)' }} aria-label="falhou" />}
                                                <span className="min-w-0"><strong>{p.nome}</strong>{p.mensagem ? <span className="a-suave"> — {p.mensagem}</span> : null}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    )
}
