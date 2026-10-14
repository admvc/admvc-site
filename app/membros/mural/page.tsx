// app/membros/mural/page.tsx
import { getDb } from '@/lib/db'
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
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
        <main className="app-novo mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-20 md:pb-10 md:pt-8" style={{ background: 'transparent' }}>
            <div className="space-y-1">
                <h1 className="text-[28px] font-bold leading-tight">Avisos</h1>
                <p className="text-[17px] a-suave">Mensagens dos seus ministérios e grupos.</p>
            </div>

            {canaisUnicos.length > 0 ? (
                <MuralClient canais={canaisUnicos} avisos={avisos} membroAtualId={membro.id} />
            ) : (
                <div className="a-card space-y-2 p-6 text-center">
                    <MessageSquare size={36} className="mx-auto a-suave" aria-hidden />
                    <p className="text-[18px] font-semibold">Ainda sem avisos</p>
                    <p className="text-[16px] a-suave">Os avisos aparecem quando fizer parte de um ministério ou grupo. Fale com a liderança.</p>
                </div>
            )}
        </main>
    )
}
