// Modelos de rotina de cada congregação (ex.: "Culto de domingo"), para não
// escrever a rotina do zero em cada culto.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { congregacoesDosModelos, membrosParaEscolher, podeGerirModelos } from '@/lib/rotina-culto-dados'
import { normalizarItens } from '@/lib/rotina-culto'
import ModelosRotina from '@/components/pregacao/ModelosRotina'

export const dynamic = 'force-dynamic'

export default async function ModelosPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login?volta=/pregacao/modelos')
    if (!(await podeGerirModelos(sessao))) redirect('/pregacao')
    const db = getTenantClient(sessao.tenantId)
    const minhas = congregacoesDosModelos(sessao)
    const [modelos, congregacoes, membros] = await Promise.all([
        db.rotinaModelo.findMany({
            where: minhas ? { congregacao_id: { in: minhas } } : {},
            orderBy: [{ congregacao_id: 'asc' }, { nome: 'asc' }],
        }),
        db.congregacao.findMany({ where: minhas ? { id: { in: minhas } } : {}, select: { id: true, nome: true }, orderBy: { id: 'asc' } }),
        membrosParaEscolher(sessao.tenantId),
    ])

    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-2xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href="/pregacao" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> Rotina dos cultos
                </Link>
                <div className="space-y-1">
                    <h1 className="text-[26px] font-bold">Modelos de rotina</h1>
                    <p className="text-[16px] a-suave">Cada congregação tem os seus. Ao fazer a rotina de um culto, pode começar a partir de um modelo.</p>
                </div>
                <ModelosRotina
                    modelos={modelos.map((m) => ({ id: m.id, nome: m.nome, congregacaoId: m.congregacao_id, itens: normalizarItens(m.itens) }))}
                    congregacoes={congregacoes}
                    podeTodas={!minhas}
                    membros={membros}
                />
            </main>
        </div>
    )
}
