'use server'

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { validarSenhaNova } from '@/lib/senhas'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { criarSessaoMembro, apagarSessaoMembro } from '@/lib/sessao'
import { requireSAAuth, getSASession, exigirPapelSA, registarAcaoSA, papelChega, PAPEIS_SA, type PapelSA } from '@/lib/sa-auth'
import { type PlanoId, type Modulo, PLANOS, MODULOS } from '@/lib/planos'

export async function criarNovaIgreja(formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    // 1. Dados da Igreja
    const nomeIgreja = formData.get('nomeIgreja') as string;
    const slug = formData.get('slug') as string; // Ex: 'assembleia-central'

    const plano = (formData.get('plano') as string) || 'PRO'
    const valorMensal = parseFloat(formData.get('valorMensal') as string) || 0

    // 2. Dados do Primeiro Admin (Pastor/Líder)
    const adminNome = formData.get('adminNome') as string;
    const adminEmail = formData.get('adminEmail') as string;
    const adminPassword = formData.get('adminPassword') as string;

    try {
        // Validação básica
        if (!nomeIgreja || !slug || !adminEmail || !adminPassword) {
            return { error: 'Por favor, preencha todos os campos obrigatórios.' };
        }

        // Verifica se o slug ou o email já existem (agora usando o prisma base global)
        const emailExiste = await prisma.membro.findUnique({ where: { email: adminEmail } });
        if (emailExiste) return { error: 'Este e-mail já está em uso em outra conta.' };

        const slugExiste = await prisma.tenant.findUnique({ where: { slug } });
        if (slugExiste) return { error: 'Este identificador (slug) já está em uso.' };

        const motivoSenha = validarSenhaNova(adminPassword, adminEmail);
        if (motivoSenha) return { error: motivoSenha };

        // Hash da senha do novo admin
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // 3. A MÁGICA: Transação para criar o Tenant e o Membro juntos
        const novaIgreja = await prisma.$transaction(async (tx) => {
            // A. Cria o Tenant (Igreja)
            const tenant = await tx.tenant.create({
                data: {
                    nome: nomeIgreja,
                    slug: slug.toLowerCase().replace(/\s+/g, '-'),
                    plano,
                    valor_mensal: valorMensal,
                    plano_inicio: new Date(),
                }
            });

            // B. Cria o primeiro Membro como ADMIN vinculado a este novo Tenant
            await tx.membro.create({
                data: {
                    first_name: adminNome,
                    last_name: 'Admin',
                    email: adminEmail,
                    password: hashedPassword,
                    phone_1: '000000000', // Valor padrão, ele pode alterar depois
                    role: 'ADMIN',
                    is_active: true,
                    tenant_id: tenant.id, // <- Vinculando o admin à nova igreja
                }
            });

            return tenant;
        });

        await registarAcaoSA(session.saId, 'CRIAR_IGREJA', `Igreja ${novaIgreja.id} (${novaIgreja.nome}), admin ${adminEmail}`)
        revalidatePath('/super-admin/igrejas')
        return { success: true, message: `Igreja ${novaIgreja.nome} criada com sucesso!`, tenantId: novaIgreja.id };

    } catch (error) {
        console.error("Erro ao criar igreja:", error);
        return { error: 'Erro interno ao tentar criar a nova igreja.' };
    }
}


// Adicione isto no final de @/actions/super-admin-actions.ts

export async function atualizarIgreja(id: number, formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const nome = formData.get('nomeIgreja') as string;
    const slug = formData.get('slug') as string;
    const plano = formData.get('plano') as string || 'FREE';

    try {
        // Usamos o prisma global porque estamos a editar um Tenant
        const slugExiste = await prisma.tenant.findFirst({
            where: { slug, NOT: { id } }
        });

        if (slugExiste) return { error: 'Este identificador (slug) já está a ser usado por outra igreja.' };

        await prisma.tenant.update({
            where: { id },
            data: {
                nome,
                slug: slug.toLowerCase().replace(/\s+/g, '-'),
                plano
            }
        });

        await registarAcaoSA(session.saId, 'EDITAR_IGREJA', `Igreja ${id}: nome "${nome}", slug "${slug}", plano ${plano}`)
        revalidatePath('/super-admin/igrejas');
        return { success: true, message: `Igreja atualizada com sucesso!` };

    } catch (error) {
        console.error("Erro ao atualizar igreja:", error);
        return { error: 'Erro interno ao tentar atualizar a igreja.' };
    }
}

