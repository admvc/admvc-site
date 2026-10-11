'use server'

import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { requireSAAuth, getSASession } from '@/lib/sa-auth'
import { type PlanoId, type Modulo, PLANOS, MODULOS } from '@/lib/planos'

export async function criarNovaIgreja(formData: FormData) {
    await requireSAAuth()

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

        revalidatePath('/super-admin/igrejas')
        return { success: true, message: `Igreja ${novaIgreja.nome} criada com sucesso!`, tenantId: novaIgreja.id };

    } catch (error) {
        console.error("Erro ao criar igreja:", error);
        return { error: 'Erro interno ao tentar criar a nova igreja.' };
    }
}


// Adicione isto no final de @/actions/super-admin-actions.ts

export async function atualizarIgreja(id: number, formData: FormData) {
    await requireSAAuth()

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

        revalidatePath('/super-admin/igrejas'); // Ajuste para a rota onde o painel vai ficar
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
    const session = await requireSAAuth()

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
    await requireSAAuth()

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

        revalidatePath('/super-admin/igrejas')
        revalidatePath(`/super-admin/igrejas/${igrejaId}/modulos`)
        return { ok: true }
    } catch (error) {
        return { error: 'Erro ao atualizar módulos.' }
    }
}

// ── ONBOARDING ─────────────────────────────────────────────────────────────

export async function atualizarBrandingIgreja(tenantId: number, formData: FormData) {
    await requireSAAuth()

    const logo_url = formData.get('logo_url') as string || null
    const cor_primaria = formData.get('cor_primaria') as string || '#3F6B4F'
    const cor_secundaria = formData.get('cor_secundaria') as string || '#7FAE93'

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { logo_url, cor_primaria, cor_secundaria },
        })

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Branding atualizado com sucesso.' }
    } catch (error) {
        console.error('Erro ao atualizar branding:', error)
        return { error: 'Erro ao atualizar branding.' }
    }
}

export async function criarCongregacaoSA(tenantId: number, formData: FormData) {
    await requireSAAuth()

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

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Congregação criada com sucesso.' }
    } catch (error) {
        console.error('Erro ao criar congregação:', error)
        return { error: 'Erro ao criar congregação.' }
    }
}

export async function criarDepartamentoSA(tenantId: number, formData: FormData) {
    await requireSAAuth()

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

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Departamento criado com sucesso.' }
    } catch (error) {
        console.error('Erro ao criar departamento:', error)
        return { error: 'Erro ao criar departamento.' }
    }
}

export async function atualizarAdminIgreja(tenantId: number, formData: FormData) {
    await requireSAAuth()

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
        if (password && password.length >= 6) {
            data.password = await bcrypt.hash(password, 10)
        }

        if (Object.keys(data).length > 0) {
            await prisma.membro.update({ where: { id: admin.id }, data })
        }

        revalidatePath(`/super-admin/onboarding/${tenantId}`)
        return { ok: true, message: 'Admin atualizado com sucesso.' }
    } catch (error) {
        console.error('Erro ao atualizar admin:', error)
        return { error: 'Erro ao atualizar admin.' }
    }
}

export async function marcarOnboardingCompleto(tenantId: number) {
    await requireSAAuth()

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { onboarding_completo: true },
        })

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
    await requireSAAuth()

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

        revalidatePath('/super-admin/billing')
        return { ok: true, message: 'Facturação atualizada com sucesso.' }
    } catch (error) {
        console.error('Erro ao atualizar billing:', error)
        return { error: 'Erro ao atualizar facturação.' }
    }
}

export async function suspenderIgreja(tenantId: number) {
    await requireSAAuth()

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'SUSPENSO' },
        })

        revalidatePath('/super-admin/billing')
        revalidatePath('/super-admin/igrejas')
        return { ok: true, message: 'Igreja suspensa.' }
    } catch (error) {
        console.error('Erro ao suspender igreja:', error)
        return { error: 'Erro ao suspender igreja.' }
    }
}

export async function ativarIgreja(tenantId: number) {
    await requireSAAuth()

    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'ATIVO' },
        })

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
    await requireSAAuth()

    const nome = formData.get('nome') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const role = formData.get('role') as string

    try {
        if (!nome || !email || !password || !role) {
            return { error: 'Preencha todos os campos.' }
        }

        if (password.length < 6) {
            return { error: 'Password deve ter no minimo 6 caracteres.' }
        }

        const existe = await prisma.superAdmin.findUnique({ where: { email } })
        if (existe) return { error: 'Este email ja esta em uso.' }

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

        revalidatePath('/super-admin/admins')
        return { success: true }
    } catch (error) {
        console.error('Erro ao criar super admin:', error)
        return { error: 'Erro interno ao criar administrador.' }
    }
}

