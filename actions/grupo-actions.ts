'use server'

//import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getTenantClient } from '@/lib/prisma'
import { getSessionData, requireAuth, isAdmin } from '@/lib/auth-utils'
import { invalidateGrupos } from '@/lib/cache'
import { audit } from '@/lib/audit'
import { getTenantIdFromHeaders } from '@/lib/db'


async function getDb() {
    const tenantId = await getTenantIdFromHeaders()
    if (!tenantId) throw new Error('Tenant não identificado.')
    return { db: getTenantClient(Number(tenantId)), tenantId: Number(tenantId) }
}

/**
 * Gere um grupo: um administrador, ou um dos lideres DESTE grupo. (O papel
 * "LEADER" sozinho nao chega: e o lider de um ministerio, nao do grupo.)
 */
async function exigirGestorDoGrupo(grupoId: number) {
    const sessao = await requireAuth()
    if (isAdmin(sessao.role)) return sessao
    const { db } = await getDb()
    const lidera = await db.grupo.count({ where: { id: grupoId, lideres: { some: { id: sessao.membroId } } } })
    if (!lidera) throw new Error('Só os líderes deste grupo (ou um administrador) podem fazer isto.')
    return sessao
}


export async function registrarEncontroAction(formData: FormData, presentesIds: number[]) {
    try {
        const grupo_id = Number(formData.get('grupo_id'));
        await exigirGestorDoGrupo(grupo_id)
        const data = new Date(formData.get('data') as string);
        const tema = formData.get('tema') as string;

        // Aqui entraria a tua lógica de upload de imagem para a cloud (S3, Supabase, etc)
        // const foto_file = formData.get('foto') as File;
        const foto_url = null; // Substitui pelo link do upload real quando tiveres

        const grupo = await (await getDb()).db.grupo.findUnique({
            where: { id: grupo_id },
            select: { tenant_id: true }
        });

        if (!grupo) return { sucesso: false, erro: "Grupo não encontrado." };

        await (await getDb()).db.encontroGrupo.create({
            data: {
                tenant_id: grupo.tenant_id,
                grupo_id,
                data,
                tema,
                foto_url,
                presentes: {
                    connect: presentesIds.map(id => ({ id }))
                }
            }
        });

        revalidatePath(`/grupos/gestao/${grupo_id}`);
        return { sucesso: true };
    } catch (error: any) {
        console.error("Erro ao registar encontro:", error);
        return { sucesso: false, erro: error?.message?.startsWith("Só os líderes") ? error.message : "Falha ao gravar o encontro." };
    }
}

export async function atualizarDadosGrupoAction(formData: FormData) {
    try {
        const id = Number(formData.get('grupo_id'));
        await exigirGestorDoGrupo(id)
        const dia_semana = formData.get('dia_semana') as string;
        const horario = formData.get('horario') as string;
        const endereco = formData.get('endereco') as string;
        const numero = formData.get('numero') as string;
        const bairro = formData.get('bairro') as string;
        const cidade = formData.get('cidade') as string;
        const estado = formData.get('estado') as string;
        const pais = formData.get('pais') as string;

        await (await getDb()).db.grupo.update({
            where: { id },
            data: {
                dia_semana,
                horario,
                endereco,
                numero,
                bairro,
                cidade,
                estado,
                pais
            }
        });

        revalidatePath(`/grupos/gestao/${id}`);
        invalidateGrupos(await getTenantIdFromHeaders()).catch(() => {})
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false, erro: error instanceof Error ? error.message : "Erro ao atualizar dados." };
    }
}

export async function gerirMembroGrupoAction(grupoId: number, membroId: number, acao: 'ADICIONAR' | 'REMOVER') {
    try {
        await exigirGestorDoGrupo(grupoId)
        const tenantId = await getTenantIdFromHeaders()
        // A pessoa tem de ser desta igreja
        const daIgreja = await (await getDb()).db.membro.count({ where: { id: membroId } })
        if (!daIgreja) return { sucesso: false, erro: 'Membro não encontrado.' }
        if (acao === 'ADICIONAR') {
            await (await getDb()).db.grupo.update({
                where: { id: grupoId },
                data: { membros: { connect: { id: membroId } } }
            });
        } else {
            await (await getDb()).db.grupo.update({
                where: { id: grupoId },
                data: { membros: { disconnect: { id: membroId } } }
            });
        }
        audit({ tenant_id: tenantId, categoria: 'GRUPOS', acao: acao === 'ADICIONAR' ? 'VINCULAR' : 'DESVINCULAR', alvo_id: grupoId, alvo_tipo: 'GRUPO', descricao: `Membro #${membroId} ${acao === 'ADICIONAR' ? 'adicionado ao' : 'removido do'} grupo #${grupoId}` }).catch(() => {})
        revalidatePath(`/grupos/gestao/${grupoId}`);
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false, erro: error instanceof Error ? error.message : "Erro ao processar membro." };
    }
}

