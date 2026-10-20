// A minha família: as pessoas registadas na mesma família que eu (foto, função na igreja, aniversário, telefone).
// Só leitura: quem muda os dados é a secretaria ou cada pessoa no seu perfil.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Cake, Phone } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function MinhaFamilia() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    const db = getTenantClient(sessao.tenantId)

    const eu = await db.membro.findFirst({ where: { id: sessao.membroId }, select: { familia: { select: { id: true, surname: true } } } })
    const familia = eu?.familia ?? null
    const pessoas = familia
        ? await db.membro.findMany({
            where: { familia_id: familia.id },
            orderBy: [{ birthdate: 'asc' }, { first_name: 'asc' }],
            select: { id: true, first_name: true, last_name: true, avatar_file: true, church_role: true, birthdate: true, phone_1: true },
        })
        : []

    // Aniversário: "12 de março" (a data de nascimento está em UTC, sem hora)
    const aniversario = (d: Date | null) => d ? d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : null

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-md space-y-6 px-4 pt-20 pb-28 md:pt-8">
                <header>
                    <h1 className="text-[24px] font-bold">{familia ? `Família ${familia.surname}` : 'A minha família'}</h1>
                    <p className="text-[16px] a-suave">As pessoas da sua casa registadas na igreja.</p>
                </header>

                {!familia && (
                    <p className="a-card p-5 text-[16px] a-suave">
                        Ainda não está numa família registada. Peça à secretaria para o(a) juntar à sua família.
                    </p>
                )}

                <ul className="space-y-3">
                    {pessoas.map((p) => (
                        <li key={p.id} className="a-card flex items-center gap-3 p-3">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full text-[18px] font-bold" style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }} aria-hidden>
                                {p.avatar_file
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={p.avatar_file} alt="" className="h-full w-full object-cover" />
                                    : `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[17px] font-semibold">{p.first_name} {p.last_name}{p.id === sessao.membroId ? ' (eu)' : ''}</span>
                                {p.church_role && <span className="block text-[14px] a-suave">{p.church_role}</span>}
                                {aniversario(p.birthdate) && <span className="flex items-center gap-1 text-[14px] a-suave"><Cake size={14} aria-hidden /> {aniversario(p.birthdate)}</span>}
                                {p.phone_1 && <a href={`tel:${p.phone_1.replace(/\s/g, '')}`} className="a-foco flex min-h-[32px] items-center gap-1 text-[14px] font-semibold"><Phone size={14} aria-hidden /> {p.phone_1}</a>}
                            </span>
                        </li>
                    ))}
                </ul>

                <Link href={`/membros/perfil/editar/${sessao.membroId}`} className="a-foco inline-flex min-h-[44px] items-center text-[16px] a-suave">← O meu perfil</Link>
            </main>
        </div>
    )
}