// ── GESTÃO DE PLANOS E MÓDULOS ───────────────────────────────────────────────

export async function buscarIgrejaComModulos(igrejaId: number) {
    await requireSAAuth()

    try {
        const igreja = await prisma.tenant.findUnique({
            where: { id: igrejaId },
            include: {
                _count: { select: { membros: true, congregacoes: true, departamentos: true } }
            }
        })

        if (!igreja) return { error: 'Igreja não encontrada.' }

        return { ok: true, data: igreja }
    } catch (error) {
        return { error: 'Erro ao buscar dados da igreja.' }
    }
}

export async function atualizarPlanoIgreja(igrejaId: number, plano: string) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    try {
        if (!PLANOS[plano as PlanoId]) {
            return { error: 'Plano inválido.' }
        }

        // Buscar plano anterior para histórico
        const igreja = await prisma.tenant.findUnique({ where: { id: igrejaId }, select: { plano: true } })
        const oldPlano = igreja?.plano || 'FREE'

        await prisma.tenant.update({
            where: { id: igrejaId },
            data: { plano, modulos_custom: null } // Reset custom ao mudar de plano
        })

        // Registar alteração no histórico
        if (oldPlano !== plano) {
            await prisma.planoHistorico.create({
                data: {
                    tenant_id: igrejaId,
                    plano_anterior: oldPlano,
                    plano_novo: plano,
                    alterado_por: session.email,
                },
            })
            await registarAcaoSA(session.saId, 'ALTERAR_PLANO', `Igreja ${igrejaId}: ${oldPlano} → ${plano}`)
        }

        revalidatePath('/super-admin/igrejas')
        revalidatePath(`/super-admin/igrejas/${igrejaId}/modulos`)
        revalidatePath('/super-admin/billing')
        return { ok: true }
    } catch (error) {
        return { error: 'Erro ao atualizar plano.' }
    }
}

export async function atualizarModulosCustom(igrejaId: number, modulos: string[]) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    try {
        // Valida que todos os módulos são válidos
        const modulosValidos = Object.values(MODULOS) as string[]
        const invalidos = modulos.filter(m => !modulosValidos.includes(m))
        if (invalidos.length > 0) {
            return { error: `Módulos inválidos: ${invalidos.join(', ')}` }
        }

        await prisma.tenant.update({
            where: { id: igrejaId },
            data: { modulos_custom: modulos.length > 0 ? modulos : null }
        })
        await registarAcaoSA(session.saId, 'ALTERAR_MODULOS', `Igreja ${igrejaId}: ${modulos.length > 0 ? modulos.join(', ') : 'os do plano'}`)

        revalidatePath('/super-admin/igrejas')
        revalidatePath(`/super-admin/igrejas/${igrejaId}/modulos`)
        return { ok: true }
    } catch (error) {
        return { error: 'Erro ao atualizar módulos.' }
    }
}

// ── ONBOARDING ─────────────────────────────────────────────────────────────

export async function atualizarBrandingIgreja(tenantId: number, formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const logo_url = formData.get('logo_url') as string || null
    const cor_primaria = formData.get('cor_primaria') as string || '#3F6B4F'
    const cor_secundaria = formData.get('cor_secundaria') as string || '#7FAE93'

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { logo_url, cor_primaria, cor_secundaria },
        })
        await registarAcaoSA(session.saId, 'ALTERAR_BRANDING', `Igreja ${tenantId}`)

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Branding atualizado com sucesso.' }
    } catch (error) {
        console.error('Erro ao atualizar branding:', error)
        return { error: 'Erro ao atualizar branding.' }
    }
}