export async function registarEncontro(formData: FormData) {
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, error: 'Sessão expirada.' }

        const { db, tenantId } = await getDb()

        const grupo_id = Number(formData.get('grupo_id'))
        const tema = formData.get('tema') as string
        const data = new Date(formData.get('data') as string)
        const foto_url = formData.get('foto_url') as string | null
        const presentes_ids = formData.getAll('presentes_ids').map(Number).filter(Boolean)

        console.log('🟡 [ACTION registarEncontro] grupo_id:', grupo_id)
        console.log('🟡 [ACTION registarEncontro] tema:', tema)
        console.log('🟡 [ACTION registarEncontro] data:', data)
        console.log('🟡 [ACTION registarEncontro] foto_url:', foto_url)
        console.log('🟡 [ACTION registarEncontro] presentes_ids:', presentes_ids)

        if (!grupo_id || !tema || !data) {
            console.error('❌ [ACTION registarEncontro] Dados incompletos')
            return { sucesso: false, error: 'Dados incompletos.' }
        }

        if (session.role !== 'ADMIN') {
            const grupo = await db.grupo.findFirst({
                where: {
                    id: grupo_id,
                    tenant_id: tenantId,
                    lideres: { some: { id: session.membroId } }
                }
            })
            if (!grupo) {
                console.error('❌ [ACTION registarEncontro] Sem permissão')
                return { sucesso: false, error: 'Sem permissão para registar encontros neste grupo.' }
            }
        }

        const encontro = await db.encontroGrupo.create({
            data: {
                grupo_id,
                tenant_id: tenantId,
                tema,
                data,
                // ✅ foto_url guardada corretamente
                foto_url: foto_url || null,
                ...(presentes_ids.length > 0 && {
                    presentes: {
                        connect: presentes_ids.map(id => ({ id }))
                    }
                })
            }
        })

        console.log('✅ [ACTION registarEncontro] Encontro criado:', encontro.id, '| foto_url:', encontro.foto_url)

        audit({ tenant_id: tenantId, categoria: 'GRUPOS', acao: 'CRIAR', alvo_id: encontro.id, alvo_tipo: 'GRUPO', descricao: `Encontro registado no grupo #${grupo_id}` }).catch(() => {})

        revalidatePath('/membros/dashboard')
        return { sucesso: true }

    } catch (error: any) {
        console.error('❌ [ACTION registarEncontro] Exceção:', error?.message || error)
        return { sucesso: false, error: 'Erro interno do servidor.' }
    }
}

export async function atualizarHorarioGrupo(formData: FormData) {
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, error: 'Sessão expirada.' }

        const { db, tenantId } = await getDb()

        const grupo_id = Number(formData.get('grupo_id'))
        const dia_semana = formData.get('dia_semana') as string
        const horario = formData.get('horario') as string

        if (!grupo_id || !dia_semana || !horario) {
            return { sucesso: false, error: 'Dados incompletos.' }
        }

        if (session.role !== 'ADMIN') {
            const grupo = await db.grupo.findFirst({
                where: {
                    id: grupo_id,
                    tenant_id: tenantId,
                    lideres: { some: { id: session.membroId } }
                }
            })
            if (!grupo) return { sucesso: false, error: 'Sem permissão para editar este grupo.' }
        }

        await db.grupo.update({
            where: { id: grupo_id },
            data: { dia_semana, horario }
        })

        audit({ tenant_id: tenantId, categoria: 'GRUPOS', acao: 'EDITAR', alvo_id: grupo_id, alvo_tipo: 'GRUPO', descricao: `Horário do grupo #${grupo_id} atualizado` }).catch(() => {})

        revalidatePath('/membros/dashboard')
        return { sucesso: true }

    } catch (error: any) {
        console.error('❌ [ACTION atualizarHorarioGrupo] Exceção:', error?.message || error)
        return { sucesso: false, error: 'Erro interno do servidor.' }
    }
}