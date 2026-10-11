// actions/admin-actions.ts
'use server'

// 🔄 MUDANÇA 1: Importamos o global e a função multitenant
import prismaGlobal, { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { put } from "@vercel/blob";
import { audit, diffCampos, sanitizar } from '@/lib/audit'
import { geocodificarComFallback } from '@/lib/geocode'
import { invalidateDepartamentos, invalidateGrupos, invalidateTenant } from '@/lib/cache'
import { requireAuth, requireRole } from '@/lib/auth-utils'

async function getDb() {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    if (!tenantId) throw new Error('Igreja nao identificada.')
    return { db: getTenantClient(Number(tenantId)), tenantId: Number(tenantId) }
}




export async function criarCargo(formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const nome = formData.get('nome') as string;
    if (!nome) return;
    await prismaGlobal.cargo.create({ data: { nome } });
    revalidatePath('/admin/configuracoes');
}

export async function buscarCargos() {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        return await prismaGlobal.cargo.findMany({ orderBy: { nome: 'asc' } });
    } catch (error) {
        return [];
    }
}

export async function excluirCargo(id: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    await prismaGlobal.cargo.delete({ where: { id } });
    revalidatePath('/admin/configuracoes');
}

export async function aprovarMembro(membroId: number, adminNome: string) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.membro.update({
            where: { id: membroId },
            data: { status: "ATIVO", data_admissao: new Date(), aprovado_por: adminNome }
        });

        revalidatePath('/admin/dashboard');
        revalidatePath('/admin/membros');
        return { sucesso: true };
    } catch (error) {
        return { erro: "Falha ao aprovar membro." };
    }
}

export async function criarDepartamento(formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const nome = formData.get('nome') as string;
    if (!nome) return;

    const congId = formData.get('congregacaoId')
    const congregacaoId = congId ? Number(congId) : null
    const isGlobal = !congregacaoId

    const { db, tenantId } = await getDb();
    await db.departamento.create({
        data: {
            nome,
            tenant_id: tenantId,
            congregacaoId,
            is_global: isGlobal,
        }
    });
    revalidatePath('/admin/configuracoes');
    invalidateDepartamentos(tenantId).catch(() => {})
}

export async function criarGrupo(formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const { db, tenantId } = await getDb();
    const departamento_id = formData.get('departamento_id');
    const data_abertura = formData.get('data_abertura') as string;
    const lideresIds = formData.getAll('lideres_ids').map(Number);
    const membrosIds = formData.getAll('membros_ids').map(Number);

    await db.grupo.create({
        data: {
            nome: formData.get('nome') as string,
            tenant_id: tenantId,
            dia_semana: formData.get('dia_semana') as string,
            horario: formData.get('horario') as string,
            perfil: formData.get('perfil') as string,
            categoria: formData.get('categoria') as string,
            descricao: formData.get('descricao') as string,
            endereco: formData.get('endereco') as string,
            numero: formData.get('numero') as string,
            bairro: formData.get('bairro') as string,
            cidade: formData.get('cidade') as string,
            lideres: { connect: lideresIds.map((id: number) => ({ id })) },
            membros: { connect: membrosIds.map((id: number) => ({ id })) },
            estado: formData.get('estado') as string,
            pais: (formData.get('pais') as string) || "Portugal",
            data_abertura: data_abertura ? new Date(data_abertura) : new Date(),
            departamento_id: departamento_id ? Number(departamento_id) : null,
        } as any
    });

    revalidatePath('/admin/configuracoes');
    invalidateGrupos(tenantId).catch(() => {})
}

export async function excluirGrupo(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.grupo.delete({ where: { id: id } });
        revalidatePath("/admin/configuracoes");
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false };
    }
}

export async function vincularMembrosAoGrupo(grupoId: number, membrosIds: number[], lideresIds: number[]) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.grupo.update({
            where: { id: grupoId },
            data: {
                membros: { set: membrosIds.map(id => ({ id })) },
                lideres: { set: lideresIds.map(id => ({ id })) }
            }
        });

        revalidatePath("/admin/configuracoes");
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false };
    }
}

export async function salvarEvento(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const id = formData.get("id") as string | null;
        const nome = formData.get("nome") as string;
        const dataStr = formData.get("data") as string;
        const descricao = formData.get("descricao") as string;

        const dados = { nome, data: new Date(dataStr), descricao };

        if (id) {
            await db.evento.update({
                where: { id: Number(id) },
                data: dados
            });
        } else {
            await db.evento.create({
                data: { ...dados, tenant_id: tenantId }
            });
        }

        revalidatePath("/escalas/admin");
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false };
    }
}

export async function removerEscala(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.escala.delete({ where: { id } });
        revalidatePath("/escalas/admin");
        return { sucesso: true };
    } catch (error) {
        return { sucesso: false };
    }
}

export async function gerarLinkWhatsapp(escalaId: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const { db, tenantId } = await getDb();
    const escala = await db.escala.findUnique({
        where: { id: escalaId },
        include: { membro: true, evento: true, departamento: true }
    });

    if (!escala || !escala.membro.phone_1) return null;

    const dataFormatada = new Date(escala.evento.data).toLocaleDateString('pt-PT', { weekday: 'long', day: '2-digit', month: 'long' });
    const horaFormatada = new Date(escala.evento.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    const mensagem = `Olá, *${escala.membro.first_name}*! 👋%0A%0A` +
        `Passamos para lembrar que você está escalado para servir na *ADMVC*:%0A%0A` +
        `📅 *Data:* ${dataFormatada}%0A` +
        `⏰ *Hora:* ${horaFormatada}%0A` +
        `📍 *Local:* Auditório Principal%0A` +
        `🎸 *Departamento:* ${escala.departamento.nome}%0A` +
        `💪 *Função:* ${escala.funcao}%0A%0A` +
        `Poderia confirmar sua presença no nosso portal?%0A` +
        `🔗 https://seusite.com/membros`;

    const telefone = escala.membro.phone_1.replace(/\D/g, '');
    return `https://wa.me/${telefone}?text=${mensagem}`;
}

export async function salvarGrupo(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb()
        const idRaw = formData.get('id')
        const id = idRaw ? Number(idRaw) : null

        const cidade = formData.get('cidade') as string || null
        const endereco = formData.get('endereco') as string || null
        const numero = formData.get('numero') as string || null
        const pais = formData.get('pais') as string || 'Portugal'
        const regiao = formData.get('regiao') as string || null
        const publico = formData.get('publico') === 'on' || formData.get('publico') === 'true'

        // ── GEOCODIFICAÇÃO ──
        let latitude: number | null = null
        let longitude: number | null = null

        if (cidade) {
            try {
                const { geocodificarComFallback } = await import('@/lib/geocode')
                const moradaCompleta = [endereco, numero].filter(Boolean).join(' ') || null
                const coords = await geocodificarComFallback(moradaCompleta, cidade, pais)
                if (coords) {
                    latitude = coords.latitude
                    longitude = coords.longitude
                    console.log(`[GRUPO] Geocodificado: ${latitude}, ${longitude}`)
                }
            } catch (err: any) {
                console.error('[GRUPO] Erro geocode:', err.message)
                // Nao bloqueia o save
            }
        }

        const lideresIds = formData.getAll('lideres_ids').map(Number).filter(id => id > 0)
        const membrosIds = formData.getAll('membros_ids').map(Number).filter(id => id > 0)

        const baseData: any = {
            nome: formData.get('nome') as string,
            categoria: formData.get('categoria') as string || null,
            dia_semana: formData.get('dia_semana') as string || null,
            horario: formData.get('horario') as string || null,
            perfil: formData.get('perfil') as string || null,
            endereco,
            numero,
            bairro: formData.get('bairro') as string || null,
            cidade,
            estado: formData.get('estado') as string || null,
            pais,
            descricao: formData.get('descricao') as string || null,
            regiao,
            publico,
            ...(latitude !== null && { latitude }),
            ...(longitude !== null && { longitude }),
        }

        if (id) {
            await db.grupo.update({
                where: { id },
                data: {
                    ...baseData,
                    lideres: { set: lideresIds.map(id => ({ id })) },
                    membros: { set: membrosIds.map(id => ({ id })) },
                }
            })
        } else {
            await db.grupo.create({
                data: {
                    ...baseData,
                    tenant_id: tenantId,
                    lideres: { connect: lideresIds.map(id => ({ id })) },
                    membros: { connect: membrosIds.map(id => ({ id })) },
                }
            })
        }

        revalidatePath('/admin/configuracoes')
        revalidatePath('/grupos/admin')
        revalidatePath('/grupos')
        return { sucesso: true }

    } catch (error: any) {
        console.error('[SALVAR GRUPO] Erro:', error.message)
        return { sucesso: false, error: error.message }
    }
}

