// app/membros/mural/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import MuralClient from '@/components/membros/MuralClient'

export default async function MuralPage() {
    const db = await getDb()
    const session = await getSessionData();
    if (!session) redirect('/membros/login');

    // 1. Busca o membro e os grupos/departamentos a que pertence
    const membro = await db.membro.findUnique({
        where: { id: session.membroId },
        include: {
            ministerios: { include: { departamento: true } },
            grupos: true
        }
    });

    if (!membro) redirect('/membros/login');

    const canais = [];

    membro.ministerios?.forEach((vinculo: any) => {
        if (vinculo.departamento) {
            canais.push({ id: `DEP_${vinculo.departamento.id}`, nome: vinculo.departamento.nome, tipo: 'Departamento' });
        }
    });

    membro.grupos?.forEach((grupo: any) => {
        canais.push({ id: `GRP_${grupo.id}`, nome: grupo.nome, tipo: 'Grupo' });
    });

    // Remove canais duplicados (caso tenha 2 cargos no mesmo departamento)
    const canaisUnicos = Array.from(new Map(canais.map(item => [item.id, item])).values());

    // 2. Extrai IDs (Se o seu ID for String, remova o Number())
    const idsDepartamentos = canaisUnicos.filter(c => c.tipo === 'Departamento').map(c => Number(c.id.replace('DEP_', '')));
    const idsGrupos = canaisUnicos.filter(c => c.tipo === 'Grupo').map(c => Number(c.id.replace('GRP_', '')));

    // 3. Busca diretamente no AvisoMural
    const avisos = await db.avisoMural.findMany({
        where: {
            OR: [
                { departamento_id: { in: idsDepartamentos.length > 0 ? idsDepartamentos : [-1] } },
                { grupo_id: { in: idsGrupos.length > 0 ? idsGrupos : [-1] } }
            ]
        },
        include: {
            autor: { select: { id: true, first_name: true, last_name: true, avatar_file: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Traz as últimas 100 mensagens
    });

    return (
        <main className="max-w-6xl mx-auto py-4 md:py-10 px-4 sm:px-6 lg:px-8 space-y-4 md:space-y-8 animate-in fade-in duration-700 h-[calc(100dvh-60px)] md:h-[calc(100vh-80px)] flex flex-col">

            <header className="shrink-0 space-y-4">
                <div className="flex items-center gap-3 md:gap-4 border-b border-soft pb-4 md:pb-6">
                    <div className="p-2.5 md:p-4 bg-figueira/10 text-figueira rounded-xl md:rounded-2xl">
                        <MessageSquare size={18} className="md:hidden" />
                        <MessageSquare size={24} className="hidden md:block" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black italic uppercase tracking-tighter text-fg leading-none">
                            Mural de <span className="text-muted/30">Avisos.</span>
                        </h1>
                        <p className="text-[9px] md:text-xs text-muted font-bold tracking-widest uppercase mt-1">
                            Comunicação interna das tuas equipas.
                        </p>
                    </div>
                </div>
            </header>

            <div className="flex-1 min-h-0">
                {canaisUnicos.length > 0 ? (
                    <MuralClient canais={canaisUnicos} avisos={avisos} membroAtualId={membro.id} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-bg2 border border-dashed border-soft rounded-[3rem]">
                        <MessageSquare size={48} className="text-soft mb-4" />
                        <h3 className="text-lg font-black uppercase tracking-widest text-fg">Sem Canais Disponíveis</h3>
                        <p className="text-xs text-muted font-medium mt-2 max-w-sm">Ainda não estás associado a nenhum Grupo ou Departamento. Fala com a liderança para seres adicionado.</p>
                    </div>
                )}
            </div>
        </main>
    )
}

async function apagarAviso(id: string) {
    try {
        const db = await getDb()
        const session = await getSessionData();
        if (!session) return { error: 'Não autorizado' };

        const aviso = await db.avisoMural.findUnique({ where: { id } });
        if (!aviso) return { error: 'Aviso não encontrado.' };

        // Verifica se é o autor da mensagem ou um Administrador
        if (aviso.autor_id !== session.membroId && session.role !== 'ADMIN') {
            return { error: 'Não tens permissão para apagar esta mensagem.' };
        }

        await db.avisoMural.delete({ where: { id } });

        revalidatePath('/membros/mural');
        revalidatePath('/membros/dashboard');
        return { ok: true };
    } catch (error) {
        console.error(error);
        return { error: 'Erro ao apagar aviso.' };
    }
}