export async function criarCongregacaoSA(tenantId: number, formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const nome = formData.get('nome') as string
    const cidade = formData.get('cidade') as string
    const endereco = formData.get('endereco') as string

    if (!nome || !cidade || !endereco) {
        return { error: 'Preencha todos os campos obrigatórios.' }
    }

    try {
        await prisma.congregacao.create({
            data: { nome, cidade, endereco, tenant_id: tenantId },
        })
        await registarAcaoSA(session.saId, 'CRIAR_CONGREGACAO', `Igreja ${tenantId}: ${nome} (${cidade})`)

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Congregação criada com sucesso.' }
    } catch (error) {
        console.error('Erro ao criar congregação:', error)
        return { error: 'Erro ao criar congregação.' }
    }
}

export async function atualizarCongregacaoSA(tenantId: number, congregacaoId: number, formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const nome = (formData.get('nome') as string)?.trim()
    const cidade = (formData.get('cidade') as string)?.trim()
    const endereco = (formData.get('endereco') as string)?.trim()

    if (!nome || !cidade || !endereco) {
        return { error: 'Preencha todos os campos obrigatórios.' }
    }

    try {
        // So a congregacao desta igreja (o id sozinho nao chega)
        const r = await prisma.congregacao.updateMany({
            where: { id: congregacaoId, tenant_id: tenantId },
            data: { nome, cidade, endereco },
        })
        if (r.count === 0) return { error: 'Congregação não encontrada nesta igreja.' }
        await registarAcaoSA(session.saId, 'EDITAR_CONGREGACAO', `Igreja ${tenantId}, congregação ${congregacaoId}: ${nome} (${cidade})`)

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Congregação atualizada.' }
    } catch (error) {
        console.error('Erro ao atualizar congregação:', error)
        return { error: 'Erro ao atualizar congregação.' }
    }
}

export async function criarDepartamentoSA(tenantId: number, formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const nome = formData.get('nome') as string
    const descricao = formData.get('descricao') as string || null
    const is_global = formData.get('is_global') === 'true'

    if (!nome) {
        return { error: 'Nome do departamento é obrigatório.' }
    }

    try {
        await prisma.departamento.create({
            data: { nome, descricao, is_global, tenant_id: tenantId },
        })
        await registarAcaoSA(session.saId, 'CRIAR_DEPARTAMENTO', `Igreja ${tenantId}: ${nome}`)

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Departamento criado com sucesso.' }
    } catch (error) {
        console.error('Erro ao criar departamento:', error)
        return { error: 'Erro ao criar departamento.' }
    }
}

/**
 * Apagar uma congregação: o que estava ligado a ela (membros, departamentos,
 * grupos, eventos…) fica "sem congregação" — nada se perde.
 */
export async function eliminarCongregacaoSA(tenantId: number, congregacaoId: number) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    try {
        const c = await prisma.congregacao.findFirst({
            where: { id: congregacaoId, tenant_id: tenantId },
            select: { id: true, nome: true, _count: { select: { membros: true, departamentos: true, grupos: true } } },
        })
        if (!c) return { error: 'Congregação não encontrada nesta igreja.' }

        // Os departamentos dela passam a gerais: o nome não pode repetir um geral que já exista
        const repetidos = await prisma.departamento.findMany({
            where: { tenant_id: tenantId, congregacaoId: c.id, nome: { in: (await prisma.departamento.findMany({ where: { tenant_id: tenantId, congregacaoId: null }, select: { nome: true } })).map(d => d.nome) } },
            select: { nome: true },
        })
        if (repetidos.length > 0) {
            return { error: `Há departamentos com o mesmo nome noutra parte da igreja (${repetidos.map(d => d.nome).join(', ')}). Mude o nome ou apague-os primeiro.` }
        }

        await prisma.congregacao.delete({ where: { id: c.id } })
        const ficou = [
            c._count.membros && `${c._count.membros} membro(s)`,
            c._count.departamentos && `${c._count.departamentos} departamento(s)`,
            c._count.grupos && `${c._count.grupos} grupo(s)`,
        ].filter(Boolean).join(', ')
        await registarAcaoSA(session.saId, 'ELIMINAR_CONGREGACAO', `Igreja ${tenantId}: ${c.nome}${ficou ? ` (ficaram sem congregação: ${ficou})` : ''}`)

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: ficou ? `Congregação apagada. Ficaram sem congregação: ${ficou}.` : 'Congregação apagada.' }
    } catch (error) {
        console.error('Erro ao apagar congregação:', error)
        return { error: 'Erro ao apagar a congregação.' }
    }
}

