'use server'
// actions/visitante-actions.ts

import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { audit } from '@/lib/audit'

// ATUALIZA ESTA LINHA ABAIXO:
import { enviarEmailNotificacaoEquipa } from '@/lib/mail';

export async function registarVisitante(formData: FormData) {
    try {
        const nome = formData.get('nome') as string;
        const telefone = formData.get('telefone') as string;
        const pedido = formData.get('pedido_oracao') as string;

        // Recupera o tenant activo (formulário público, sem sessão)
        const tenant = await prisma.tenant.findFirst({
            where: { status: 'ATIVO' },
            orderBy: { id: 'asc' },
        }) ?? await prisma.tenant.findFirst({ orderBy: { id: 'asc' } });
        if (!tenant) throw new Error("Tenant não configurado.");

        const novoVisitante = await prisma.visitante.create({
            data: {
                tenant_id: tenant.id,
                nome: nome,
                telefone: telefone,
                pedido_oracao: pedido,
            }
        });

        audit({ tenant_id: tenant.id, categoria: 'VISITANTES', acao: 'CRIAR', alvo_nome: nome, alvo_tipo: 'VISITANTE', descricao: `Visitante "${nome}" registado` }).catch((err) => console.error('[VISITANTE] Falha no audit:', err))

        // Agora a função será reconhecida
        await enviarEmailNotificacaoEquipa({
            nome: nome,
            telefone: telefone,
            pedido: pedido
        });

        revalidatePath('/departamentos/acolhimento/dashboard');
        return { ok: true, data: novoVisitante };
    } catch (e) {
        console.error("Erro no registo:", e); // Agora vais ver o erro real se o Prisma falhar
        return { ok: false, error: "Ocorreu um erro ao registar." }
    }
}

export async function salvarRelatoRapido(formData: FormData) {
    try {
        // 1. Verificação de Segurança (Sessão do Membro)
        const session = await getSessionData();
        if (!session || !session.membroId) {
            return { ok: false, error: "Sessão expirada ou não autorizada." };
        }

        const membro = await prisma.membro.findUnique({
            where: { id: session.membroId }
        });

        if (!membro) {
            return { ok: false, error: "Membro não encontrado." };
        }

        // 2. Captura dos dados do formulário
        const visitante_id = Number(formData.get('visitante_id'));
        const relato = formData.get('relato') as string;

        if (!relato || relato.trim() === "") {
            return { ok: false, error: "O relato não pode estar vazio." };
        }

        // 3. Gravação do Acompanhamento (Histórico)
        await prisma.acompanhamentoVisitante.create({
            data: {
                tenant_id: membro.tenant_id,
                visitante_id,
                membro_id: session.membroId,
                tipo_contacto: 'WHATSAPP', // Definimos como padrão para o relato rápido
                observacoes: relato,
                data_contacto: new Date(),
            }
        });

        // 4. Atualização do Status do Visitante
        // Só avança para EM_CONTACTO se o visitante ainda estiver NOVO
        const visitanteAtual = await prisma.visitante.findUnique({
            where: { id: visitante_id },
            select: { status: true }
        });

        if (visitanteAtual && visitanteAtual.status === 'NOVO') {
            await prisma.visitante.update({
                where: { id: visitante_id },
                data: {
                    status: 'EM_CONTACTO',
                    data_ultima_visita: new Date()
                }
            });
        } else {
            // Apenas atualiza a data do último contacto sem alterar o status
            await prisma.visitante.update({
                where: { id: visitante_id },
                data: { data_ultima_visita: new Date() }
            });
        }

        audit({ tenant_id: membro.tenant_id, categoria: 'VISITANTES', acao: 'EDITAR', alvo_id: visitante_id, alvo_tipo: 'VISITANTE', descricao: `Relato registado para visitante #${visitante_id}` }).catch((err) => console.error('[VISITANTE] Falha no audit:', err))

        // 5. Revalidação das páginas para atualizar os dados no ecrã
        revalidatePath('/departamentos/acolhimento/dashboard');
        revalidatePath('/membros/dashboard');

        return { ok: true };

    } catch (error) {
        console.error("Erro ao salvar relato rápido:", error);
        return { ok: false, error: "Falha técnica ao gravar o relato." };
    }
}

