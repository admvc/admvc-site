import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import POSClient from '@/components/cantina/POSClient'
import { ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function POSPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    const { membroId, role } = session

    const db = await getDb()

    // Verificar permissao: admin, lider cantina, ou integrante com funcao de caixa/gestao
    const admin = isAdmin(role)

    let temPermissao = admin

    if (!temPermissao) {
        // Verificar se e lider do departamento Cantina
        const lideraCantina = await db.departamento.findFirst({
            where: {
                lider_id: membroId,
                nome: { contains: 'Cantina', mode: 'insensitive' },
            },
        })
        if (lideraCantina) temPermissao = true
    }

    if (!temPermissao) {
        // Verificar se e integrante da Cantina com pode_gerir_escalas (delegacao de lider)
        // ou com funcao de caixa
        const integranteCantina = await db.integranteDepartamento.findFirst({
            where: {
                membro_id: membroId,
                departamento: { nome: { contains: 'Cantina', mode: 'insensitive' } },
            },
            include: {
                funcoes: {
                    include: { funcao: true },
                },
            },
        })

        if (integranteCantina) {
            // Tem permissao se pode gerir escalas (delegacao) ou se tem funcao de caixa
            const temFuncaoCaixa = integranteCantina.funcoes.some(
                f => f.funcao.nome.toLowerCase().includes('caixa') ||
                     f.funcao.nome.toLowerCase().includes('responsavel') ||
                     f.funcao.nome.toLowerCase().includes('responsável')
            )
            if (integranteCantina.pode_gerir_escalas || temFuncaoCaixa) {
                temPermissao = true
            }
        }
    }

    // Verificar se tem escala activa na Cantina para hoje
    if (!temPermissao) {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000)

        const escalaCantina = await db.escala.findFirst({
            where: {
                membro_id: membroId,
                departamento: { nome: { contains: 'Cantina', mode: 'insensitive' } },
                evento: { data: { gte: hoje, lt: amanha } },
            },
        })
        if (escalaCantina) temPermissao = true
    }

    if (!temPermissao) {
        return (
            <main className="max-w-lg mx-auto py-20 px-6 text-center space-y-6">
                <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto">
                    <ShieldCheck size={28} />
                </div>
                <h1 className="text-2xl font-black italic uppercase tracking-tighter text-fg">Acesso Restrito</h1>
                <p className="text-sm text-muted max-w-sm mx-auto">
                    O ponto de venda so esta disponivel para membros da Cantina com funcao de caixa,
                    lideres do departamento, ou administradores.
                </p>
                <Link href="/membros/dashboard" className="btn btn-ghost inline-flex">
                    Voltar ao Dashboard
                </Link>
            </main>
        )
    }

    // Buscar turno aberto do operador
    const turnoAberto = await db.turnoCantina.findFirst({
        where: { operador_id: membroId, status: 'ABERTO' },
        select: { id: true },
    })

    const [produtos, categorias, membros] = await Promise.all([
        db.produtoCantina.findMany({
            where: {
                disponivel: true,
                OR: [
                    { controla_stock: false },
                    { stock: { gt: 0 } },
                ],
            },
            include: { categoria: true },
            orderBy: [{ categoria: { ordem: 'asc' } }, { nome: 'asc' }],
        }),
        db.categoriaCantina.findMany({
            where: { ativa: true },
            orderBy: { ordem: 'asc' },
        }),
        db.membro.findMany({
            where: { is_active: true },
            select: { id: true, first_name: true, last_name: true },
            orderBy: { first_name: 'asc' },
        }),
    ])

    const produtosData = produtos.map(p => ({
        ...p,
        promocoes: (p.promocoes as Array<{quantidade: number, preco_total: number}> | null) ?? null,
        criado_em: p.criado_em.toISOString(),
        atualizado_em: p.atualizado_em.toISOString(),
        categoria: p.categoria ? { ...p.categoria, criado_em: p.categoria.criado_em.toISOString() } : null,
    }))

    return <POSClient produtos={produtosData} categorias={categorias.map(c => ({ ...c, criado_em: c.criado_em.toISOString() }))} membros={membros} turnoId={turnoAberto?.id ?? null} />
}