export async function salvarEscala(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const membro_id = Number(formData.get("membro_id"));
        const evento_id = Number(formData.get("evento_id"));
        const departamento_id = Number(formData.get("departamento_id"));
        const funcao = formData.get("funcao") as string;

        await db.escala.create({
            data: { membro_id, evento_id, departamento_id, funcao, tenant_id: tenantId, }
        });

        revalidatePath('/escalas/admin');
        return { ok: true };
    } catch (error) {
        return { ok: false, error: "Erro ao salvar" };
    }
}

export async function removerFuncaoDoDepartamento(id: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const { db, tenantId } = await getDb();
    await db.funcaoDepartamento.delete({ where: { id } });
    revalidatePath("/admin/configuracoes");
}

export async function atualizarDepartamento(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const id = Number(formData.get("id"));
        const nome = formData.get("nome") as string;
        const descricao = formData.get("descricao") as string;
        const liderInput = formData.get("lider_id");
        const lider_id = liderInput ? Number(liderInput) : null;

        const congIdStr = formData.get("congregacaoId") as string;
        const congregacaoId = congIdStr ? Number(congIdStr) : null;
        const is_global = !congregacaoId;

        await db.departamento.update({
            where: { id },
            data: { nome, descricao, lider_id: lider_id === 0 ? null : lider_id, congregacaoId, is_global }
        });

        revalidatePath("/admin/configuracoes");
        return { ok: true };
    } catch (error) {
        return { ok: false };
    }
}

export async function uploadFotoDepartamento(departamentoId: number, formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db } = await getDb()
        const file = formData.get('file') as File | null
        if (!file) return { ok: false, error: 'Nenhum ficheiro enviado.' }

        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
        if (!tiposPermitidos.includes(file.type)) {
            return { ok: false, error: 'Tipo nao permitido. Use JPG, PNG ou WEBP.' }
        }
        if (file.size > 5 * 1024 * 1024) {
            return { ok: false, error: 'Ficheiro demasiado grande (max 5MB).' }
        }

        // Comprimir e redimensionar antes do upload
        const { comprimirImagem } = await import('@/lib/image-utils')
        const arrayBuffer = await file.arrayBuffer()
        const comprimido = await comprimirImagem(Buffer.from(arrayBuffer), {
            maxWidth: 1200,
            maxHeight: 800,
            quality: 80,
        })

        const filename = `departamentos/depto_${departamentoId}_foto.webp`

        const blob = await put(filename, comprimido, {
            access: 'public',
            contentType: 'image/webp',
        })

        await db.departamento.update({
            where: { id: departamentoId },
            data: { foto_url: blob.url },
        })

        revalidatePath('/admin/configuracoes')
        return { ok: true, url: blob.url }
    } catch (error: any) {
        console.error('[UPLOAD DEPTO] Erro:', error)
        return { ok: false, error: `Erro ao fazer upload: ${error.message || 'erro desconhecido'}` }
    }
}

export async function adicionarFuncaoAoDepto(formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const { db, tenantId } = await getDb();
    const nome = formData.get("nome") as string;
    const departamento_id = Number(formData.get("departamento_id"));

    await db.funcaoDepartamento.create({ data: { nome, departamento_id, tenant_id: tenantId, } });
    revalidatePath("/admin/configuracoes");
}

export async function removerFuncaoDoDepto(id: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const { db, tenantId } = await getDb();
    await db.funcaoDepartamento.delete({ where: { id } });
    revalidatePath("/admin/configuracoes");
    return { ok: true };
}

export async function buscarEquipaPorDepartamentoId(deptoId: number) {
    try {
        const session = await requireAuth()
        const { db } = await getDb()
        const eAdmin = ['ADMIN', 'CONGREGATION_ADMIN'].includes(session.role)

        // Se nao e admin, verifica se e lider/delegado do departamento
        let podVerFuncoes = eAdmin
        if (!eAdmin) {
            const vinculo = await db.integranteDepartamento.findFirst({
                where: {
                    membro_id: session.membroId,
                    departamento_id: deptoId,
                    OR: [
                        { pode_gerir_escalas: true },
                        { funcoes: { some: { funcao: { nome: { contains: 'Lider', mode: 'insensitive' as const } } } } }
                    ]
                }
            })
            podVerFuncoes = !!vinculo
        }

        const integrantes = await db.integranteDepartamento.findMany({
            where: { departamento_id: deptoId },
            include: {
                membro: { select: { id: true, first_name: true, last_name: true, avatar_file: true, phone_1: true } },
                ...(podVerFuncoes ? { funcoes: { include: { funcao: true } } } : {}),
            },
            orderBy: { membro: { first_name: 'asc' } }
        })
        return { ok: true, data: integrantes }
    } catch (error) {
        return { ok: false, error: "Erro ao carregar a equipa." }
    }
}

export async function gerarEventosLoteAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const nome = formData.get('nome') as string;
        const diaDaSemana = Number(formData.get('diaDaSemana'));
        const frequencia = formData.get('frequencia') as string;
        const horario = formData.get('horario') as string;
        const mesesDuracao = Number(formData.get('meses'));

        const hoje = new Date();
        const dataFim = new Date();
        dataFim.setMonth(hoje.getMonth() + mesesDuracao);

        const eventosParaCriar = [];
        let dataAtual = new Date(hoje);
        const [horas, minutos] = horario.split(':');
        dataAtual.setHours(Number(horas), Number(minutos), 0, 0);

        while (dataAtual <= dataFim) {
            if (dataAtual.getDay() === diaDaSemana) {
                let isMatch = false;
                const diaDoMes = dataAtual.getDate();
                const semanaDoMes = Math.ceil(diaDoMes / 7);

                if (frequencia === 'TODAS') isMatch = true;
                else if (frequencia === 'ULTIMO') {
                    const proximaSemana = new Date(dataAtual);
                    proximaSemana.setDate(diaDoMes + 7);
                    if (proximaSemana.getMonth() !== dataAtual.getMonth()) isMatch = true;
                } else if (frequencia === semanaDoMes.toString()) isMatch = true;

                if (isMatch) eventosParaCriar.push({ nome, data: new Date(dataAtual) });
            }
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        await db.evento.createMany({ data: eventosParaCriar });
        revalidatePath('/escalas/admin');
        return { ok: true, totalCriado: eventosParaCriar.length };
    } catch (error: any) {
        return { ok: false, error: error.message };
    }
}

export async function criarEventoUnificadoAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const tipo = formData.get('tipo') as string;
        const nome = formData.get('nome') as string;
        const horario = formData.get('horario') as string;
        const tipo_evento = (formData.get('tipo_evento') as string) || 'CULTO_REGULAR'
        const congIdStr = formData.get('congregacao_id') as string;
        const congregacao_id = congIdStr ? Number(congIdStr) : null;
        const [horas, minutos] = horario.split(':');

        if (tipo === 'UNICO') {
            const dataString = formData.get('dataUnica') as string;
            const dataEvento = new Date(dataString);
            dataEvento.setHours(Number(horas), Number(minutos), 0, 0);

            await db.evento.create({ data: { nome, data: dataEvento, tipo: tipo_evento, tenant_id: tenantId, congregacao_id } });
            revalidatePath('/escalas/admin');
            return { ok: true, totalCriado: 1 };
        }

        if (tipo === 'CONTINUO') {
            const diaDaSemana = Number(formData.get('diaDaSemana'));
            const frequencia = formData.get('frequencia') as string;
            const mesesDuracao = Number(formData.get('meses'));

            const hoje = new Date();
            const dataFim = new Date();
            dataFim.setMonth(hoje.getMonth() + mesesDuracao);

            const eventosParaCriar = [];
            let dataAtual = new Date(hoje);
            dataAtual.setHours(Number(horas), Number(minutos), 0, 0);

            while (dataAtual <= dataFim) {
                if (dataAtual.getDay() === diaDaSemana) {
                    let isMatch = false;
                    const diaDoMes = dataAtual.getDate();
                    const semanaDoMes = Math.ceil(diaDoMes / 7);

                    if (frequencia === 'TODAS') isMatch = true;
                    else if (frequencia === 'ULTIMO') {
                        const proximaSemana = new Date(dataAtual);
                        proximaSemana.setDate(diaDoMes + 7);
                        if (proximaSemana.getMonth() !== dataAtual.getMonth()) isMatch = true;
                    } else if (frequencia === semanaDoMes.toString()) isMatch = true;

                    if (isMatch) eventosParaCriar.push({ nome, data: new Date(dataAtual), tipo: tipo_evento, congregacao_id });
                }
                dataAtual.setDate(dataAtual.getDate() + 1);
            }

            await db.evento.createMany({ data: eventosParaCriar });
            revalidatePath('/escalas/admin');
            return { ok: true, totalCriado: eventosParaCriar.length };
        }
        return { ok: false, error: "Tipo de evento inválido." };
    } catch (error: any) {
        return { ok: false, error: error.message };
    }
}

