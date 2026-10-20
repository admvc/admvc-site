// Regras repetidas da agenda: "toda a 1.ª segunda, 20h00, Grupo de Homens", "toda a 3.ª quarta, culto dos Jovens"…
// Criam sozinhas os próximos 3 meses (e o cron diário continua). Administração e Pastor criam para todos os grupos;
// os líderes criam as reuniões e os cultos direcionados dos seus grupos (e as reuniões dos seus departamentos).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, MapPin, Target } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { gereDepartamento } from '@/lib/escalas-permissoes'
import { geralNaAgenda, grupoQueLidero } from '@/lib/agenda-grupos'
import { datasDaRegra, descreverRegra, hojeLisboaISO, somarMeses } from '@/lib/agenda-regras'
import { TIPOS_AGENDA_DEPTO, type TipoAgendaDepto } from '@/lib/agenda'
import { AcoesRegra, FormRegra, type AlvoOpcao, type RegraCliente } from '@/components/app/RegrasAgendaClient'

export const dynamic = 'force-dynamic'

export default async function RegrasAgenda() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    const db = getTenantClient(sessao.tenantId)
    const admin = await geralNaAgenda(sessao)   // administração ou Pastor

    const [grupos, deptos] = await Promise.all([
        db.grupo.findMany({ where: admin ? {} : grupoQueLidero(sessao.membroId), select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
        db.departamento.findMany({ where: admin ? {} : gereDepartamento(sessao.membroId), select: { id: true, nome: true }, orderBy: { nome: 'asc' } }),
    ])
    if (!admin && grupos.length + deptos.length === 0) redirect(`/membros/agenda`)

    const regras = await db.regraAgenda.findMany({
        where: admin ? {} : { OR: [{ grupo_id: { in: grupos.map((g) => g.id) } }, { alvo: 'ENCONTRO', departamento_id: { in: deptos.map((d) => d.id) } }] },
        orderBy: [{ alvo: 'desc' }, { dia_semana: 'asc' }, { semana_do_mes: 'asc' }],
        select: {
            id: true, alvo: true, titulo: true, tipo: true, dia_semana: true, semana_do_mes: true, hora: true, local: true, ativo: true,
            grupo_id: true, departamento_id: true, grupo: { select: { nome: true } }, departamento: { select: { nome: true } },
        },
    })

    const opcoesGrupos: AlvoOpcao[] = grupos.map((g) => ({ chave: `g${g.id}`, nome: g.nome }))
    const opcoesEncontro: AlvoOpcao[] = [...opcoesGrupos, ...deptos.map((d) => ({ chave: `d${d.id}`, nome: d.nome }))]
    const hoje = hojeLisboaISO()
    const dd = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-2xl space-y-6 px-4 pt-20 pb-28 md:pt-8">
                <Link href="/membros/agenda" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] a-suave"><ArrowLeft size={18} aria-hidden /> Agenda</Link>
                <header>
                    <h1 className="text-[24px] font-bold">Encontros que se repetem</h1>
                    <p className="text-[16px] a-suave">Escolha o dia uma vez ("toda a 1.ª segunda") e a agenda fica preenchida sozinha.</p>
                </header>

                <FormRegra opcoesEncontro={opcoesEncontro} opcoesCulto={opcoesGrupos} podeCulto={opcoesGrupos.length > 0} />

                {regras.length === 0 ? <p className="a-card p-5 text-[16px] a-suave">Ainda não há regras.</p> : (
                    <ul className="space-y-3">
                        {regras.map((r) => {
                            const proximas = r.ativo ? datasDaRegra(r, hoje, somarMeses(hoje, 3)).slice(0, 4) : []
                            const cliente: RegraCliente = { ...r, chaveAlvo: r.grupo_id ? `g${r.grupo_id}` : `d${r.departamento_id}` }
                            return (
                                <li key={r.id} className="a-card space-y-1 px-4 py-3">
                                    <p className={`text-[17px] font-semibold ${r.ativo ? '' : 'line-through a-suave'}`}>{r.titulo}{!r.ativo && <span className="ml-2 text-[14px] font-semibold">(parada)</span>}</p>
                                    <p className="text-[15px] a-suave">
                                        {descreverRegra(r)}, às {r.hora} · {r.alvo === 'CULTO' ? 'Culto da igreja' : TIPOS_AGENDA_DEPTO[r.tipo as TipoAgendaDepto] ?? r.tipo} · {r.grupo?.nome ?? r.departamento?.nome}
                                    </p>
                                    {r.alvo === 'CULTO' && <p className="flex items-center gap-1.5 text-[14px] font-semibold" style={{ color: 'var(--a-destaque)' }}><Target size={15} aria-hidden /> Direcionado: {r.grupo?.nome}</p>}
                                    {r.local && <p className="flex items-center gap-1 text-[15px] a-suave"><MapPin size={15} aria-hidden /> {r.local}</p>}
                                    {proximas.length > 0 && <p className="text-[15px]"><span className="font-semibold">Próximas:</span> {proximas.map(dd).join(', ')}</p>}
                                    <AcoesRegra regra={cliente} opcoesEncontro={opcoesEncontro} opcoesCulto={opcoesGrupos} podeCulto={opcoesGrupos.length > 0} />
                                </li>
                            )
                        })}
                    </ul>
                )}
            </main>
        </div>
    )
}
