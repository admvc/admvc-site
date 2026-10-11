// app/escalas/admin/novo/page.tsx
import { getDb } from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ChevronLeft, Calendar as CalendarIcon, Users } from 'lucide-react'
import Link from 'next/link'
import GestaoEscalasDepto from '@/components/admin/GestaoEscalasDepto'

export default async function NovaEscalaPage({ searchParams }: { searchParams: { depto?: string } }) {
    const db = await getDb()
    const cookieStore = await cookies()
    const session = cookieStore.get('admvc_session')
    if (!session) redirect('/membros/login')

    const deptoId = searchParams.depto ? parseInt(searchParams.depto) : null;
    if (!deptoId) redirect('/membros/dashboard')

    // 1. Busca o Departamento, Membros e Escalas Atuais
    const departamento = await db.departamento.findUnique({
        where: { id: deptoId || 0 },
        include: {
            integrantes: {
                include: { membro: true },
                orderBy: { membro: { first_name: 'asc' } }
            },
            funcoes: true, // BUSCA AS FUNÇÕES PRÉ-CADASTRADAS (ex: Camera, Som, etc)
            escalas: {
                where: { evento: { data: { gte: new Date() } } },
                include: { evento: true, membro: true },
                orderBy: { evento: { data: 'asc' } }
            }
        }
    });

    const membrosUnicos = Array.from(new Map(
        departamento?.integrantes.map(item => [item.membro.id, item.membro])
    ).values());

    // 2. Busca Eventos para o formulário
    const eventos = await db.evento.findMany({
        where: { data: { gte: new Date() } },
        orderBy: { data: 'asc' }
    })

    if (!departamento) redirect('/membros/dashboard')
    console.log("MEMBROS ENCONTRADOS:", JSON.stringify(departamento?.integrantes, null, 2));
    return (
        <main className="max-w-7xl mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-700">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <Link href="/membros/dashboard" className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase hover:text-figueira transition-all">
                        <ChevronLeft size={14} /> Voltar ao Início
                    </Link>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-fg">
                        Gestão: <span className="text-figueira">{departamento.nome}</span>
                    </h1>
                </div>
                <div className="hidden md:flex items-center gap-4 bg-bg2 p-4 rounded-2xl border border-soft">
                    <Users className="text-muted" size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-fg">
                        {departamento.integrantes.length} Voluntários
                    </span>
                </div>
            </header>

            {/* O NOVO COMPONENTE DE GESTÃO COMPLETA */}
            <GestaoEscalasDepto
                departamento={departamento}
                eventos={eventos}
                escalasIniciais={departamento.escalas}
            />
        </main>
    )
}