export async function criarEscala(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const evento_id = Number(formData.get('evento_id'));
        const departamento_id = Number(formData.get('departamento_id'));
        const membro_id = Number(formData.get('membro_id'));
        const funcao = formData.get('funcao') as string;
        const horario = formData.get('horario') as string;

        const jaEscalado = await db.escala.findFirst({
            where: { evento_id, membro_id, departamento_id }
        });

        if (jaEscalado) return { error: "Este voluntário já está escalado para este departamento neste evento." };

        await db.escala.create({
            data: { evento_id, departamento_id, membro_id, funcao, horario, confirmado: false, tenant_id: tenantId, }
        });

        revalidatePath(`/escalas/gestao/${evento_id}`);
        revalidatePath(`/escalas/admin`);
        revalidatePath(`/membros/dashboard`);
        return { ok: true };
    } catch (error: any) {
        if (error.code === 'P2002') return { error: "Este voluntário já está escalado para este culto/evento." };
        return { error: "Ocorreu um erro ao registar a escala na base de dados." };
    }
}

export async function associarMembroAFamilia(membroId: number, familiaId: number, parentesco: string) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.membro.update({
            where: { id: membroId },
            data: { familia_id: familiaId, parentesco: parentesco }
        });
        revalidatePath('/admin/familias');
        return { sucesso: true };
    } catch (e) {
        return { erro: "Falha ao associar membro." };
    }
}

export async function removerEscalaAction(id: number) {
    try {
        const session = await requireAuth()
        const { db, tenantId } = await getDb();

        // Admin ou CONGREGATION_ADMIN pode sempre
        const isAdminRole = session.role === 'ADMIN' || session.role === 'CONGREGATION_ADMIN'
        if (!isAdminRole) {
            // Verifica se é líder ou delegado do departamento da escala
            const escala = await db.escala.findUnique({ where: { id }, select: { departamento_id: true } })
            if (!escala) return { error: 'Escala não encontrada.' }
            const depto = await db.departamento.findUnique({ where: { id: escala.departamento_id }, select: { lider_id: true } })
            const vinculo = await db.integranteDepartamento.findFirst({
                where: { membro_id: session.membroId, departamento_id: escala.departamento_id, pode_gerir_escalas: true }
            })
            if (depto?.lider_id !== session.membroId && !vinculo) {
                return { error: 'Sem permissão para remover desta escala.' }
            }
        }

        await db.escala.delete({ where: { id } });
        revalidatePath('/escalas/gestao');
        return { ok: true };
    } catch (error) {
        return { error: "Erro ao remover voluntário." };
    }
}

export async function atualizarEscalaAction(formData: FormData) {
    try {
        const session = await requireAuth()
        const { db, tenantId } = await getDb();
        const id = Number(formData.get('id'));

        // Admin ou CONGREGATION_ADMIN pode sempre
        const isAdminRole = session.role === 'ADMIN' || session.role === 'CONGREGATION_ADMIN'
        if (!isAdminRole) {
            const escala = await db.escala.findUnique({ where: { id }, select: { departamento_id: true } })
            if (!escala) return { error: 'Escala não encontrada.' }
            const depto = await db.departamento.findUnique({ where: { id: escala.departamento_id }, select: { lider_id: true } })
            const vinculo = await db.integranteDepartamento.findFirst({
                where: { membro_id: session.membroId, departamento_id: escala.departamento_id, pode_gerir_escalas: true }
            })
            if (depto?.lider_id !== session.membroId && !vinculo) {
                return { error: 'Sem permissão para editar esta escala.' }
            }
        }

        const funcao = formData.get('funcao') as string;
        const horario = formData.get('horario') as string;

        await db.escala.update({
            where: { id },
            data: { funcao, horario }
        });
        revalidatePath('/escalas/gestao');
        return { ok: true };
    } catch (error) {
        return { error: "Erro ao atualizar a escala." };
    }
}

export async function excluirDepartamento(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.departamento.delete({ where: { id } });
        revalidatePath('/admin/configuracoes');
        invalidateDepartamentos(tenantId).catch(() => {})
        return { ok: true };
    } catch (error: any) {
        if (error.code === 'P2003') return { ok: false, error: "Não é possível excluir: existem membros vinculados." };
        return { ok: false, error: "Erro ao excluir o departamento." };
    }
}

export async function vincularMembroDepartamento(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const membroId = Number(formData.get('membro_id'));
        const deptoId = Number(formData.get('departamento_id'));

        // Lê TODOS os inputs ocultos gerados pelo formulário (o array de IDs das funções)
        const funcoesIdsStrings = formData.getAll('funcoes_ids');
        const funcoesIds = funcoesIdsStrings.map(id => Number(id));

        if (!membroId || !deptoId || funcoesIds.length === 0) {
            return { error: "Dados incompletos. Selecione membro e cargos." };
        }

        const { db } = await getDb(); // ou prisma

        // 1. OBTER O TENANT_ID DO DEPARTAMENTO (Correção P2003)
        // Precisamos saber a que tenant este departamento pertence para colocar o membro no mesmo tenant.
        const departamentoInfo = await db.departamento.findUnique({
            where: { id: deptoId },
            select: { tenant_id: true }
        });

        if (!departamentoInfo || !departamentoInfo.tenant_id) {
            return { error: "Erro de integridade: Departamento não tem um Tenant associado." };
        }

        // 2. GARANTIR QUE O MEMBRO ESTÁ NO DEPARTAMENTO
        let integrante = await db.integranteDepartamento.findFirst({
            where: { membro_id: membroId, departamento_id: deptoId },
        })

        if (!integrante) {
            integrante = await (db as any).integranteDepartamento.create({
                data: {
                    membro_id: membroId,
                    departamento_id: deptoId,
                    pode_gerir_escalas: false,
                    tenant_id: departamentoInfo.tenant_id,
                },
            })
        }

        // 3. ADICIONAR OS MÚLTIPLOS CARGOS (Na tabela FuncaoSelecionada)
        let inseridos = 0;

        for (const fId of funcoesIds) {
            // Verifica se o membro já tem ESTE cargo específico para não duplicar
            const funcaoExiste = await db.funcaoSelecionada.findFirst({
                where: {
                    integrante_departamento_id: integrante.id,
                    funcao_id: fId
                }
            });

            // Se não tiver o cargo, adiciona!
            if (!funcaoExiste) {
                await db.funcaoSelecionada.create({
                    data: {
                        integrante_departamento_id: integrante.id,
                        funcao_id: fId
                    }
                });
                inseridos++;
            }
        }

        console.log(`✅ Concluído! O membro foi vinculado e ${inseridos} novos cargos foram atribuídos.`);

        // 4. Atualizar a interface
        revalidatePath('/admin/departamentos');
        return { ok: true };

    } catch (error: any) {
        console.error("Erro geral na action de vincular:", error);
        return { error: "Não foi possível vincular o membro aos cargos." };
    }
}

export async function removerMembroDepartamento(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.integranteDepartamento.delete({ where: { id } });
        revalidatePath("/admin/departamentos/gerenciar");
        return { ok: true };
    } catch (error) {
        return { ok: false, error: "Erro ao remover voluntário." };
    }
}

export async function adicionarFuncaoAoDepartamento(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const nome = formData.get("nome") as string;
        const departamento_id = Number(formData.get("departamento_id"));

        await db.funcaoDepartamento.create({ data: { nome, departamento_id, tenant_id: tenantId, } });
        revalidatePath("/admin/configuracoes");
        return { ok: true };
    } catch (error) {
        return { ok: false, error: "Erro ao adicionar nova função." };
    }
}

export async function buscarMembrosPorDepartamento(deptoId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const integrantes = await db.integranteDepartamento.findMany({
            where: { departamento_id: deptoId },
            include: {
                membro: { select: { id: true, first_name: true, last_name: true } },
                funcoes: { include: { funcao: true } }
            }
        });

        return integrantes.map(i => ({
            id: i.membro.id,
            nome: `${i.membro.first_name} ${i.membro.last_name}`,
            funcaoPadrao: (i as any).funcoes?.[0]?.funcao?.nome || 'Membro'
        }));
    } catch (error) {
        return [];
    }
}