export async function atualizarDepartamentoSA(tenantId: number, departamentoId: number, formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const nome = (formData.get('nome') as string)?.trim()
    const descricao = (formData.get('descricao') as string)?.trim() || null
    const is_global = formData.get('is_global') === 'true'
    if (!nome) return { error: 'Nome do departamento é obrigatório.' }

    try {
        const d = await prisma.departamento.findFirst({ where: { id: departamentoId, tenant_id: tenantId }, select: { id: true, nome: true, congregacaoId: true } })
        if (!d) return { error: 'Departamento não encontrado nesta igreja.' }
        const repetido = await prisma.departamento.findFirst({
            where: { tenant_id: tenantId, congregacaoId: d.congregacaoId, nome, id: { not: d.id } },
            select: { id: true },
        })
        if (repetido) return { error: `Já existe um departamento "${nome}" nesta parte da igreja.` }

        await prisma.departamento.update({ where: { id: d.id }, data: { nome, descricao, is_global } })
        await registarAcaoSA(session.saId, 'EDITAR_DEPARTAMENTO', `Igreja ${tenantId}, departamento ${d.id}: ${d.nome}${d.nome !== nome ? ` → ${nome}` : ''}`)

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Departamento atualizado.' }
    } catch (error) {
        console.error('Erro ao atualizar departamento:', error)
        return { error: 'Erro ao atualizar o departamento.' }
    }
}

/**
 * Apagar um departamento. Na base, isso apaga em cascata as escalas, os
 * integrantes e os avisos dele — por isso só deixamos quando não há escalas.
 */
export async function eliminarDepartamentoSA(tenantId: number, departamentoId: number) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    try {
        const d = await prisma.departamento.findFirst({
            where: { id: departamentoId, tenant_id: tenantId },
            select: { id: true, nome: true, _count: { select: { escalas: true, integrantes: true } } },
        })
        if (!d) return { error: 'Departamento não encontrado nesta igreja.' }
        if (d._count.escalas > 0) {
            return { error: `"${d.nome}" tem ${d._count.escalas} escala(s): apagar levava-as também. Mude-lhe o nome em vez de o apagar.` }
        }

        await prisma.departamento.delete({ where: { id: d.id } })
        await registarAcaoSA(session.saId, 'ELIMINAR_DEPARTAMENTO', `Igreja ${tenantId}: ${d.nome} (${d._count.integrantes} integrante(s) saíram)`)

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: d._count.integrantes ? `Departamento apagado (${d._count.integrantes} integrante(s) saíram dele).` : 'Departamento apagado.' }
    } catch (error) {
        console.error('Erro ao apagar departamento:', error)
        return { error: 'Erro ao apagar o departamento.' }
    }
}

export async function atualizarAdminIgreja(tenantId: number, formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
        const admin = await prisma.membro.findFirst({
            where: { tenant_id: tenantId, role: 'ADMIN' },
        })

        if (!admin) return { error: 'Admin não encontrado.' }

        const data: any = {}
        if (email && email !== admin.email) {
            const emailExiste = await prisma.membro.findUnique({ where: { email } })
            if (emailExiste && emailExiste.id !== admin.id) {
                return { error: 'Este e-mail já está em uso.' }
            }
            data.email = email
        }
        if (password) {
            const motivoSenha = validarSenhaNova(password, email || admin.email)
            if (motivoSenha) return { error: motivoSenha }
            data.password = await bcrypt.hash(password, 10)
        }

        if (Object.keys(data).length > 0) {
            await prisma.membro.update({ where: { id: admin.id }, data })
            await registarAcaoSA(session.saId, 'EDITAR_ADMIN_IGREJA', `Igreja ${tenantId}, membro ${admin.id}: ${[data.email && `email → ${data.email}`, data.password && 'nova palavra-passe'].filter(Boolean).join(', ')}`)
        }

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Admin atualizado com sucesso.' }
    } catch (error) {
        console.error('Erro ao atualizar admin:', error)
        return { error: 'Erro ao atualizar admin.' }
    }
}

