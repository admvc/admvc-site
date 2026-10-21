// Agenda para a Mídia: escolher a semana / o mês (e a casa) e gerar a imagem para o telão, a imagem
// para as redes sociais ou a versão para imprimir (visitantes ou relatório).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Download, MonitorPlay, Printer, Smartphone } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeFazerAgenda } from '@/lib/agenda-midia'
import { lerMes, nomeDoMes, segundaDaSemana } from '@/lib/agenda'
import { TEMAS_AGENDA, lerTema } from '@/lib/agenda-temas'

export const dynamic = 'force-dynamic'

export default async function AgendaMidia({ searchParams }: { searchParams: Promise<{ semana?: string; mes?: string; c?: string; tema?: string; disposicao?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerAgenda(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a Mídia e a administração fazem a agenda.')}`)
    const q = await searchParams
    const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon' }).format(new Date())
    const semana = segundaDaSemana(q.semana && /^\d{4}-\d{2}-\d{2}$/.test(q.semana) ? q.semana : hoje)
    const mes = lerMes(q.mes, hoje)
    const c = Number(q.c) || null
    const congregacoes = await getTenantClient(sessao.tenantId).congregacao.findMany({ select: { id: true, nome: true }, orderBy: { nome: 'asc' } })
    const tema = lerTema(q.tema)
    const cartoes = q.disposicao === 'cartoes'
    const casa = (c ? `&c=${c}` : '') + `&tema=${tema.id}`
    const telao = `/api/agenda/imagem?formato=telao&semana=${semana}${casa}`
    const redes = `/api/agenda/imagem?formato=redes&mes=${mes}${casa}${cartoes ? '&disposicao=cartoes' : ''}`
    const campo = 'a-foco min-h-[48px] rounded-[14px] border px-3 text-[16px]'
    const estilo = { background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-4xl space-y-6 px-4 pt-20 pb-28 md:pt-8">
                <header>
                    <h1 className="text-[24px] font-bold">Agenda para divulgar</h1>
                    <p className="text-[16px] a-suave">Os eventos vêm da Agenda da igreja. Mude lá o que estiver errado e volte aqui.</p>
                    <Link href="/midia/divulgacao" className="a-foco mt-2 inline-flex min-h-[44px] items-center text-[16px] font-semibold underline">Artes de um culto (oração, boas-vindas, oferta, Palavra) →</Link>
                </header>

                <form className="a-card flex flex-wrap items-end gap-3 p-4">
                    <label className="space-y-1"><span className="block text-[15px] font-semibold">Semana (telão)</span>
                        <input type="date" name="semana" defaultValue={semana} className={campo} style={estilo} /></label>
                    <label className="space-y-1"><span className="block text-[15px] font-semibold">Mês (redes e impressão)</span>
                        <input type="month" name="mes" defaultValue={mes} className={campo} style={estilo} /></label>
                    {congregacoes.length > 1 && (
                        <label className="space-y-1"><span className="block text-[15px] font-semibold">Casa</span>
                            <select name="c" defaultValue={c ?? ''} className={campo} style={estilo}>
                                <option value="">Todas</option>
                                {congregacoes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                            </select></label>
                    )}
                    <label className="space-y-1"><span className="block text-[15px] font-semibold">Redes</span>
                        <select name="disposicao" defaultValue={cartoes ? 'cartoes' : ''} className={campo} style={estilo}>
                            <option value="">Calendário do mês</option>
                            <option value="cartoes">Cartões (só os dias com eventos)</option>
                        </select></label>
                    <fieldset className="w-full space-y-1">
                        <legend className="text-[15px] font-semibold">Modelo</legend>
                        <div className="flex flex-wrap gap-2">
                            {TEMAS_AGENDA.map((t) => (
                                <label key={t.id} className="flex min-h-[48px] cursor-pointer items-center gap-2 rounded-[14px] border px-3 has-[:checked]:ring-2 has-[:checked]:ring-[var(--a-acento,#f5a524)]" style={estilo}>
                                    <input type="radio" name="tema" value={t.id} defaultChecked={t.id === tema.id} className="sr-only" />
                                    <span aria-hidden className="flex h-7 w-10 overflow-hidden rounded-md border" style={{ borderColor: 'var(--a-borda)' }}>
                                        <span className="flex-1" style={{ background: t.amostra[0] }} /><span className="w-3" style={{ background: t.amostra[1] }} />
                                    </span>
                                    <span className="text-[15px]">{t.nome}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <button className="a-botao a-botao-principal">Atualizar</button>
                </form>

                <section className="space-y-2">
                    <h2 className="flex items-center gap-2 text-[19px] font-bold"><MonitorPlay size={22} aria-hidden /> Telão · semana de {semana.slice(8)}/{semana.slice(5, 7)}</h2>
                    <img src={`${telao}&previa=1`} alt="Programação da semana para o telão" className="w-full rounded-xl border" style={{ borderColor: 'var(--a-borda)', aspectRatio: '16 / 9' }} />
                    <a href={`${telao}&download=1`} className="a-botao a-botao-secundario !min-h-[44px]"><Download size={18} aria-hidden /> Descarregar (1920×1080)</a>
                </section>

                <section className="space-y-2">
                    <h2 className="flex items-center gap-2 text-[19px] font-bold first-letter:uppercase"><Smartphone size={22} aria-hidden /> Redes sociais · {nomeDoMes(mes)}</h2>
                    <img src={`${redes}&previa=1`} alt="Programação mensal para as redes sociais" className="w-full max-w-md rounded-xl border" style={{ borderColor: 'var(--a-borda)', aspectRatio: '4 / 5' }} />
                    <a href={`${redes}&download=1`} className="a-botao a-botao-secundario !min-h-[44px]"><Download size={18} aria-hidden /> Descarregar (1080×1350)</a>
                </section>

                <section className="space-y-2">
                    <h2 className="flex items-center gap-2 text-[19px] font-bold"><Printer size={22} aria-hidden /> Imprimir</h2>
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/midia/agenda/imprimir?formato=visitante&mes=${mes}${casa}`} className="a-botao a-botao-secundario !min-h-[44px]">Para visitantes</Link>
                        <Link href={`/midia/agenda/imprimir?formato=relatorio&mes=${mes}${casa}`} className="a-botao a-botao-secundario !min-h-[44px]">Relatório (tabela)</Link>
                    </div>
                </section>
            </main>
        </div>
    )
}
