'use server'
// actions/visitante-actions.ts

import prisma from '@/lib/prisma'
import { getSessionData } from '@/lib/auth-utils'
import { exigirAcolhimento, equipaAcolhimento } from '@/lib/acolhimento-permissions'
import { lerDataContacto } from '@/lib/acolhimento-prazos'
import { registarVisita, telefoneValido, ORIGENS_MANUAIS } from '@/lib/visitante-registo'
import { revalidatePath } from 'next/cache'
import { audit } from '@/lib/audit'

// ATUALIZA ESTA LINHA ABAIXO:
import { enviarEmailNotificacaoEquipa } from '@/lib/mail';

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
        await exigirAcolhimento('MEMBRO', visitante_id);

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
        await exigirAcolhimento('MEMBRO', visitanteId);
        const tipoContacto = formData.get('tipo_contacto') as string;
        const observacoes = formData.get('observacoes') as string;
        const novoStatus = formData.get('status') as string;
        const quantidadeVisitas = Number(formData.get('quantidade_visitas')) || 1;
        // Depois de um contacto, a data marcada fica cumprida: vale a nova (ou nenhuma).
        let proximoContacto: Date | null
        try { proximoContacto = lerDataContacto(String(formData.get('proximo_contacto') ?? '')) } catch { return { error: "Data do próximo contacto inválida." } }

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
                data_ultima_visita: new Date(),
                proximo_contacto: proximoContacto
            }
        });

        // 3. Se CONSOLIDADO → criar membro automaticamente
        if (novoStatus === 'CONSOLIDADO') {
            try {
                const nomeParts = visitanteAtualizado.nome.trim().split(' ')
                const firstName = nomeParts[0] || 'Membro'
                const lastName = nomeParts.slice(1).join(' ') || ''

                // Conta sem senha: a pessoa define-a pelo link do email de boas-vindas.

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
                            password: null,
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
                        descricao: `Membro criado automaticamente a partir do visitante "${visitanteAtualizado.nome}" (consolidacao). Sem senha: recebe link para a definir.`,
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

                    // Email de boas-vindas com o link para definir a palavra-passe
                    const temEmail = !!novoMembro.email && !novoMembro.email.includes('@temp.admvc.org')
                    let emailEnviado = false
                    try {
                        if (temEmail) {
                            const { enviarEmailBoasVindas } = await import('@/lib/mail')
                            const { criarLinkRedefinir } = await import('@/lib/redefinir-senha')
                            const r = await enviarEmailBoasVindas(firstName, novoMembro.email, await criarLinkRedefinir(novoMembro))
                            emailEnviado = !!r?.ok
                        }
                    } catch (err) { console.error('[CONSOLIDACAO] Falha ao enviar email boas-vindas:', err) }

                    revalidatePath('/departamentos/acolhimento/dashboard');
                    revalidatePath('/admin/membros');
                    return {
                        ok: true,
                        novoStatus,
                        credenciais: {
                            email: temEmail ? novoMembro.email : null,
                            emailEnviado,
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

export async function atribuirResponsavel(visitanteId: number, responsavelId: number | null) {
    try {
        const session = await exigirAcolhimento('LIDER', visitanteId);

        const membro = await prisma.membro.findUnique({ where: { id: session.membroId } });
        if (!membro) return { error: "Membro não encontrado." };

        // Só alguém da equipa de acolhimento (null = tirar o responsável)
        let nomeResponsavel = ''
        if (responsavelId) {
            const equipa = await equipaAcolhimento(session.tenantId);
            const escolhido = equipa.find(m => m.id === responsavelId);
            if (!escolhido) return { error: "Essa pessoa não é da equipa de acolhimento." };
            nomeResponsavel = escolhido.nome
        }

        await prisma.visitante.update({
            where: { id: visitanteId },
            data: { responsavel_id: responsavelId || null }
        });

        await prisma.acompanhamentoVisitante.create({
            data: {
                tenant_id: membro.tenant_id,
                visitante_id: visitanteId,
                membro_id: session.membroId,
                tipo_contacto: 'PRESENCIAL',
                tipo_evento: 'ATRIBUICAO',
                observacoes: nomeResponsavel ? `Responsável: ${nomeResponsavel}` : 'Responsável retirado',
            }
        });

        audit({
            tenant_id: membro.tenant_id,
            categoria: 'VISITANTES',
            acao: 'EDITAR',
            actor_id: session.membroId,
            alvo_id: visitanteId,
            alvo_tipo: 'VISITANTE',
            descricao: nomeResponsavel ? `Responsável atribuído: ${nomeResponsavel}` : 'Responsável retirado',
        }).catch((err) => console.error('[VISITANTE] Falha no audit:', err));

        revalidatePath('/departamentos/acolhimento/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao atribuir responsavel:", error);
        return { error: "Falha ao atribuir responsável." };
    }
}

export async function guardarNotaLider(visitanteId: number, nota: string) {
    try {
        const session = await exigirAcolhimento('LIDER', visitanteId);

        const membro = await prisma.membro.findUnique({ where: { id: session.membroId } });
        if (!membro) return { error: "Membro não encontrado." };

        nota = nota.trim()
        await prisma.visitante.update({
            where: { id: visitanteId },
            data: { notas_lider: nota || null }
        });

        await prisma.acompanhamentoVisitante.create({
            data: {
                tenant_id: membro.tenant_id,
                visitante_id: visitanteId,
                membro_id: session.membroId,
                tipo_contacto: 'PRESENCIAL',
                tipo_evento: 'NOTA_LIDER',
                observacoes: nota || 'Nota apagada',
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
        await exigirAcolhimento('MEMBRO', visitanteId);

        let proximo: Date | null
        try { proximo = lerDataContacto(data) } catch { return { error: "Data inválida." } }

        await prisma.visitante.update({
            where: { id: visitanteId },
            data: { proximo_contacto: proximo }
        });

        revalidatePath('/departamentos/acolhimento/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao agendar contacto:", error);
        return { error: "Falha ao agendar." };
    }
}

/**
 * Registo feito pela equipa (quem chega ao culto sem telemóvel ou sem QR).
 * Se o telefone já existe, soma a visita a esse visitante em vez de duplicar.
 */
export async function registarVisitanteAction(formData: FormData) {
    try {
        const session = await exigirAcolhimento('MEMBRO');

        const nome = String(formData.get('nome') ?? '').trim();
        const telefone = String(formData.get('telefone') ?? '').trim();
        const email = String(formData.get('email') ?? '').trim().toLowerCase();
        const pedido = String(formData.get('pedido_oracao') ?? '').trim();
        const origem = String(formData.get('origem') ?? 'PRESENCIAL');

        if (!nome || !telefone) return { error: "Nome e telefone são obrigatórios." };
        if (!telefoneValido(telefone)) return { error: "Telefone inválido (9 a 15 dígitos)." };
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido." };
        if (!(ORIGENS_MANUAIS as readonly string[]).includes(origem)) return { error: "Origem inválida." };
        // RGPD: a pessoa tem de ter autorizado que a igreja guarde os dados
        if (formData.get('consentimento') !== 'on') return { error: "Confirme que a pessoa autorizou guardar os dados." };

        const congregacaoId = Number(formData.get('congregacao_id')) || null;
        const congregacao = congregacaoId ? await congregacaoDaIgreja(congregacaoId, session.tenantId) : null;
        if (congregacaoId && !congregacao) return { error: "Congregação não encontrada." };

        const r = await registarVisita(prisma, {
            tenantId: session.tenantId, nome, telefone, email: email || null, pedido: pedido || null, origem, congregacao,
        }, session.membroId);

        audit({
            tenant_id: session.tenantId,
            categoria: 'VISITANTES',
            acao: r.novo ? 'CRIAR' : 'EDITAR',
            actor_id: session.membroId,
            alvo_id: r.id,
            alvo_nome: r.nome,
            alvo_tipo: 'VISITANTE',
            descricao: r.novo ? 'Visitante registado pela equipa' : `Visita somada (${r.visitas}.ª)${r.reativado ? ', voltou aos novos' : ''}`,
        }).catch((err) => console.error('[VISITANTE] Falha no audit:', err));

        revalidatePath('/departamentos/acolhimento/dashboard');
        return { ok: true, ...r };
    } catch (error) {
        console.error("Erro ao registar visitante:", error);
        return { error: error instanceof Error && error.message.startsWith('Só ') ? error.message : "Falha ao registar o visitante." };
    }
}

async function congregacaoDaIgreja(id: number, tenantId: number) {
    return prisma.congregacao.findFirst({ where: { id, tenant_id: tenantId }, select: { id: true, nome: true } });
}

/** Em que congregação esteve o visitante (null = nenhuma). Qualquer pessoa da equipa. */
export async function definirCongregacaoVisitante(visitanteId: number, congregacaoId: number | null) {
    try {
        const session = await exigirAcolhimento('MEMBRO', visitanteId);
        const congregacao = congregacaoId ? await congregacaoDaIgreja(congregacaoId, session.tenantId) : null;
        if (congregacaoId && !congregacao) return { error: "Congregação não encontrada." };

        await prisma.visitante.update({
            where: { id: visitanteId },
            data: { congregacao_id: congregacao?.id ?? null },
        });

        revalidatePath('/departamentos/acolhimento/dashboard');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao mudar a congregação do visitante:", error);
        return { error: "Falha ao guardar a congregação." };
    }
}


/** Apaga um registo de visitante (spam ou dados falsos). Os contactos dele vão juntos. */
export async function apagarVisitante(visitanteId: number) {
    try {
        const sessao = await exigirAcolhimento('LIDER', visitanteId)
        const v = await prisma.visitante.delete({ where: { id: visitanteId }, select: { id: true } })
        await audit({ tenant_id: sessao.tenantId, categoria: 'VISITANTES', acao: 'APAGAR', alvo_id: v.id, alvo_tipo: 'VISITANTE', descricao: `Visitante #${v.id} apagado (spam / dados falsos)` }).catch(() => {})
        revalidatePath('/departamentos/acolhimento/dashboard')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err?.message || 'Não foi possível apagar.' }
    }
}
