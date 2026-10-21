// Escalas de um ministerio (como no LouveApp): os cultos por dia, com a equipa
// de cada um. Vista de lista ou calendario. Botoes no topo para trocar de ministerio.
import SeletorMinisterio, { nomeCurto } from '@/components/app/SeletorMinisterio'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { CalendarDays, CalendarX2, List } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import { cultosDoMinisterio, meusMinisterios } from '@/lib/ministerios-app'
import CartaoCulto from '@/components/app/CartaoCulto'
import CalendarioEscalas from '@/components/app/CalendarioEscalas'
import AbasEquipa from '@/components/app/AbasEquipa'
import LembrarMinisterio from '@/components/app/LembrarMinisterio'
import ModalRelatorioEscalas from '@/components/membros/ModalRelatorioEscalas'
import ModalRelatorioLouvor from '@/components/louvor/ModalRelatorioLouvor'
import { chaveDoDia, daquiA, diaDaSemana, diaEMes } from '@/components/app/datas'

export const dynamic = 'force-dynamic'

export default async function EscalasPage(props: { searchParams: Promise<{ equipa?: string; quando?: string; vista?: string }> }) {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    const { equipa, quando: q, vista: v } = await props.searchParams
    const quando = q === 'anteriores' ? 'anteriores' : 'proximas'
    const vista = v === 'calendario' ? 'calendario' : (v === 'lista' ? 'lista' : undefined)

    const ministerios = await meusMinisterios(sessao)
    const guardado = Number((await cookies()).get('admvc_ministerio')?.value)
    const atual =
        ministerios.find((m) => m.id === Number(equipa)) ??
        ministerios.find((m) => m.id === guardado) ??
        ministerios.find((m) => m.minhas > 0) ??
        ministerios[0]

    if (!atual) {
        return (
            <div className="app-novo min-h-screen">
                <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 md:pt-8">
                    <h1 className="text-[24px] font-bold">Escalas</h1>
                    <p className="a-card mt-4 p-5 text-[17px]">Ainda não faz parte de nenhum ministério. Fale com o seu líder.</p>
                </main>
            </div>
        )
    }

    const gere = await podeGerirEscalasDoDepartamento(sessao, atual.id)
    const cultos = await cultosDoMinisterio(sessao, atual.id, quando, gere)

    // Agrupar por dia
    const dias: { chave: string; data: string; cultos: typeof cultos }[] = []
    for (const c of cultos) {
        const chave = chaveDoDia(c.data)
        const dia = dias.find((d) => d.chave === chave)
        if (dia) dia.cultos.push(c)
        else dias.push({ chave, data: c.data, cultos: [c] })
    }

    const separador = (ativo: boolean) =>
        `a-foco flex-1 rounded-[12px] py-2 text-center text-[15px] font-semibold ${ativo ? '' : 'a-suave'}`

    return (
        <div className="app-novo min-h-screen">
            <LembrarMinisterio id={atual.id} />
            <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <header className="flex items-center justify-between gap-3">
                    <h1 className="text-[24px] font-bold leading-tight">Escalas</h1>
                    {ministerios.length > 1
                        ? <SeletorMinisterio ministerios={ministerios.map((m) => ({ id: m.id, nome: m.nome }))} atual={atual.id} quando={quando} />
                        : <p className="truncate text-[16px] a-suave">{nomeCurto(atual.nome)}</p>}
                </header>
                <AbasEquipa deptoId={atual.id} ativa="escalas" />

                <div className="flex items-center gap-2">
                    <div className="flex flex-1 gap-1 rounded-[14px] p-1" style={{ background: 'var(--a-borda)' }} role="tablist">
                        {(['proximas', 'anteriores'] as const).map((k) => (
                            <Link key={k} role="tab" aria-selected={quando === k}
                                href={`/escalas?equipa=${atual.id}${k === 'anteriores' ? '&quando=anteriores' : ''}${vista === 'calendario' ? '&vista=calendario' : ''}`}
                                className={separador(quando === k)} style={quando === k ? { background: 'var(--a-card)' } : undefined}>
                                {k === 'proximas' ? 'Próximas' : 'Anteriores'}
                            </Link>
                        ))}
                    </div>
                    <Link href={`/escalas?equipa=${atual.id}${quando === 'anteriores' ? '&quando=anteriores' : ''}&vista=${vista === 'calendario' ? 'lista' : 'calendario'}`}
                        className="a-foco flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border"
                        style={{ borderColor: 'var(--a-borda)', background: 'var(--a-card)' }}
                        title={vista === 'calendario' ? 'Ver como lista' : 'Ver como calendário'}
                        aria-label={vista === 'calendario' ? 'Ver como lista' : 'Ver como calendário'}>
                        {vista === 'calendario' ? <List size={20} aria-hidden /> : <CalendarDays size={20} aria-hidden />}
                    </Link>
                </div>

                {vista === 'calendario' ? (
                    <CalendarioEscalas cultos={cultos} deptoId={atual.id} eLouvor={atual.eLouvor} />
                ) : dias.length === 0 ? (
                    <p className="a-card flex items-center gap-3 p-5 text-[17px]">
                        <CalendarX2 size={22} aria-hidden className="a-suave" />
                        {quando === 'proximas' ? 'Não há escalas nas próximas semanas.' : 'Ainda não há escalas anteriores.'}
                    </p>
                ) : (
                    dias.map((d) => {
                        const { dia, mes } = diaEMes(d.data)
                        return (
                            <section key={d.chave} className="space-y-2" aria-label={`${diaDaSemana(d.data)}, ${dia} ${mes}`}>
                                <h2 className="flex items-baseline gap-2 text-[15px] a-suave">
                                    <span className="text-[22px] font-bold" style={{ color: 'var(--a-texto)' }}>{dia}</span>
                                    <span className="font-semibold capitalize">{mes}</span>
                                    <span>· {diaDaSemana(d.data)} · {daquiA(d.data)}</span>
                                </h2>
                                <div className="grid gap-3 md:grid-cols-2">
                                    {d.cultos.map((c) => <CartaoCulto key={c.id} culto={c} deptoId={atual.id} eLouvor={atual.eLouvor} gere={gere} />)}
                                </div>
                            </section>
                        )
                    })
                )}

                {/* Relatorios (estavam no menu antigo "Meu perfil") */}
                <section className="flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: 'var(--a-borda)' }} aria-label="Relatórios">
                    <span className="text-[15px] font-semibold a-suave">Relatórios:</span>
                    <ModalRelatorioEscalas membroId={sessao.membroId} />
                    {atual.eLouvor && gere && <ModalRelatorioLouvor />}
                </section>
            </main>
        </div>
    )
}
