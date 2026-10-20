// As pessoas de uma equipa (departamento): quem lá está e que funções faz.
// Vê quem é da equipa, quem a gere e a administração. Os contactos só aparecem a quem gere;
// quem gere também muda as funções de cada um (sem tirar a pessoa da equipa).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ChevronDown, Mail, Phone, Users } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeGerirEscalasDoDepartamento } from '@/lib/escalas-permissoes'
import AbasEquipa from '@/components/app/AbasEquipa'
import EditarFuncoes from '@/components/app/EditarFuncoes'

export const dynamic = 'force-dynamic'

export default async function EquipaDepartamento({ params }: { params: Promise<{ id: string }> }) {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    const deptoId = Number((await params).id)
    if (!Number.isInteger(deptoId)) redirect('/membros/dashboard')
    const db = getTenantClient(session.tenantId)

    const depto = await db.departamento.findUnique({
        where: { id: deptoId },
        select: {
            id: true, nome: true, lider_id: true, tem_escala: true,
            lider: { select: { id: true, first_name: true, last_name: true } },
            funcoes: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
            integrantes: {
                select: {
                    id: true, membro_id: true,
                    membro: { select: { first_name: true, last_name: true, avatar_file: true, email: true, phone_1: true } },
                    funcoes: { select: { funcao: { select: { id: true, nome: true } } } },
                },
                orderBy: { membro: { first_name: 'asc' } },
            },
        },
    })
    if (!depto) redirect(`/membros/dashboard?error=${encodeURIComponent('Equipa não encontrada.')}`)

    const gere = await podeGerirEscalasDoDepartamento(session, deptoId)
    const souDaEquipa = depto.lider_id === session.membroId || depto.integrantes.some((i) => i.membro_id === session.membroId)
    if (!gere && !souDaEquipa) redirect(`/membros/dashboard?error=${encodeURIComponent('Só quem é desta equipa a pode ver.')}`)

    // De que mais faz parte cada pessoa (ministérios e grupos)
    const ids = depto.integrantes.map((i) => i.membro_id)
    const [outrosDeptos, grupos] = await Promise.all([
        db.integranteDepartamento.findMany({ where: { membro_id: { in: ids } }, select: { membro_id: true, departamento: { select: { id: true, nome: true } } } }),
        db.grupo.findMany({
            where: { OR: [{ membros: { some: { id: { in: ids } } } }, { lideres: { some: { id: { in: ids } } } }] },
            select: { id: true, nome: true, membros: { where: { id: { in: ids } }, select: { id: true } }, lideres: { where: { id: { in: ids } }, select: { id: true } } },
        }),
    ])
    const fazParte = (membroId: number) => [
        ...outrosDeptos.filter((o) => o.membro_id === membroId).map((o) => ({ chave: `d${o.departamento.id}`, nome: o.departamento.nome, lider: false })),
        ...grupos.filter((g) => g.membros.some((m) => m.id === membroId) || g.lideres.some((m) => m.id === membroId))
            .map((g) => ({ chave: `g${g.id}`, nome: g.nome, lider: g.lideres.some((m) => m.id === membroId) })),
    ]

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl space-y-5 px-4 pt-20 pb-28 md:pt-8">
                <Link href={depto.tem_escala ? `/escalas?equipa=${depto.id}` : '/membros/dashboard'} className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] a-suave">
                    <ArrowLeft size={18} aria-hidden /> {depto.tem_escala ? 'Escalas' : 'Início'}
                </Link>
                <header className="space-y-2">
                    <h1 className="text-[24px] font-bold leading-tight">{depto.nome}</h1>
                    <p className="text-[16px] a-suave">
                        {depto.integrantes.length} {depto.integrantes.length === 1 ? 'pessoa' : 'pessoas'}
                        {depto.lider ? ` · Líder: ${depto.lider.first_name} ${depto.lider.last_name}` : ''}
                    </p>
                </header>
                <AbasEquipa deptoId={depto.id} ativa="pessoas" temEscala={depto.tem_escala} />

                {depto.integrantes.length === 0 ? (
                    <p className="a-card flex items-center gap-3 p-5 text-[17px]"><Users size={22} className="a-suave" aria-hidden /> Ainda não há pessoas nesta equipa.</p>
                ) : (
                    <ul className="a-card a-divide">
                        {depto.integrantes.map((i) => {
                            const funcoes = i.funcoes.map((f) => f.funcao)
                            const nome = `${i.membro.first_name} ${i.membro.last_name}`.trim()
                            return (
                                <li key={i.id}>
                                    {/* Tocar na pessoa abre a "janelinha": de que faz parte, contactos e funções */}
                                    <details className="group/p">
                                        <summary className="a-foco flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-[16px] font-bold"
                                                style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }} aria-hidden>
                                                {i.membro.avatar_file ? <img src={i.membro.avatar_file} alt="" className="h-full w-full object-cover" /> : i.membro.first_name[0]}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-[17px] font-semibold">
                                                    {nome}{i.membro_id === depto.lider_id && <span className="ml-2 text-[14px] font-semibold" style={{ color: 'var(--a-destaque)' }}>Líder</span>}
                                                </span>
                                                <span className="block text-[15px] a-suave">{funcoes.map((f) => f.nome).join(', ') || 'Sem função'}</span>
                                            </span>
                                            <ChevronDown size={20} className="shrink-0 a-suave transition-transform group-open/p:rotate-180" aria-hidden />
                                        </summary>
                                        <div className="space-y-3 px-4 pb-4 pl-[4.5rem]">
                                            <div>
                                                <p className="text-[14px] a-suave">Faz parte de</p>
                                                <p className="flex flex-wrap gap-1.5 pt-1">
                                                    {fazParte(i.membro_id).map((x) => (
                                                        <span key={x.chave} className="rounded-full border px-3 py-1 text-[14px]" style={{ borderColor: 'var(--a-borda)' }}>
                                                            {x.nome}{x.lider ? ' · Líder' : ''}
                                                        </span>
                                                    ))}
                                                </p>
                                            </div>
                                            {gere && (i.membro.phone_1 || i.membro.email) && (
                                                <p className="flex flex-wrap gap-4 text-[15px]">
                                                    {i.membro.phone_1 && <a href={`https://wa.me/${i.membro.phone_1.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="a-foco inline-flex items-center gap-1.5 underline"><Phone size={16} aria-hidden /> WhatsApp</a>}
                                                    {i.membro.email && <a href={`mailto:${i.membro.email}`} className="a-foco inline-flex items-center gap-1.5 underline"><Mail size={16} aria-hidden /> Email</a>}
                                                </p>
                                            )}
                                            {gere && depto.funcoes.length > 0 && (
                                                <EditarFuncoes integranteId={i.id} nome={nome} funcoes={depto.funcoes} escolhidas={funcoes.map((f) => f.id)} />
                                            )}
                                        </div>
                                    </details>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </main>
        </div>
    )
}
