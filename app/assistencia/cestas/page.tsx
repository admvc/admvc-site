import { getDb } from '@/lib/db'
import { getSessionData, isAdmin as isAdminCheck } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { HeartHandshake, Package, ChevronRight, Plus, AlertTriangle } from 'lucide-react'
import CestasClient from '@/components/assistencia/CestasClient'

export const dynamic = 'force-dynamic'

export default async function CestasPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login?error=Sessao expirada')

    const db = await getDb()

    const membroLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        include: {
            ministerios: { include: { departamento: true } },
            departamentos_liderados: true,
        }
    })
    if (!membroLogado) redirect('/membros/login')

    const isAdmin = isAdminCheck(session.role)
    const isFinance = session.role === 'FINANCE'
    const termosDepto = ['social', 'despensa', 'assist']
    const isEquipaSocial = membroLogado.ministerios.some((vinculo: any) => {
        const nomeDepto = vinculo.departamento?.nome.toLowerCase() || ''
        return termosDepto.some(t => nomeDepto.includes(t))
    })
    const isLiderSocial = isAdmin || isFinance || membroLogado.departamentos_liderados.some((d: any) =>
        termosDepto.some(t => d.nome.toLowerCase().includes(t))
    )

    if (!isAdmin && !isFinance && !isEquipaSocial && !isLiderSocial) {
        redirect('/membros/dashboard?error=Acesso restrito a equipa de Assistencia Social.')
    }

    const [tiposCesta, itensStock, entregas] = await Promise.all([
        db.tipoCesta.findMany({
            include: {
                itens: { include: { item: true } },
                _count: { select: { entregas: true } },
            },
            orderBy: { nome: 'asc' },
        }),
        db.itemAssistenciaSocial.findMany({
            orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
            select: { id: true, nome: true, stock: true, unidade: true, categoria: true },
        }),
        db.entregaCesta.findMany({
            include: { tipoCesta: { select: { nome: true } } },
            orderBy: { criado_em: 'desc' },
            take: 20,
        }),
    ])

    const cestasSerializadas = tiposCesta.map(c => ({
        ...c,
        criado_em: c.criado_em.toISOString(),
        itens: c.itens.map(ic => ({
            ...ic,
            item: { ...ic.item, criado_em: ic.item.criado_em.toISOString() },
        })),
    }))

    const entregasSerializadas = entregas.map(e => ({
        ...e,
        criado_em: e.criado_em.toISOString(),
    }))

    return (
        <main className="max-w-4xl mx-auto pt-16 md:py-10 px-4 sm:px-6 lg:px-8 space-y-5 md:space-y-8 animate-in fade-in duration-700 pb-28 md:pb-32">
            <header className="space-y-1 md:space-y-2">
                <Link href="/assistencia" className="text-figueira font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] flex items-center gap-2 hover:brightness-125 transition-all">
                    <HeartHandshake size={13} /> Assistencia Social
                </Link>
                <h1 className="text-xl md:text-4xl font-black italic uppercase tracking-tighter text-fg">
                    Cestas Basicas
                </h1>
            </header>

            <CestasClient
                tiposCesta={cestasSerializadas}
                itensStock={itensStock}
                entregas={entregasSerializadas}
                podeGerir={isLiderSocial}
            />
        </main>
    )
}
