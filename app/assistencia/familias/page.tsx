// Ação Social: as famílias apoiadas (registo simples) e o que cada uma já recebeu.
// Só a equipa de Assistência Social, o financeiro e a administração (dados pessoais).
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getDb } from '@/lib/db'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { pertenceAEquipa, EQUIPA_SOCIAL } from '@/lib/equipas'
import FamiliasClient from '@/components/assistencia/FamiliasClient'

export const dynamic = 'force-dynamic'

export default async function FamiliasPage() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')
    const pode = isAdmin(session.role) || session.role === 'FINANCE' || await pertenceAEquipa(session.membroId, EQUIPA_SOCIAL)
    if (!pode) redirect(`/membros/dashboard?error=${encodeURIComponent('Acesso restrito à equipa de Assistência Social.')}`)

    const db = await getDb()
    const familias = await db.familiaAssistencia.findMany({
        orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
        include: {
            entregas: { select: { id: true, criado_em: true, tipoCesta: { select: { nome: true } } }, orderBy: { criado_em: 'desc' }, take: 20 },
            movimentos: { select: { id: true, criado_em: true, quantidade: true, item: { select: { nome: true, unidade: true } } }, orderBy: { criado_em: 'desc' }, take: 20 },
        },
    })

    const dados = familias.map((f) => {
        const historico = [
            ...f.entregas.map((e) => ({ chave: `c${e.id}`, data: e.criado_em.toISOString(), texto: `Cabaz: ${e.tipoCesta.nome}` })),
            // movimentos soltos (os dos cabazes já estão na linha do cabaz)
            ...f.movimentos.filter((m) => !f.entregas.some((e) => Math.abs(e.criado_em.getTime() - m.criado_em.getTime()) < 5000))
                .map((m) => ({ chave: `m${m.id}`, data: m.criado_em.toISOString(), texto: `${m.quantidade} ${m.item.unidade} de ${m.item.nome}` })),
        ].sort((a, b) => b.data.localeCompare(a.data))
        return {
            id: f.id, nome: f.nome, telefone: f.telefone, morada: f.morada, pessoas: f.pessoas, notas: f.notas, ativo: f.ativo,
            consentimento: f.consentimento_em.toISOString(), historico,
        }
    })

    return (
        <main className="max-w-4xl mx-auto px-4 pt-20 md:pt-8 pb-28 space-y-6">
            <Link href="/assistencia" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"><ArrowLeft size={16} /> Assistência Social</Link>
            <header>
                <h1 className="text-2xl font-bold text-fg">Famílias apoiadas</h1>
                <p className="text-sm text-muted">{familias.filter((f) => f.ativo).length} ativas. Ao entregar um cabaz ou registar uma saída, escolha a família.</p>
            </header>
            <FamiliasClient familias={dados} />
        </main>
    )
}