export async function toggleSuperAdmin(saId: number) {
    await requireSAAuth()

    try {
        const sa = await prisma.superAdmin.findUnique({ where: { id: saId } })
        if (!sa) return { error: 'Administrador nao encontrado.' }

        await prisma.superAdmin.update({
            where: { id: saId },
            data: { is_active: !sa.is_active },
        })

        revalidatePath('/super-admin/admins')
        return { success: true }
    } catch (error) {
        console.error('Erro ao toggle super admin:', error)
        return { error: 'Erro interno.' }
    }
}

// ── IMPERSONACAO ────────────────────────────────────────────────────────────

export async function impersonarIgreja(tenantId: number) {
    const session = await getSASession()
    if (!session) throw new Error('Nao autenticado')

    // Find the tenant
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
            congregacoes: { take: 1, orderBy: { id: 'asc' } },
        },
    })
    if (!tenant) return { error: 'Igreja nao encontrada.' }

    // Find admin member of that church
    const admin = await prisma.membro.findFirst({
        where: { tenant_id: tenantId, role: 'ADMIN', is_active: true },
    })
    if (!admin) return { error: 'Admin nao encontrado nesta igreja.' }

    // Log the impersonation
    await prisma.superAdminLog.create({
        data: {
            sa_id: session.saId,
            acao: 'IMPERSONAR',
            detalhes: `Tenant ${tenantId} (${tenant.nome}) como membro ${admin.id} (${admin.email})`,
        },
    })

    // Create member session cookie
    const cong = tenant.congregacoes[0]
    const sessionData = `id:${admin.id}|email:${admin.email}|role:${admin.role}|tenant_id:${tenantId}|plano:${tenant.plano}${cong ? `|cong_id:${cong.id}|cong_nome:${cong.nome}` : ''}`

    const cookieStore = await cookies()
    cookieStore.set('admvc_session', sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 2, // 2 hours only for impersonation
        sameSite: 'lax',
    })

    redirect('/membros/dashboard')
}

// ── COMUNICACAO / AVISOS ────────────────────────────────────────────────────

export async function enviarAviso(formData: FormData) {
    await requireSAAuth()

    const titulo = formData.get('titulo') as string
    const mensagem = formData.get('mensagem') as string
    const tipo = formData.get('tipo') as string
    const tenantIdRaw = formData.get('tenant_id')
    const tenant_id = tenantIdRaw ? Number(tenantIdRaw) : null

    try {
        if (!titulo || !mensagem || !tipo) {
            return { error: 'Preencha todos os campos obrigatorios.' }
        }

        await prisma.avisoPlataforma.create({
            data: { titulo, mensagem, tipo, tenant_id },
        })

        revalidatePath('/super-admin/comunicacao')
        return { success: true }
    } catch (error) {
        console.error('Erro ao enviar aviso:', error)
        return { error: 'Erro interno ao enviar aviso.' }
    }
}

// ── GESTAO DE SUPER ADMINS (avancado) ────────────────────────────────────────

export async function alterarRoleSA(saId: number, novoRole: string) {
    'use server'
    const session = await requireSAAuth()

    if (!['ADMIN', 'VIEWER', 'SUPPORT'].includes(novoRole)) {
        return { error: 'Role inválido.' }
    }

    try {
        await prisma.superAdmin.update({
            where: { id: saId },
            data: { role: novoRole },
        })

        await prisma.superAdminLog.create({
            data: { sa_id: session.saId, acao: 'ALTERAR_ROLE_SA', detalhes: `SA ${saId} alterado para ${novoRole}` },
        })

        revalidatePath('/super-admin/admins')
        return { success: true }
    } catch {
        return { error: 'Erro ao alterar role.' }
    }
}

export async function eliminarSA(saId: number) {
    'use server'
    const session = await requireSAAuth()

    if (saId === session.saId) return { error: 'Nao pode eliminar a si mesmo.' }

    try {
        await prisma.superAdmin.delete({ where: { id: saId } })

        await prisma.superAdminLog.create({
            data: { sa_id: session.saId, acao: 'ELIMINAR_SA', detalhes: `SA ${saId} eliminado` },
        })

        revalidatePath('/super-admin/admins')
        return { success: true }
    } catch {
        return { error: 'Erro ao eliminar administrador.' }
    }
}

// ── TEMA DA IGREJA ──────────────────────────────────────────────────────────

export async function atualizarTemaIgreja(formData: FormData) {
    'use server'
    const session = await requireSAAuth()

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

        await prisma.superAdminLog.create({
            data: {
                sa_id: session.saId,
                acao: 'ALTERAR_TEMA',
                detalhes: `Tema atualizado para tenant ${tenantId}: ${cor_primaria}, ${cor_secundaria}, ${cor_fundo}`,
            },
        })

        revalidatePath(`/super-admin/igrejas/${tenantId}/tema`)
        return { success: true }
    } catch (error) {
        console.error('Erro ao atualizar tema:', error)
        return { error: 'Erro interno ao atualizar tema.' }
    }
}

export async function buscarTemaIgreja(tenantId: number) {
    'use server'
    await requireSAAuth()

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, nome: true, slug: true, cor_primaria: true, cor_secundaria: true, cor_fundo: true, logo_url: true },
    })

    return tenant
}