export async function registarAcompanhamento(formData: FormData) {
    try {
        const session = await getSessionData();
        if (!session) return { error: "Sessão expirada." };

        const membro = await prisma.membro.findUnique({
            where: { id: session.membroId }
        });

        if (!membro) return { error: "Membro não encontrado." };

        const visitanteId = Number(formData.get('visitante_id'));
        const tipoContacto = formData.get('tipo_contacto') as string;
        const observacoes = formData.get('observacoes') as string;
        const novoStatus = formData.get('status') as string;
        const quantidadeVisitas = Number(formData.get('quantidade_visitas')) || 1;

        // Validar transição de status
        const statusValidos = ['NOVO', 'EM_CONTACTO', 'REUNIAO_PASTOR', 'CONSOLIDADO', 'NAO_RETORNOU', 'OUTRA_IGREJA', 'DESISTIU'] as const;
        if (!statusValidos.includes(novoStatus as any)) {
            return { error: "Status inválido." };
        }

        const visitanteAtual = await prisma.visitante.findUnique({
            where: { id: visitanteId },
            select: { status: true }
        });

        if (visitanteAtual?.status === 'CONSOLIDADO' && novoStatus !== 'CONSOLIDADO') {
            return { error: "Não é possível alterar o status de um visitante já consolidado." };
        }

        // 1. Grava o histórico do contacto
        await prisma.acompanhamentoVisitante.create({
            data: {
                tenant_id: membro.tenant_id,
                visitante_id: visitanteId,
                membro_id: session.membroId,
                tipo_contacto: tipoContacto,
                observacoes: observacoes,
                tipo_evento: 'CONTACTO',
            }
        });

        // 1b. Se houve mudança de status, grava evento de sistema
        if (visitanteAtual && visitanteAtual.status !== novoStatus) {
            await prisma.acompanhamentoVisitante.create({
                data: {
                    tenant_id: membro.tenant_id,
                    visitante_id: visitanteId,
                    membro_id: session.membroId,
                    tipo_contacto: tipoContacto,
                    tipo_evento: 'MUDANCA_STATUS',
                    status_anterior: visitanteAtual.status,
                    status_novo: novoStatus,
                    observacoes: `Status alterado de ${visitanteAtual.status} para ${novoStatus}`,
                }
            });
        }

        // 2. Atualiza o visitante
        const visitanteAtualizado = await prisma.visitante.update({
            where: { id: visitanteId },
            data: {
                status: novoStatus,
                quantidade_visitas: quantidadeVisitas,
                data_ultima_visita: new Date()
            }
        });

        // 3. Se CONSOLIDADO → criar membro automaticamente
        if (novoStatus === 'CONSOLIDADO') {
            try {
                const bcrypt = await import('bcryptjs')
                const nomeParts = visitanteAtualizado.nome.trim().split(' ')
                const firstName = nomeParts[0] || 'Membro'
                const lastName = nomeParts.slice(1).join(' ') || ''

                // Gerar senha temporária: primeiras 4 letras do nome + "2024!"
                const senhaTemp = (firstName.slice(0, 4).toLowerCase() + '2024!').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                const hashedPassword = await bcrypt.hash(senhaTemp, 10)

                // Verificar se ja existe membro com este visitante_id ou email
                const jaExiste = visitanteAtualizado.email
                    ? await prisma.membro.findFirst({ where: { email: visitanteAtualizado.email, tenant_id: membro.tenant_id } })
                    : null

                if (!jaExiste) {
                    const novoMembro = await prisma.membro.create({
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            email: visitanteAtualizado.email || `visitante${visitanteId}@temp.admvc.org`,
                            password: hashedPassword,
                            phone_1: visitanteAtualizado.telefone,
                            status: 'PENDENTE',
                            church_role: 'Visitante',
                            role: 'USER',
                            tenant_id: membro.tenant_id,
                            visitante_id: visitanteId,
                            is_active: true,
                        }
                    })

                    // Gerar QR Code
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
                    let rnd = ''; for (let i = 0; i < 4; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length))
                    await prisma.membro.update({
                        where: { id: novoMembro.id },
                        data: { qr_code: `ADMVC-${membro.tenant_id}-${novoMembro.id}-${rnd}` }
                    })

                    audit({
                        tenant_id: membro.tenant_id,
                        categoria: 'MEMBROS',
                        acao: 'CRIAR',
                        actor_id: session.membroId,
                        alvo_id: novoMembro.id,
                        alvo_nome: `${firstName} ${lastName}`,
                        alvo_tipo: 'MEMBRO',
                        descricao: `Membro criado automaticamente a partir do visitante "${visitanteAtualizado.nome}" (consolidacao). Senha temporaria: ${senhaTemp}`,
                    }).catch((err) => console.error('[CONSOLIDACAO] Falha no audit:', err))

                    // Auto-matricular no curso Permanecer (se existir)
                    try {
                        const tenant = await prisma.tenant.findUnique({
                            where: { id: membro.tenant_id },
                            select: { curso_permanecer_id: true }
                        })
                        if (tenant?.curso_permanecer_id) {
                            const turma = await prisma.turmaEBD.findFirst({
                                where: { curso_id: tenant.curso_permanecer_id }
                            })
                            if (turma) {
                                await prisma.matriculaEBD.create({
                                    data: {
                                        turma_id: turma.id,
                                        membro_id: novoMembro.id,
                                        tenant_id: membro.tenant_id,
                                    }
                                }).catch(() => {}) // ignora se ja matriculado
                            }
                        }
                    } catch (err) { console.error('[CONSOLIDACAO] Falha na auto-matricula Permanecer:', err) }

                    // Enviar email de boas-vindas com credenciais
                    try {
                        const { enviarEmailBoasVindas } = await import('@/lib/mail')
                        if (novoMembro.email && !novoMembro.email.includes('@temp.admvc.org')) {
                            await enviarEmailBoasVindas(firstName, novoMembro.email, senhaTemp)
                        }
                    } catch (err) { console.error('[CONSOLIDACAO] Falha ao enviar email boas-vindas:', err) }

                    revalidatePath('/departamentos/acolhimento/dashboard');
                    revalidatePath('/admin/membros');
                    return {
                        ok: true,
                        novoStatus,
                        credenciais: {
                            email: novoMembro.email,
                            senha: senhaTemp,
                        }
                    };
                }
            } catch (errConversao: any) {
                console.error('[CONSOLIDACAO] Erro ao converter visitante em membro:', errConversao.message)
                // Nao falha o acompanhamento — o visitante ja foi marcado como consolidado
            }
        }

        audit({
            tenant_id: membro.tenant_id,
            categoria: 'VISITANTES',
            acao: 'EDITAR',
            actor_id: session.membroId,
            alvo_id: visitanteId,
            alvo_nome: visitanteAtualizado.nome,
            alvo_tipo: 'VISITANTE',
            descricao: `Status alterado para ${novoStatus}`,
        }).catch((err) => console.error('[VISITANTE] Falha no audit:', err))

        revalidatePath('/departamentos/acolhimento/dashboard');
        revalidatePath('/admin/membros');
        return { ok: true, novoStatus };
    } catch (error) {
        console.error("Erro ao registar acompanhamento:", error);
        return { error: "Falha ao gravar os dados." };
    }
}