export async function salvarDepartamento(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const idRaw = formData.get("id");
        const id = idRaw ? Number(idRaw) : null;
        const nome = formData.get("nome") as string;
        const descricao = formData.get("descricao") as string || null;
        const liderInput = formData.get("lider_id");
        const novoLiderId = liderInput && Number(liderInput) !== 0 ? Number(liderInput) : null;

        if (!nome) return { ok: false, error: "O nome do departamento é obrigatório." };

        await db.$transaction(async (tx) => {
            let currentDeptId = id;

            if (id) {
                const deptoAntigo = await tx.departamento.findUnique({ where: { id } });
                if (deptoAntigo && deptoAntigo.lider_id !== novoLiderId) {
                    if (deptoAntigo.lider_id) {
                        // Remove o vínculo de líder anterior
                        await tx.funcaoSelecionada.deleteMany({
                            where: {
                                integrante: { departamento_id: id, membro_id: deptoAntigo.lider_id },
                                funcao: { nome: 'Líder' }
                            }
                        });
                    }
                }
                await tx.departamento.update({ where: { id }, data: { nome, descricao, lider_id: novoLiderId } });
            } else {
                const novoDepto = await tx.departamento.create({ data: { nome, descricao, lider_id: novoLiderId, tenant_id: tenantId, } });
                currentDeptId = novoDepto.id;
            }

            if (novoLiderId && currentDeptId) {
                const funcaoLider = await tx.funcaoDepartamento.findFirst({ where: { departamento_id: currentDeptId, nome: 'Líder' } });
                if (!funcaoLider) await tx.funcaoDepartamento.create({ data: { nome: 'Líder', tenant_id: tenantId, departamento_id: currentDeptId } });

                // Verifica se o membro já é integrante do departamento
                let integrante = await tx.integranteDepartamento.findFirst({
                    where: { departamento_id: currentDeptId, membro_id: novoLiderId }
                });

                if (!integrante) {
                    integrante = await tx.integranteDepartamento.create({
                        data: { departamento_id: currentDeptId, membro_id: novoLiderId, tenant_id: tenantId }
                    });
                }

                // Garante que tenha a função de líder
                const jaLider = await tx.funcaoSelecionada.findFirst({
                    where: { integrante_departamento_id: integrante.id, funcao_id: funcaoLider!.id }
                });

                if (!jaLider) {
                    await tx.funcaoSelecionada.create({
                        data: { integrante_departamento_id: integrante.id, funcao_id: funcaoLider!.id }
                    });
                }
            }
        });

        revalidatePath("/admin/configuracoes");
        revalidatePath("/admin/departamentos");
        revalidatePath("/membros/dashboard");
        return { ok: true };
    } catch (error) {
        return { ok: false, error: "Erro interno ao processar o departamento." };
    }
}

export async function editarEscalaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const id = Number(formData.get('id'));
        const funcao = formData.get('funcao') as string;
        const horario = formData.get('horario') as string;

        await db.escala.update({
            where: { id: id },
            data: { funcao: funcao, horario: horario || null }
        });

        revalidatePath('/escalas/admin');
        return { ok: true };
    } catch (error) {
        return { ok: false, error: "Ocorreu um erro ao guardar as alterações." };
    }
}

export async function editarEventoAction(formData: FormData) {
    console.log('=== EDITAR EVENTO ===')
    console.log('id:', formData.get('id'))
    console.log('nome:', formData.get('nome'))
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        console.log('db obtido com sucesso')

        const id = formData.get('id') as string;
        const nome = formData.get('nome') as string;
        const dataStr = formData.get('data') as string;
        const horaStr = formData.get('horario') as string;
        const descricao = formData.get('descricao') as string;
        const congIdStr = formData.get('congregacao_id') as string;
        const congregacao_id = congIdStr ? Number(congIdStr) : null;

        const dataCompleta = new Date(`${dataStr}T${horaStr}:00`);

        await db.evento.update({
            where: { id: Number(id) },
            data: { nome, data: dataCompleta, descricao: descricao || null, congregacao_id }
        });

        revalidatePath('/escalas/admin');
        revalidatePath('/membros/dashboard');
        return { ok: true };
    } catch (error: any) {
        return { ok: false, error: "Erro ao atualizar o evento na base de dados." };
    }
}

export async function apagarEventoAction(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db } = await getDb();

        // Apagar dependencias antes do evento
        await db.escala.deleteMany({ where: { evento_id: id } })
        await db.repertorioEvento.deleteMany({ where: { evento_id: id } })
        await db.mensagemEvento.deleteMany({ where: { evento_id: id } })
        await db.boleiaOferta.deleteMany({ where: { evento_id: id } })
        await db.preEncomendaCantina.deleteMany({ where: { evento_id: id } })

        // Apagar cardapio (itens + cardapio)
        const cardapio = await db.cardapioCantina.findUnique({ where: { evento_id: id } })
        if (cardapio) {
            await db.cardapioItem.deleteMany({ where: { cardapio_id: cardapio.id } })
            await db.cardapioCantina.delete({ where: { id: cardapio.id } })
        }

        // Apagar sermoes associados
        await db.sermao.deleteMany({ where: { evento_id: id } })

        // Finalmente apagar o evento
        await db.evento.delete({ where: { id } })

        revalidatePath('/admin/eventos')
        revalidatePath('/admin/escalas')
        return { ok: true };
    } catch (error: any) {
        console.error('Erro ao apagar evento:', error?.message || error)
        return { ok: false, error: "Erro ao remover o evento." };
    }
}

export async function criarCongregacao(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const nome = formData.get('nome') as string;
        const cidade = formData.get('cidade') as string;
        const endereco = formData.get('endereco') as string;

        if (!nome || !cidade) return { ok: false, error: "Nome e Cidade são obrigatórios." };

        await db.congregacao.create({
            data: {
                nome, cidade, endereco,
                codigo_postal: (formData.get('codigo_postal') as string)?.trim() || null,
                distrito: (formData.get('distrito') as string)?.trim() || null,
                pastor: (formData.get('pastor') as string)?.trim() || null,
                co_pastor: (formData.get('co_pastor') as string)?.trim() || null,
                telefone: (formData.get('telefone') as string)?.trim() || null,
                email: (formData.get('email') as string)?.trim() || null,
                latitude: formData.get('latitude') ? Number(formData.get('latitude')) || null : null,
                longitude: formData.get('longitude') ? Number(formData.get('longitude')) || null : null,
                tenant_id: tenantId
            }
        });

        revalidatePath('/admin/congregacoes');
        return { ok: true, message: "Congregação criada com sucesso!" };
    } catch (error) {
        console.error("Erro ao criar congregação:", error);
        return { ok: false, error: "Erro interno ao criar congregação." };
    }
}

export async function atualizarCongregacao(id: number, formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        const nome = formData.get('nome') as string;
        const cidade = formData.get('cidade') as string;
        const endereco = formData.get('endereco') as string;

        if (!nome || !cidade) return { ok: false, error: "Nome e Cidade são obrigatórios." };

        await db.congregacao.update({
            where: { id },
            data: {
                nome, cidade, endereco,
                codigo_postal: (formData.get('codigo_postal') as string)?.trim() || null,
                distrito: (formData.get('distrito') as string)?.trim() || null,
                pastor: (formData.get('pastor') as string)?.trim() || null,
                co_pastor: (formData.get('co_pastor') as string)?.trim() || null,
                telefone: (formData.get('telefone') as string)?.trim() || null,
                email: (formData.get('email') as string)?.trim() || null,
                latitude: formData.get('latitude') ? Number(formData.get('latitude')) || null : null,
                longitude: formData.get('longitude') ? Number(formData.get('longitude')) || null : null,
            }
        });

        revalidatePath('/admin/congregacoes');
        return { ok: true, message: "Congregação atualizada com sucesso!" };
    } catch (error) {
        return { ok: false, error: "Erro ao atualizar congregação." };
    }
}

export async function excluirCongregacao(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.congregacao.delete({
            where: { id }
        });

        revalidatePath('/admin/congregacoes');
        return { ok: true, message: "Congregação eliminada com sucesso!" };
    } catch (error: any) {
        // Proteção essencial: Se houver membros nesta congregação, a BD não deixa apagar
        if (error.code === 'P2003') {
            return { ok: false, error: "Não é possível apagar: existem membros ou grupos associados a esta congregação." };
        }
        return { ok: false, error: "Erro ao excluir a congregação." };
    }
}

export async function buscarCongregacoes() {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const { db, tenantId } = await getDb();
    return await db.congregacao.findMany({ orderBy: { nome: 'asc' } });
}

async function getContext() {
    const headersList = await headers();
    const tenantId = Number(headersList.get('x-tenant-id'));
    if (!tenantId) throw new Error("Igreja não identificada.");
    const db = getTenantClient(tenantId);
    return { db, tenantId };
}

export async function exportarMembrosCSV() {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db } = await getContext();
        const membros = await db.membro.findMany({
            include: { congregacao: true, escolaridade: true }
        });

        if (membros.length === 0) return { error: "Nenhum membro encontrado para exportar." };

        // Cabeçalho com TODOS os campos importantes
        const header = [
            "ID", "Primeiro Nome", "Apelido", "Email", "Telefone", "Nascimento", "Genero",
            "Estado Civil", "Profissao", "NIF", "Morada", "Cidade", "Codigo Postal",
            "Congregacao", "Cargo", "Status", "Data Admissao", "Loyverse ID"
        ].join(";");

        const rows = membros.map(m => [
            m.id,
            m.first_name,
            m.last_name,
            m.email,
            m.phone_1,
            m.birthdate ? m.birthdate.toISOString().split('T')[0] : "",
            m.gender || "",
            m.marital_status || "",
            m.profession || "",
            m.tax_id || "",
            m.address_1 || "",
            m.id_city || "",
            m.postal_code || "",
            m.congregacao?.nome || "Sede",
            m.church_role || "Membro",
            m.status || "ATIVO",
            m.data_admissao ? m.data_admissao.toISOString().split('T')[0] : "",
            m.loyverse_id || ""
        ].join(";"));

        return { csv: [header, ...rows].join("\n") };
    } catch (e) {
        return { error: "Erro na exportação." };
    }
}