export async function marcarOnboardingCompleto(tenantId: number) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { onboarding_completo: true },
        })
        await registarAcaoSA(session.saId, 'ONBOARDING_CONCLUIDO', `Igreja ${tenantId}`)

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        revalidatePath('/super-admin/dashboard')
        return { ok: true, message: 'Onboarding concluído!' }
    } catch (error) {
        console.error('Erro ao marcar onboarding:', error)
        return { error: 'Erro ao concluir onboarding.' }
    }
}

// ── BILLING ────────────────────────────────────────────────────────────────

export async function atualizarBilling(tenantId: number, formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const valor_mensal = Number(formData.get('valor_mensal')) || null
    const plano_inicio = formData.get('plano_inicio') as string || null
    const plano_fim = formData.get('plano_fim') as string || null

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                valor_mensal,
                plano_inicio: plano_inicio ? new Date(plano_inicio) : null,
                plano_fim: plano_fim ? new Date(plano_fim) : null,
            },
        })
        await registarAcaoSA(session.saId, 'ALTERAR_FATURACAO', `Igreja ${tenantId}: ${valor_mensal ?? 0} €/mês, ${plano_inicio || '—'} a ${plano_fim || '—'}`)

        revalidatePath('/super-admin/billing')
        return { ok: true, message: 'Facturação atualizada com sucesso.' }
    } catch (error) {
        console.error('Erro ao atualizar billing:', error)
        return { error: 'Erro ao atualizar facturação.' }
    }
}

export async function suspenderIgreja(tenantId: number) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'SUSPENSO' },
        })
        await registarAcaoSA(session.saId, 'SUSPENDER_IGREJA', `Igreja ${tenantId}`)

        revalidatePath('/super-admin/billing')
        revalidatePath('/super-admin/igrejas')
        return { ok: true, message: 'Igreja suspensa.' }
    } catch (error) {
        console.error('Erro ao suspender igreja:', error)
        return { error: 'Erro ao suspender igreja.' }
    }
}

export async function ativarIgreja(tenantId: number) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'ATIVO' },
        })
        await registarAcaoSA(session.saId, 'ATIVAR_IGREJA', `Igreja ${tenantId}`)

        revalidatePath('/super-admin/billing')
        revalidatePath('/super-admin/igrejas')
        return { ok: true, message: 'Igreja ativada.' }
    } catch (error) {
        console.error('Erro ao ativar igreja:', error)
        return { error: 'Erro ao ativar igreja.' }
    }
}

// ── GESTAO DE SUPER ADMINS ──────────────────────────────────────────────────

export async function criarSuperAdmin(formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const nome = (formData.get('nome') as string)?.trim()
    // O login passa o email a minúsculas: guardar igual, senão a conta nunca entra
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string
    const role = formData.get('role') as string

    try {
        if (!nome || !email || !password || !role) {
            return { error: 'Preencha todos os campos.' }
        }

        if (!PAPEIS_SA.includes(role as PapelSA)) return { error: 'Papel inválido.' }

        const motivoSenha = validarSenhaNova(password, email)
        if (motivoSenha) return { error: motivoSenha }

        const existe = await prisma.superAdmin.findUnique({ where: { email } })
        if (existe) return { error: 'Este email já esta em uso.' }

        const hashedPassword = await bcrypt.hash(password, 10)

        await prisma.superAdmin.create({
            data: {
                nome,
                email,
                password: hashedPassword,
                role,
                is_active: true,
            },
        })
        await registarAcaoSA(session.saId, 'CRIAR_SA', `${email} (${role})`)

        revalidatePath('/super-admin/admins')
        return { success: true }
    } catch (error) {
        console.error('Erro ao criar super admin:', error)
        return { error: 'Erro interno ao criar administrador.' }
    }
}