export async function atribuirResponsavel(visitanteId: number, responsavelId: number) {
    try {
        const session = await getSessionData();
        if (!session) return { error: "Sessao expirada." };

        const membro = await prisma.membro.findUnique({ where: { id: session.membroId } });
        if (!membro) return { error: "Membro nao encontrado." };

        const responsavel = await prisma.membro.findUnique({
            where: { id: responsavelId },
            select: { first_name: true, last_name: true }
        });
        if (!responsavel) return { error: "Responsavel nao encontrado." };

        await prisma.visitante.update({
            where: { id: visitanteId },
            data: { responsavel_id: responsavelId }
        });

        await prisma.acompanhamentoVisitante.create({
            data: {
                tenant_id: membro.tenant_id,
                visitante_id: visitanteId,
                membro_id: session.membroId,
                tipo_contacto: 'PRESENCIAL',
                tipo_evento: 'ATRIBUICAO',
                observacoes: `Responsavel atribuido: ${responsavel.first_name} ${responsavel.last_name}`,
            }
        });

        audit({
            tenant_id: membro.tenant_id,
            categoria: 'VISITANTES',
            acao: 'EDITAR',
            actor_id: session.membroId,
            alvo_id: visitanteId,
            alvo_tipo: 'VISITANTE',
            descricao: `Responsavel atribuido: ${responsavel.first_name}`,
        }).catch((err) => console.error('[VISITANTE] Falha no audit:', err));

        revalidatePath('/departamentos/acolhimento/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao atribuir responsavel:", error);
        return { error: "Falha ao atribuir responsavel." };
    }
}

export async function guardarNotaLider(visitanteId: number, nota: string) {
    try {
        const session = await getSessionData();
        if (!session) return { error: "Sessao expirada." };

        const membro = await prisma.membro.findUnique({ where: { id: session.membroId } });
        if (!membro) return { error: "Membro nao encontrado." };

        await prisma.visitante.update({
            where: { id: visitanteId },
            data: { notas_lider: nota }
        });

        await prisma.acompanhamentoVisitante.create({
            data: {
                tenant_id: membro.tenant_id,
                visitante_id: visitanteId,
                membro_id: session.membroId,
                tipo_contacto: 'PRESENCIAL',
                tipo_evento: 'NOTA_LIDER',
                observacoes: nota,
            }
        });

        revalidatePath('/departamentos/acolhimento/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao guardar nota:", error);
        return { error: "Falha ao guardar nota." };
    }
}

export async function agendarProximoContacto(visitanteId: number, data: string) {
    try {
        const session = await getSessionData();
        if (!session) return { error: "Sessao expirada." };

        await prisma.visitante.update({
            where: { id: visitanteId },
            data: { proximo_contacto: new Date(data) }
        });

        revalidatePath('/departamentos/acolhimento/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao agendar contacto:", error);
        return { error: "Falha ao agendar." };
    }
}