export async function analisarCSV(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db } = await getContext();
        const file = formData.get('file') as File;
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");

        // Remove o cabeçalho e processa
        const dataRows = lines.slice(1);
        const resultados = [];

        for (let i = 0; i < dataRows.length; i++) {
            const cols = dataRows[i].split(";").map(c => c.trim());

            // Mapeamento baseado no cabeçalho da exportação acima
            const dados = {
                first_name: cols[1],
                last_name: cols[2],
                email: cols[3]?.toLowerCase(),
                phone_1: cols[4],
                birthdate: cols[5],
                id_city: cols[11],
                church_role: cols[14] || "Membro",
                status: cols[15] || "ATIVO",
            };

            if (!dados.email || !dados.first_name) {
                resultados.push({ linha: i + 2, status: 'ERRO', motivo: 'Dados obrigatórios em falta', dados });
                continue;
            }

            // Verifica se já existe no banco global (Email é unique no sistema todo)
            const existe = await prismaGlobal.membro.findUnique({ where: { email: dados.email } });

            resultados.push({
                linha: i + 2,
                status: existe ? 'DUPLICADO' : 'PRONTO',
                motivo: existe ? 'Email já registado' : '',
                dados
            });
        }

        return { resultados };
    } catch (e) {
        return { error: "Erro ao ler ficheiro." };
    }
}

export async function confirmarImportacao(membrosValidos: any[]) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getContext();
        const passwordPadrao = await bcrypt.hash("admvc123", 10);

        // Criamos em lote para performance
        const criacoes = membrosValidos.map(item => {
            const d = item.dados;
            return {
                first_name: d.first_name,
                last_name: d.last_name,
                email: d.email,
                password: passwordPadrao,
                phone_1: d.phone_1 || "",
                id_city: d.id_city || "",
                church_role: d.church_role,
                status: d.status,
                birthdate: d.birthdate ? new Date(d.birthdate) : null,
                tenant_id: tenantId, // A extensão substitui
                is_active: true
            };
        });

        await db.membro.createMany({ data: criacoes as any });

        revalidatePath('/admin/membros');
        return { ok: true };
    } catch (e) {
        console.error(e);
        return { error: "Erro ao gravar na base de dados." };
    }
}

export async function excluirMembroAction(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();
        await db.membro.delete({
            where: { id }
        });
        revalidatePath("/admin/membros");
        return { ok: true };
    } catch (error) {
        console.error("Erro ao excluir:", error);
        return { error: "Não foi possível excluir o membro. Verifique se ele possui registros vinculados (escalas, dízimos, etc)." };
    }
}

export async function adicionarMembroAoDepto(membroId: number, deptoId: number, funcoesIds: number[]) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const { db, tenantId } = await getDb();

    await db.integranteDepartamento.create({
        data: {
            membro_id: membroId,
            departamento_id: deptoId,
            tenant_id: tenantId,
            funcoes: {
                create: funcoesIds.map(id => ({
                    funcao_id: id
                }))
            }
        }
    });
}

export async function removerFuncaoDoMembro(funcaoSelecionadaId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb();

        // Remove a função específica da tabela FuncaoSelecionada
        await db.funcaoSelecionada.delete({
            where: { id: funcaoSelecionadaId }
        });

        revalidatePath('/admin/departamentos');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao remover função:", error);
        return { error: "Não foi possível remover a função." };
    }
}

export async function removerMembroTotal(membroId: number, departamentoId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db } = await getDb();

        // Encontrar o integrante (pode ter turno null ou definido)
        const integrante = await db.integranteDepartamento.findFirst({
            where: { membro_id: membroId, departamento_id: departamentoId },
        })

        if (integrante) {
            await db.integranteDepartamento.delete({ where: { id: integrante.id } })
        }

        revalidatePath('/admin/departamentos');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao remover membro completo:", error);
        return { error: "Não foi possível remover o membro do departamento." };
    }
}

export async function alternarPermissaoEscala(integranteId: number, statusAtual: boolean) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const headersList = await headers();
        const tenantId = headersList.get('x-tenant-id');
        if (!tenantId) return { ok: false, error: 'Sessão inválida.' };

        const db = getTenantClient(Number(tenantId));

        // Atualiza a permissão (inverte o valor atual)
        await db.integranteDepartamento.update({
            where: { id: integranteId },
            data: { pode_gerir_escalas: !statusAtual }
        });

        // Atualiza a página onde a equipa é listada
        revalidatePath('/admin/configuracoes');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao delegar permissão:", error);
        return { ok: false, error: "Não foi possível alterar as permissões." };
    }
}