export async function toggleSuperAdmin(saId: number) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    try {
        const sa = await prisma.superAdmin.findUnique({ where: { id: saId } })
        if (!sa) return { error: 'Administrador não encontrado.' }
        if (sa.is_active) {
            if (saId === session.saId) return { error: 'Não pode desativar a sua própria conta.' }
            if (sa.role === 'ADMIN' && !(await haOutroAdminAtivo(saId))) return { error: 'É o único ADMIN ativo: crie ou ative outro antes.' }
        }

        await prisma.superAdmin.update({
            where: { id: saId },
            data: { is_active: !sa.is_active },
        })
        await registarAcaoSA(session.saId, sa.is_active ? 'DESATIVAR_SA' : 'ATIVAR_SA', `${sa.email}`)

        revalidatePath('/super-admin/admins')
        return { success: true }
    } catch (error) {
        console.error('Erro ao toggle super admin:', error)
        return { error: 'Erro interno.' }
    }
}

// ── IMPERSONACAO ────────────────────────────────────────────────────────────

/**
 * Entrar numa igreja como o seu administrador (suporte). Precisa de um motivo;
 * a sessão fica marcada (faixa no topo, auditoria "X (Cloud) como …") e dura 2 horas.
 */
export async function impersonarIgreja(tenantId: number, motivo: string) {
    const session = await exigirPapelSA('SUPPORT')
    if ('error' in session) return { error: session.error }

    const porque = (motivo ?? '').trim()
    if (porque.length < 5) return { error: 'Escreva o motivo (fica no registo).' }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, nome: true, plano: true } })
    if (!tenant) return { error: 'Igreja não encontrada.' }

    // O administrador mais antigo da igreja
    const admin = await prisma.membro.findFirst({
        where: { tenant_id: tenantId, role: 'ADMIN', is_active: true },
        orderBy: { id: 'asc' },
    })
    if (!admin) return { error: 'Admin não encontrado nesta igreja.' }

    await registarAcaoSA(session.saId, 'IMPERSONAR', `Igreja ${tenantId} (${tenant.nome}) como ${admin.first_name} ${admin.last_name} <${admin.email}> · motivo: ${porque.slice(0, 300)}`)

    // Sessao de membro (o admin dessa igreja), so por 2 horas, marcada como do Cloud
    await criarSessaoMembro({ ...admin, plano: tenant.plano }, 60 * 60 * 2, session.saId)

    redirect('/membros/dashboard')
}

/** Sair da impersonação: fecha a sessão de membro e volta ao Cloud. */
export async function terminarImpersonacao() {
    const { getSessionData } = await import('@/lib/auth-utils')
    const membro = await getSessionData()
    if (membro?.impersonadoPor) {
        await registarAcaoSA(membro.impersonadoPor.saId, 'FIM_IMPERSONAR', `Igreja ${membro.tenantId}, membro ${membro.membroId}`)
    }
    await apagarSessaoMembro()
    redirect(membro?.impersonadoPor ? '/super-admin/dashboard' : '/membros/login')
}

// ── COMUNICACAO / AVISOS ────────────────────────────────────────────────────

export async function enviarAviso(formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const titulo = formData.get('titulo') as string
    const mensagem = formData.get('mensagem') as string
    const tipo = formData.get('tipo') as string
    const tenantIdRaw = formData.get('tenant_id')
    const tenant_id = tenantIdRaw ? Number(tenantIdRaw) : null

    try {
        if (!titulo || !mensagem || !tipo) {
            return { error: 'Preencha todos os campos obrigatórios.' }
        }

        await prisma.avisoPlataforma.create({
            data: { titulo, mensagem, tipo, tenant_id },
        })
        await registarAcaoSA(session.saId, 'ENVIAR_AVISO', `${tipo} "${titulo}" para ${tenant_id ? `igreja ${tenant_id}` : 'todas as igrejas'}`)

        revalidatePath('/super-admin/comunicacao')
        return { success: true }
    } catch (error) {
        console.error('Erro ao enviar aviso:', error)
        return { error: 'Erro interno ao enviar aviso.' }
    }
}

