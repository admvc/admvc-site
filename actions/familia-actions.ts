'use server'

import prisma, { getTenantClient } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { requireRole } from '@/lib/auth-utils'

async function getDb() {
    const headersList = await headers();
    const tenantId = headersList.get('x-tenant-id');
    if (!tenantId) throw new Error("Sessão inválida. Igreja não identificada.");
    return { db: getTenantClient(Number(tenantId)), tenantId: Number(tenantId) };
}


export async function criarNovaFamilia(formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const surname = formData.get('surname') as string;

    if (!surname) return { erro: "Nome é obrigatório" };

    try {
        const { db, tenantId } = await getDb();
        await db.familia.create({
            data: {
                surname: surname,
                tenant_id: tenantId
            }
        });

        revalidatePath('/admin/familias');
        return { sucesso: true };
    } catch (e) {
        return { erro: "Erro ao criar família." };
    }
}

export async function removerMembroDaFamilia(membroId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.membro.update({
            where: { id: membroId },
            data: {
                familia_id: null,
                parentesco: null // Limpamos também o parentesco ao sair da família
            }
        });

        revalidatePath('/admin/familias');
        // Importante: revalidar a página de edição também, caso esteja aberta
        revalidatePath('/admin/membros/editar/[id]', 'page');

        return { sucesso: true };
    } catch (error) {
        console.error("Erro ao remover membro:", error);
        return { erro: "Não foi possível remover o membro." };
    }
}

export async function vincularMembroAFamilia(membroId: number, familiaId: number, parentesco: string) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.membro.update({
            where: { id: membroId },
            data: {
                familia_id: familiaId,
                parentesco: parentesco
            }
        });
        revalidatePath('/admin/familias');
        return { sucesso: true };
    } catch (error) {
        return { erro: "Não foi possível vincular o membro." };
    }
}

export async function criarFamiliaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const surname = formData.get('surname') as string;
        const { db, tenantId } = await getDb();

        // 👇 1. A BARREIRA ANTI-DUPLICAÇÃO
        const familiaExiste = await db.familia.findFirst({
            where: {
                surname: {
                    equals: surname.trim(),
                    mode: 'insensitive' // Ignora maiúsculas/minúsculas (Silva == silva)
                }
            }
        });

        if (familiaExiste) {
            return { ok: false, error: `A família "${surname}" já está registada no sistema.` };
        }

        // 2. Se não existir, avança com a criação normal
        const novaFamilia = await db.familia.create({
            data: {
                surname: surname.trim(),
                tenant_id: tenantId
                // ... restantes campos
            }
        });

        // revalidatePath('/admin/familias');
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: "Erro ao criar família." };
    }
}

export async function excluirFamiliaAction(familiaId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        // 1. Encontrar a família e verificar os membros
        const familia = await db.familia.findUnique({
            where: { id: familiaId },
            include: { members: true }
        });

        if (!familia) return { ok: false, error: 'Família não encontrada.' };

        // 2. Se houver membros, removemos o vínculo deles com a família antes de a apagar
        // (Os membros continuam no sistema, apenas ficam "Sem Vínculo")
        if (familia.members.length > 0) {
            await db.membro.updateMany({
                where: { familia_id: familiaId },
                data: {
                    familia_id: null,
                    parentesco: null // Limpa o papel (ex: Pai, Filho) já que não há mais família
                }
            });
        }

        // 3. Exclui a família de vez
        await db.familia.delete({
            where: { id: familiaId }
        });

        revalidatePath('/admin/familias');
        return { ok: true };
    } catch (error: any) {
        console.error("Erro ao excluir família:", error);
        return { ok: false, error: 'Erro interno ao excluir a família.' };
    }
}

export async function buscarMembrosSemFamiliaAction(query: string) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    if (!query || query.length < 2) return [];

    try {
        const { db, tenantId } = await getDb();
        const membros = await db.membro.findMany({
            where: {
                familia_id: null, // Só quem não tem família
                OR: [
                    { first_name: { contains: query, mode: 'insensitive' } },
                    { last_name: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 6, // Só traz os 6 melhores resultados para não pesar
            select: { id: true, first_name: true, last_name: true }
        });

        return membros.map(m => ({
            id: m.id,
            fullName: `${m.first_name} ${m.last_name}`.trim()
        }));
    } catch (error) {
        return [];
    }
}

export async function vincularMembroFamiliaAction(membroId: string, familiaId: string, parentesco: string) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb()

        const [membro, familia] = await Promise.all([
            db.membro.findUnique({ where: { id: parseInt(membroId) }, select: { first_name: true, last_name: true, tenant_id: true } }),
            db.familia.findUnique({ where: { id: parseInt(familiaId) }, select: { surname: true } })
        ])

        await db.membro.update({
            where: { id: parseInt(membroId) },
            data: { familia_id: parseInt(familiaId), parentesco }
        })

        const { audit } = await import('@/lib/audit')
        await audit({
            tenant_id: membro!.tenant_id,
            categoria: 'FAMILIAS',
            acao: 'VINCULAR',
            alvo_id: parseInt(membroId),
            alvo_nome: `${membro?.first_name} ${membro?.last_name}`,
            alvo_tipo: 'MEMBRO',
            descricao: `Membro vinculado a Familia ${familia?.surname} como "${parentesco}"`,
        })

        revalidatePath('/admin/familias')
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao vincular membro.' }
    }
}