export async function criarNovoMembroAction(formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    console.log('\n========================================')
    console.log('[CRIAR MEMBRO] INICIO DO PROCESSO')
    console.log('========================================')

    // LOG DE TODOS OS CAMPOS RECEBIDOS
    console.log('[CRIAR MEMBRO] Campos recebidos no FormData:')
    for (const [key, value] of formData.entries()) {
        if (key === 'password') {
            console.log(`  ${key}: [OCULTO]`)
        } else if (key === 'avatar') {
            const f = value as File
            console.log(`  ${key}: File(name=${f.name}, size=${f.size}, type=${f.type})`)
        } else {
            console.log(`  ${key}: "${value}"`)
        }
    }

    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string

    if (!email || !password) {
        console.error('[CRIAR MEMBRO] ERRO: Email ou password em falta')
        return { error: 'Email e password sao obrigatorios.' }
    }

    console.log(`[CRIAR MEMBRO] Email: ${email}`)

    // Verificacao de email duplicado
    const existe = await prismaGlobal.membro.findUnique({ where: { email } })
    if (existe) {
        console.warn(`[CRIAR MEMBRO] BLOQUEADO: Email ja existe (id=${existe.id})`)
        return { error: 'Este e-mail ja esta registado em outro membro.' }
    }

    console.log('[CRIAR MEMBRO] Email disponivel, a continuar...')

    const hashedPassword = await bcrypt.hash(password, 10)

    const parseDate = (val: any): Date | null => {
        if (!val || String(val).trim() === '') return null
        const d = new Date(val)
        return isNaN(d.getTime()) ? null : d
    }

    // ── UPLOAD DA FOTO ────────────────────────────────────────────────────────
    let avatarUrl: string | null = null
    const avatarFile = formData.get('avatar') as File | null

    console.log('[CRIAR MEMBRO] A verificar foto...')
    console.log(`  avatarFile existe: ${!!avatarFile}`)
    console.log(`  avatarFile size: ${avatarFile?.size ?? 0}`)
    console.log(`  avatarFile type: ${avatarFile?.type ?? 'N/A'}`)
    console.log(`  avatarFile name: ${avatarFile?.name ?? 'N/A'}`)

    if (avatarFile && avatarFile.size > 0) {
        try {
            console.log('[CRIAR MEMBRO] A fazer upload para Vercel Blob...')
            const { put } = await import('@vercel/blob')
            const nomeSeguro = `avatares/${Date.now()}-${avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
            console.log(`[CRIAR MEMBRO] Caminho do blob: ${nomeSeguro}`)

            const blob = await put(nomeSeguro, avatarFile, { access: 'public' })
            avatarUrl = blob.url
            console.log(`[CRIAR MEMBRO] Upload OK! URL: ${avatarUrl}`)
        } catch (err: any) {
            console.error('[CRIAR MEMBRO] ERRO no upload da foto:', err.message)
            console.error(err)
            // Nao bloqueia o processo — continua sem foto
        }
    } else {
        console.log('[CRIAR MEMBRO] Sem foto para fazer upload.')
    }

    // ── CRIAR MEMBRO NA BD ────────────────────────────────────────────────────
    try {
        const { db, tenantId } = await getDb()

        const escolaridadeId = formData.get('escolaridade_id') ? Number(formData.get('escolaridade_id')) : null
        const congregacaoId = formData.get('congregacao_id') ? Number(formData.get('congregacao_id')) : null

        console.log('[CRIAR MEMBRO] A criar registo na base de dados...')
        console.log(`  avatar_file: ${avatarUrl ?? '(sem foto)'}`)
        console.log(`  escolaridade_id: ${escolaridadeId}`)
        console.log(`  role: ${formData.get('role') ?? 'USER'}`)
        console.log(`  status: ${formData.get('status') ?? 'ATIVO'}`)

        const novoMembro = await db.membro.create({
            data: {
                first_name: formData.get('first_name') as string,
                last_name: formData.get('last_name') as string,
                email,
                password: hashedPassword,
                phone_1: formData.get('phone_1') as string || null,
                gender: formData.get('gender') as string || null,
                marital_status: formData.get('marital_status') as string || null,
                birthdate: parseDate(formData.get('birthdate')),
                profession: formData.get('profession') as string || null,
                father_name: formData.get('father_name') as string || null,
                mother_name: formData.get('mother_name') as string || null,
                tax_id: formData.get('tax_id') as string || null,
                nationality: formData.get('nationality') as string || 'Portuguesa',
                gdpr_aceite: formData.get('gdpr_aceite') === 'true',
                permanecer_aceite: formData.get('permanecer_aceite') === 'true',
                conversion_date: parseDate(formData.get('conversion_date')),

                // MORADA
                address_1: formData.get('address_1') as string || null,
                address_number: formData.get('address_number') as string || null,
                postal_code: formData.get('postal_code') as string || null,
                neighborhood: formData.get('neighborhood') as string || null,
                id_city: formData.get('city') as string || null,
                state: formData.get('state') as string || null,
                country: formData.get('country') as string || 'Portugal',

                // ECLESIASTICO
                role: (formData.get('role') as any) || 'USER',
                status: formData.get('status') as string || 'ATIVO',
                loyverse_id: formData.get('loyverse_id') as string || null,
                church_role: formData.get('church_role') as string || 'Membro',
                baptism_date: parseDate(formData.get('baptism_date')),
                data_admissao: parseDate(formData.get('admission_date')),
                notes: formData.get('notes') as string || null,

                // FAMILIA
                spouse_name: formData.get('spouse_name') as string || null,
                children_number: Number(formData.get('children_count')) || 0,

                // FOTO — campo corrigido
                avatar_file: avatarUrl,

                is_active: true,
                tenant_id: tenantId,

                escolaridade_id: escolaridadeId,
                congregacao_id: congregacaoId,

            }
        })

        // Gerar QR Code unico com o ID do membro
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let rnd = ''; for (let i = 0; i < 4; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length))
        await db.membro.update({
            where: { id: novoMembro.id },
            data: { qr_code: `ADMVC-${tenantId}-${novoMembro.id}-${rnd}` },
        })

        console.log(`[CRIAR MEMBRO] SUCESSO! Membro criado com id=${novoMembro.id}`)
        console.log(`[CRIAR MEMBRO] avatar_file guardado: ${novoMembro.avatar_file ?? '(sem foto)'}`)
        console.log('========================================\n')

        revalidatePath('/admin/membros')
        return { sucesso: true, id: novoMembro.id }

    } catch (error: any) {
        console.error('[CRIAR MEMBRO] ERRO na base de dados:', error.message)
        console.error('[CRIAR MEMBRO] Codigo de erro:', error.code)
        console.error(error)
        console.log('========================================\n')

        if (error.code === 'P2002') {
            return { error: 'Conflito: E-mail ou ID Loyverse ja existem.' }
        }
        return { error: 'Nao foi possivel gravar o membro na base de dados.' }
    }
}

async function getTenantId(): Promise<number> {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    return Number(tenantId || 0)
}

const parseDate = (val: any): Date | null => {
    if (!val || String(val).trim() === '') return null
    const d = new Date(val)
    return isNaN(d.getTime()) ? null : d
}

// ── EDITAR MEMBRO ─────────────────────────────────────────────────────────────
export async function atualizarMembroAdmin(membroId: number, formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb()
        const tenant_id = await getTenantId()

        // Snapshot ANTES para calcular diff
        const membroAntes = await db.membro.findUnique({
            where: { id: membroId },
            select: {
                first_name: true, last_name: true, email: true,
                phone_1: true, role: true, status: true,
                is_active: true, loyverse_id: true,
                familia_id: true, parentesco: true,
            }
        })

        if (!membroAntes) return { ok: false, error: 'Membro nao encontrado.' }

        // Upload de foto se existir
        let avatarUrl: string | undefined = undefined
        const avatarFile = formData.get('avatar') as File | null
        if (avatarFile && avatarFile.size > 0) {
            try {
                const nomeSeguro = `avatares/${Date.now()}-${avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
                const blob = await put(nomeSeguro, avatarFile, { access: 'public' })
                avatarUrl = blob.url
            } catch (err: any) {
                console.error('[EDITAR MEMBRO] Erro no upload da foto:', err.message)
            }
        }

        // Campos a actualizar
        const novaFamiliaId = formData.get('familia_id') ? Number(formData.get('familia_id')) : null
        const novoParentesco = (formData.get('parentesco') as string) || null
        const novaSenha = formData.get('nova_senha') as string
        const novoRole = formData.get('role') as string
        const novoStatus = formData.get('status') as string
        const novoIsActive = formData.get('is_active') === 'on' || formData.get('is_active') === 'true'

        const dataUpdate: any = {
            first_name: formData.get('first_name') as string,
            last_name: formData.get('last_name') as string,
            email: (formData.get('email') as string)?.toLowerCase().trim(),
            phone_1: formData.get('phone_1') as string || null,
            gender: formData.get('gender') as string || null,
            marital_status: formData.get('marital_status') as string || null,
            birthdate: parseDate(formData.get('birthdate')),
            profession: formData.get('profession') as string || null,
            father_name: formData.get('father_name') as string || null,
            mother_name: formData.get('mother_name') as string || null,
            nationality: formData.get('nationality') as string || null,
            tax_id: formData.get('tax_id') as string || null,
            id_card_number: formData.get('id_card_number') as string || null,
            spouse_name: formData.get('spouse_name') as string || null,
            spouse_christian: formData.get('spouse_christian') === 'true',
            wedding_date: parseDate(formData.get('wedding_date')),
            has_children: formData.get('has_children') === 'true',
            children_number: Number(formData.get('children_number')) || 0,
            lang: formData.get('lang') as string || null,
            address_1: formData.get('address_1') as string || null,
            address_number: formData.get('address_number') as string || null,
            address_2: formData.get('address_2') as string || null,
            postal_code: formData.get('postal_code') as string || null,
            neighborhood: formData.get('neighborhood') as string || null,
            id_city: formData.get('id_city') as string || null,
            state: formData.get('state') as string || null,
            country: formData.get('country') as string || 'Portugal',
            notes: formData.get('notes') as string || null,
            entry_date: parseDate(formData.get('entry_date')),
            baptism_date: parseDate(formData.get('baptism_date')),
            conversion_date: parseDate(formData.get('conversion_date')),
            previous_church: formData.get('previous_church') as string || null,
            church_role: formData.get('church_role') as string || null,
            ministry: formData.get('ministry') as string || null,
            role: novoRole as any,
            status: novoStatus as any,
            loyverse_id: formData.get('loyverse_id') as string || null,
            is_active: novoIsActive,
            familia_id: novaFamiliaId,
            parentesco: novoParentesco,
            congregacao_id: formData.get('congregacao_id') ? Number(formData.get('congregacao_id')) : null,
        }

        if (avatarUrl) dataUpdate.avatar_file = avatarUrl

        // Actualiza senha apenas se preenchida
        if (novaSenha && novaSenha.trim().length > 0) {
            dataUpdate.password = await bcrypt.hash(novaSenha, 10)
        }

        const membroAtualizado = await db.membro.update({
            where: { id: membroId },
            data: dataUpdate
        })

        // ── AUDIT GERAL (campos alterados) ──
        const camposComparar = {
            first_name: membroAntes.first_name, last_name: membroAntes.last_name,
            email: membroAntes.email, phone_1: membroAntes.phone_1,
            role: membroAntes.role, status: membroAntes.status,
            is_active: membroAntes.is_active, familia_id: membroAntes.familia_id,
        }
        const camposDepois = {
            first_name: membroAtualizado.first_name, last_name: membroAtualizado.last_name,
            email: membroAtualizado.email, phone_1: membroAtualizado.phone_1,
            role: membroAtualizado.role, status: membroAtualizado.status,
            is_active: membroAtualizado.is_active, familia_id: membroAtualizado.familia_id,
        }

        const diff = diffCampos(camposComparar, camposDepois)

        if (diff) {
            await audit({
                tenant_id,
                categoria: 'MEMBROS',
                acao: 'EDITAR',
                alvo_id: membroId,
                alvo_nome: `${membroAtualizado.first_name} ${membroAtualizado.last_name}`,
                alvo_tipo: 'MEMBRO',
                descricao: `Perfil editado — campos: ${Object.keys(diff.depois).join(', ')}`,
                dados_antes: diff.antes,
                dados_apos: diff.depois,
            })
        }

        // ── AUDIT ESPECIFICO: mudanca de role ──
        if (membroAntes.role !== membroAtualizado.role) {
            await audit({
                tenant_id,
                categoria: 'MEMBROS',
                acao: 'ALTERAR_ROLE',
                alvo_id: membroId,
                alvo_nome: `${membroAtualizado.first_name} ${membroAtualizado.last_name}`,
                alvo_tipo: 'MEMBRO',
                descricao: `Role alterado: "${membroAntes.role}" → "${membroAtualizado.role}"`,
            })
        }

        // ── AUDIT ESPECIFICO: mudanca de status ──
        if (membroAntes.status !== membroAtualizado.status) {
            await audit({
                tenant_id,
                categoria: 'MEMBROS',
                acao: 'ALTERAR_STATUS',
                alvo_id: membroId,
                alvo_nome: `${membroAtualizado.first_name} ${membroAtualizado.last_name}`,
                alvo_tipo: 'MEMBRO',
                descricao: `Status alterado: "${membroAntes.status}" → "${membroAtualizado.status}"`,
            })
        }

        // ── AUDIT ESPECIFICO: reset de senha ──
        if (novaSenha && novaSenha.trim().length > 0) {
            await audit({
                tenant_id,
                categoria: 'MEMBROS',
                acao: 'RESET_SENHA',
                alvo_id: membroId,
                alvo_nome: `${membroAtualizado.first_name} ${membroAtualizado.last_name}`,
                alvo_tipo: 'MEMBRO',
                descricao: `Senha redefinida pelo administrador`,
            })
        }

        revalidatePath('/admin/membros')
        revalidatePath(`/admin/membros/editar/${membroId}`)
        return { ok: true }

    } catch (error: any) {
        console.error('[EDITAR MEMBRO] Erro:', error.message)
        return { ok: false, error: error.message || 'Erro ao actualizar membro.' }
    }
}