// ── GESTAO DE SUPER ADMINS (avancado) ────────────────────────────────────────

export async function alterarRoleSA(saId: number, novoRole: string) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    if (!PAPEIS_SA.includes(novoRole as PapelSA)) {
        return { error: 'Papel inválido.' }
    }

    try {
        const sa = await prisma.superAdmin.findUnique({ where: { id: saId }, select: { role: true, is_active: true, email: true } })
        if (!sa) return { error: 'Administrador não encontrado.' }
        if (sa.role === 'ADMIN' && novoRole !== 'ADMIN' && sa.is_active && !(await haOutroAdminAtivo(saId))) {
            return { error: 'É o único ADMIN ativo: dê o papel ADMIN a outra conta antes.' }
        }

        await prisma.superAdmin.update({
            where: { id: saId },
            data: { role: novoRole },
        })

        await registarAcaoSA(session.saId, 'ALTERAR_ROLE_SA', `${sa.email}: ${sa.role} → ${novoRole}`)

        revalidatePath('/super-admin/admins')
        return { success: true }
    } catch {
        return { error: 'Erro ao alterar role.' }
    }
}

export async function eliminarSA(saId: number) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    if (saId === session.saId) return { error: 'Não pode eliminar a sua própria conta.' }

    try {
        const sa = await prisma.superAdmin.findUnique({ where: { id: saId }, select: { role: true, is_active: true, email: true, _count: { select: { logs: true } } } })
        if (!sa) return { error: 'Administrador não encontrado.' }
        if (sa.role === 'ADMIN' && sa.is_active && !(await haOutroAdminAtivo(saId))) return { error: 'É o único ADMIN ativo.' }
        // O registo de ações tem de continuar a dizer quem fez o quê
        if (sa._count.logs > 0) return { error: 'Esta conta tem ações registadas: desative-a em vez de a eliminar.' }

        await prisma.superAdmin.delete({ where: { id: saId } })

        await registarAcaoSA(session.saId, 'ELIMINAR_SA', `${sa.email}`)

        revalidatePath('/super-admin/admins')
        return { success: true }
    } catch {
        return { error: 'Erro ao eliminar administrador.' }
    }
}

// ── TEMA DA IGREJA ──────────────────────────────────────────────────────────

export async function atualizarTemaIgreja(formData: FormData) {
    const session = await exigirPapelSA('ADMIN')
    if ('error' in session) return { error: session.error }

    const tenantId = Number(formData.get('tenantId'))
    const cor_primaria = String(formData.get('cor_primaria') || '#3F6B4F')
    const cor_secundaria = String(formData.get('cor_secundaria') || '#7FAE93')
    const cor_fundo = String(formData.get('cor_fundo') || '#0b0d0c')

    if (!tenantId) return { error: 'ID da igreja obrigatório.' }

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { cor_primaria, cor_secundaria, cor_fundo },
        })

        await registarAcaoSA(session.saId, 'ALTERAR_TEMA', `Igreja ${tenantId}: ${cor_primaria}, ${cor_secundaria}, ${cor_fundo}`)

        revalidatePath(`/super-admin/igrejas/${tenantId}/tema`)
        return { success: true }
    } catch (error) {
        console.error('Erro ao atualizar tema:', error)
        return { error: 'Erro interno ao atualizar tema.' }
    }
}

export async function buscarTemaIgreja(tenantId: number) {
    await requireSAAuth()

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, nome: true, slug: true, cor_primaria: true, cor_secundaria: true, cor_fundo: true, logo_url: true },
    })

    return tenant
}

/** Há outra conta ADMIN ativa além desta? (para nunca ficar sem quem gere o Cloud) */
async function haOutroAdminAtivo(excetoId: number) {
    return (await prisma.superAdmin.count({ where: { role: 'ADMIN', is_active: true, id: { not: excetoId } } })) > 0
}