// ── APAGAR MEMBRO ─────────────────────────────────────────────────────────────
export async function apagarMembroAction(membroId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb()
        const tenant_id = await getTenantId()

        // Busca dados ANTES de apagar (obrigatorio para GDPR)
        const membro = await db.membro.findUnique({
            where: { id: membroId },
            select: {
                first_name: true, last_name: true, email: true,
                role: true, status: true, tenant_id: true,
                gdpr_aceite: true, data_admissao: true,
            }
        })

        if (!membro) return { ok: false, error: 'Membro nao encontrado.' }

        // Regista ANTES de apagar (pode nao ser possivel depois)
        await audit({
            tenant_id: tenant_id || membro.tenant_id,
            categoria: 'MEMBROS',
            acao: 'APAGAR',
            alvo_id: membroId,
            alvo_nome: `${membro.first_name} ${membro.last_name}`,
            alvo_tipo: 'MEMBRO',
            descricao: `Membro removido do sistema — Email: ${membro.email} — Role: ${membro.role}`,
            dados_antes: sanitizar({
                email: membro.email,
                role: membro.role,
                status: membro.status,
                gdpr_aceite: membro.gdpr_aceite,
                data_admissao: membro.data_admissao,
            }),
        })

        await db.membro.delete({ where: { id: membroId } })

        revalidatePath('/admin/membros')
        return { ok: true }

    } catch (error: any) {
        console.error('[APAGAR MEMBRO] Erro:', error.message)
        return { ok: false, error: 'Nao foi possivel remover o membro.' }
    }
}

// ── CRIAR / EDITAR GRUPO COM GEOCODIFICAÇÃO ───────────────────────────────────
export async function salvarGrupoAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb()
        const idRaw = formData.get('id')
        const id = idRaw ? Number(idRaw) : null

        const nome = formData.get('nome') as string
        const dia_semana = formData.get('dia_semana') as string
        const horario = formData.get('horario') as string
        const endereco = formData.get('endereco') as string || null
        const numero = formData.get('numero') as string || null
        const bairro = formData.get('bairro') as string || null
        const cidade = formData.get('cidade') as string || null
        const estado = formData.get('estado') as string || null
        const pais = formData.get('pais') as string || 'Portugal'
        const categoria = formData.get('categoria') as string || null
        const perfil = formData.get('perfil') as string || null
        const descricao = formData.get('descricao') as string || null
        const regiao = formData.get('regiao') as string || null
        const publico = formData.get('publico') === 'on' || formData.get('publico') === 'true'
        const liderInput = formData.get('lider_id')
        const liderId = liderInput && Number(liderInput) !== 0 ? Number(liderInput) : null

        // ── GEOCODIFICAÇÃO AUTOMÁTICA ──
        // Só geocodifica se a morada ou cidade mudou
        let latitude: number | null = null
        let longitude: number | null = null

        if (cidade || endereco) {
            console.log(`[GRUPO] A geocodificar: ${endereco}, ${cidade}`)
            const coords = await geocodificarComFallback(
                endereco ? `${endereco} ${numero || ''}`.trim() : null,
                cidade,
                pais
            )
            if (coords) {
                latitude = coords.latitude
                longitude = coords.longitude
                console.log(`[GRUPO] Coordenadas: ${latitude}, ${longitude}`)
            } else {
                console.warn('[GRUPO] Geocodificacao falhou — sem coordenadas')
            }
        }

        const baseData: any = {
            nome, dia_semana, horario, endereco, numero, bairro,
            cidade, estado, pais, categoria, perfil, descricao,
            regiao, publico,
            // Só actualiza coordenadas se obteve resultado
            ...(latitude !== null && { latitude }),
            ...(longitude !== null && { longitude }),
        }

        if (id) {
            await db.grupo.update({
                where: { id },
                data: {
                    ...baseData,
                    lideres: liderId ? { set: [{ id: liderId }] } : { set: [] },
                    membros: liderId ? { connect: [{ id: liderId }] } : undefined
                }
            })
        } else {
            await db.grupo.create({
                data: {
                    ...baseData,
                    tenant_id: tenantId,
                    lideres: liderId ? { connect: [{ id: liderId }] } : undefined,
                    membros: liderId ? { connect: [{ id: liderId }] } : undefined
                }
            })
        }

        revalidatePath('/admin/configuracoes')
        revalidatePath('/grupos/admin')
        revalidatePath('/grupos') // página pública
        return { ok: true }

    } catch (error: any) {
        console.error('[SALVAR GRUPO] Erro:', error.message)
        return { ok: false, error: 'Erro ao guardar o grupo.' }
    }
}

// ── GEOCODIFICAR GRUPOS EXISTENTES (acção de manutenção) ─────────────────────
// Chamar uma única vez para preencher coordenadas em grupos já criados
export async function geocodificarTodosGruposAction() {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb()

        const grupos = await db.grupo.findMany({
            where: {
                OR: [
                    { latitude: null },
                    { longitude: null }
                ]
            },
            select: { id: true, endereco: true, numero: true, cidade: true, pais: true }
        })

        console.log(`[GEOCODE LOTE] ${grupos.length} grupos sem coordenadas`)

        let sucesso = 0
        let falhou = 0

        for (const grupo of grupos) {
            // Pausa de 1.1s entre pedidos para respeitar rate limit do Nominatim
            await new Promise(r => setTimeout(r, 1100))

            const coords = await geocodificarComFallback(
                grupo.endereco ? `${grupo.endereco} ${grupo.numero || ''}`.trim() : null,
                grupo.cidade,
                grupo.pais || 'Portugal'
            )

            if (coords) {
                await db.grupo.update({
                    where: { id: grupo.id },
                    data: { latitude: coords.latitude, longitude: coords.longitude }
                })
                sucesso++
            } else {
                falhou++
            }
        }

        revalidatePath('/grupos/admin')
        revalidatePath('/grupos')

        return { ok: true, sucesso, falhou }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

// ── ASSOCIAR MEMBROS A CONGREGAÇÃO EM MASSA ──────────────────────────────────
export async function associarMembrosACongregacao(congregacaoId: number, membrosIds: number[]) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db } = await getDb()

        await db.membro.updateMany({
            where: { id: { in: membrosIds } },
            data: { congregacao_id: congregacaoId }
        })

        revalidatePath('/admin/congregacoes')
        revalidatePath('/admin/membros')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

export async function removerMembroDeCongregacao(membroId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db } = await getDb()

        await db.membro.update({
            where: { id: membroId },
            data: { congregacao_id: null }
        })

        revalidatePath('/admin/congregacoes')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}
// ── REGIÕES CUSTOMIZADAS ─────────────────────────────────────────────────────
export async function salvarRegioesAction(regioes: string[]) {
    try {
        await requireRole(['ADMIN'])
        const headersList = await headers()
        const tenantId = Number(headersList.get('x-tenant-id') || 0)
        if (!tenantId) return { ok: false, error: 'Tenant nao identificado.' }

        await prismaGlobal.tenant.update({
            where: { id: tenantId },
            data: { regioes_custom: regioes }
        })

        revalidatePath('/admin/configuracoes')
        invalidateTenant(tenantId).catch(() => {})
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao guardar regioes.' }
    }
}

export async function buscarRegioesAction() {
    try {
        await requireAuth()
        const headersList = await headers()
        const tenantId = Number(headersList.get('x-tenant-id') || 0)
        const tenant = await prismaGlobal.tenant.findUnique({
            where: { id: tenantId },
            select: { regioes_custom: true }
        })
        const regioes = (tenant?.regioes_custom as string[]) || ['Norte', 'Centro', 'Sul', 'Lisboa', 'Online']
        return { ok: true, data: regioes }
    } catch {
        return { ok: true, data: ['Norte', 'Centro', 'Sul', 'Lisboa', 'Online'] }
    }
}

// ============================================================================
// INTERESSE EM SERVIR — APROVAR / REJEITAR
// ============================================================================

export async function aprovarInteresseDepartamento(interesseId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb()

        const interesse = await db.interesseDepartamento.findUnique({
            where: { id: interesseId },
            include: { membro: { select: { id: true, first_name: true, last_name: true } }, departamento: { select: { id: true, nome: true } } }
        })
        if (!interesse) return { ok: false, error: 'Interesse nao encontrado.' }

        // Aprovar o interesse
        await db.interesseDepartamento.update({
            where: { id: interesseId },
            data: { status: 'APROVADO' }
        })

        // Vincular membro ao departamento (se ainda nao estiver)
        const jaVinculado = await db.integranteDepartamento.findFirst({
            where: { membro_id: interesse.membro_id, departamento_id: interesse.departamento_id }
        })
        if (!jaVinculado) {
            await db.integranteDepartamento.create({
                data: {
                    membro_id: interesse.membro_id,
                    departamento_id: interesse.departamento_id,
                    tenant_id: tenantId,
                }
            })
        }

        // Push notification ao membro
        try {
            const { sendPushToMembro } = await import('@/lib/web-push')
            await sendPushToMembro(interesse.membro_id, {
                title: 'Interesse Aprovado!',
                body: `Foste aceite no departamento ${interesse.departamento.nome}. Bem-vindo!`,
                url: '/membros/dashboard?tab=departamentos'
            })
        } catch { /* push opcional */ }

        audit({
            tenant_id: tenantId,
            categoria: 'DEPARTAMENTOS',
            acao: 'APROVAR',
            alvo_id: interesse.membro_id,
            alvo_nome: `${interesse.membro.first_name} ${interesse.membro.last_name}`,
            alvo_tipo: 'MEMBRO',
            descricao: `Interesse aprovado para departamento "${interesse.departamento.nome}"`,
        }).catch(() => {})

        revalidatePath('/admin/configuracoes')
        return { ok: true }
    } catch (err: any) {
        console.error('[APROVAR INTERESSE] Erro:', err.message)
        return { ok: false, error: 'Erro ao aprovar interesse.' }
    }
}

export async function criarCursoPermanecer() {
    try {
        await requireRole(['ADMIN'])
        const { db, tenantId } = await getDb()

        // Verificar se já existe
        const existente = await db.cursoEBD.findFirst({
            where: { categoria: 'DISCIPULADO', titulo: { contains: 'Permanecer' } }
        })
        if (existente) return { ok: false, error: 'Curso Permanecer ja existe.', cursoId: existente.id }

        const agora = new Date()
        const fimAno = new Date(agora.getFullYear(), 11, 31)

        // 1. Criar curso
        const curso = await db.cursoEBD.create({
            data: {
                titulo: 'Permanecer — Integracao a Membresia',
                descricao: 'Processo essencial para integrar novos membros, promovendo compreensao e alinhamento com a visao, missao e valores da igreja.',
                categoria: 'DISCIPULADO',
                ano: agora.getFullYear(),
                data_inicio: agora,
                data_fim: fimAno,
                nota_minima: 7.0,
                presenca_minima: 0,
                status: 'EM_CURSO',
                tipo_inscricao: 'LIVRE',
                tenant_id: tenantId,
                criado_por_id: null,
            }
        })

        // 2. Criar turma
        const turma = await db.turmaEBD.create({
            data: {
                nome: 'Permanecer',
                curso_id: curso.id,
                tenant_id: tenantId,
            }
        })

        // 3. Criar questionario com perguntas baseadas no Permanecer.pdf
        await db.atividadeEBD.create({
            data: {
                titulo: 'Questionario Permanecer',
                tipo: 'PROVA',
                descricao: 'Questionario sobre a visao, missao, valores e regra de fe da igreja. Nota minima: 7.0',
                nota_maxima: 10,
                peso: 1.0,
                turma_id: turma.id,
                tenant_id: tenantId,
                perguntas: [
                    {
                        id: 1,
                        texto: 'Qual e o versiculo base do processo Permanecer?',
                        tipo: 'MULTIPLA',
                        opcoes: ['Mateus 28:19-20', 'Joao 17:21', 'Salmo 2:8', 'Efesios 4:3-6'],
                        correta: 'Joao 17:21'
                    },
                    {
                        id: 2,
                        texto: 'Em que ano foi fundada a Igreja ADMVC?',
                        tipo: 'MULTIPLA',
                        opcoes: ['2005', '2008', '2010', '2012'],
                        correta: '2008'
                    },
                    {
                        id: 3,
                        texto: 'Qual e a missao principal da igreja?',
                        tipo: 'MULTIPLA',
                        opcoes: [
                            'Construir templos em todo o pais',
                            'Proclamar o Evangelho, discipular os crentes e servir a comunidade',
                            'Organizar eventos sociais e culturais',
                            'Gerir um sistema financeiro para os membros'
                        ],
                        correta: 'Proclamar o Evangelho, discipular os crentes e servir a comunidade'
                    },
                    {
                        id: 4,
                        texto: 'O batismo nas aguas e realizado por qual metodo na ADMVC?',
                        tipo: 'MULTIPLA',
                        opcoes: ['Aspersao', 'Efusao', 'Imersao', 'Qualquer metodo'],
                        correta: 'Imersao'
                    },
                    {
                        id: 5,
                        texto: 'Quais sao os valores da igreja?',
                        tipo: 'MULTIPLA',
                        opcoes: [
                            'Amor, Fe, Servico, Unidade e Santidade',
                            'Riqueza, Poder, Influencia e Territorio',
                            'Educacao, Saude e Lazer',
                            'Tradicao, Hierarquia e Disciplina'
                        ],
                        correta: 'Amor, Fe, Servico, Unidade e Santidade'
                    },
                    {
                        id: 6,
                        texto: 'A salvacao e conquistada por obras ou meritos humanos.',
                        tipo: 'VERDADEIRO_FALSO',
                        correta: 'Falso'
                    },
                    {
                        id: 7,
                        texto: 'O batismo no Espirito Santo e a mesma experiencia que o batismo nas aguas.',
                        tipo: 'VERDADEIRO_FALSO',
                        correta: 'Falso'
                    },
                    {
                        id: 8,
                        texto: 'Somente os batizados e em plena comunhao com Cristo e a Igreja podem participar da Ceia do Senhor.',
                        tipo: 'VERDADEIRO_FALSO',
                        correta: 'Verdadeiro'
                    },
                    {
                        id: 9,
                        texto: 'A sede actual da igreja esta localizada em que cidade?',
                        tipo: 'MULTIPLA',
                        opcoes: ['Leiria', 'Figueira da Foz', 'Coimbra', 'Lisboa'],
                        correta: 'Figueira da Foz'
                    },
                    {
                        id: 10,
                        texto: 'O que significa o Permanecer para a igreja?',
                        tipo: 'ESCRITA',
                    }
                ]
            }
        })

        // 4. Guardar referencia no tenant
        await prismaGlobal.tenant.update({
            where: { id: tenantId },
            data: { curso_permanecer_id: curso.id } as any
        })

        audit({
            tenant_id: tenantId,
            categoria: 'CONFIGURACAO',
            acao: 'CRIAR',
            alvo_tipo: 'CONFIG',
            descricao: `Curso Permanecer criado (ID: ${curso.id})`,
        }).catch(() => {})

        revalidatePath('/admin/formacao/ebd')
        return { ok: true, cursoId: curso.id }
    } catch (err: any) {
        console.error('[CRIAR CURSO PERMANECER] Erro:', err.message)
        return { ok: false, error: `Erro ao criar curso: ${err.message}` }
    }
}

export async function rejeitarInteresseDepartamento(interesseId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
        const { db, tenantId } = await getDb()

        const interesse = await db.interesseDepartamento.findUnique({
            where: { id: interesseId },
            include: { membro: { select: { first_name: true, last_name: true } }, departamento: { select: { nome: true } } }
        })
        if (!interesse) return { ok: false, error: 'Interesse nao encontrado.' }

        await db.interesseDepartamento.update({
            where: { id: interesseId },
            data: { status: 'REJEITADO' }
        })

        audit({
            tenant_id: tenantId,
            categoria: 'DEPARTAMENTOS',
            acao: 'REJEITAR',
            alvo_id: interesse.membro_id,
            alvo_nome: `${interesse.membro.first_name} ${interesse.membro.last_name}`,
            alvo_tipo: 'MEMBRO',
            descricao: `Interesse rejeitado para departamento "${interesse.departamento.nome}"`,
        }).catch(() => {})

        revalidatePath('/admin/configuracoes')
        return { ok: true }
    } catch (err: any) {
        console.error('[REJEITAR INTERESSE] Erro:', err.message)
        return { ok: false, error: 'Erro ao rejeitar interesse.' }
    }
}
