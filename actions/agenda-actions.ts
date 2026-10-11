'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend';
import { EmailConfirmacaoAgenda } from '@/components/emails/EmailConfirmacaoAgenda';
import { requireAuth, requireRole } from '@/lib/auth-utils'
import { sincronizarCompromissosGoogleCalendar } from '@/lib/google-calendar'

const resend = new Resend(process.env.RESEND_API_KEY);


export async function criarAgendaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])
        const nome = formData.get('nome') as string;
        const slug = (formData.get('slug') as string).toLowerCase().replace(/\s+/g, '-'); // Garante que fica formato-link
        const dono_id = Number(formData.get('dono_id'));
        const is_publica = formData.get('is_publica') === 'on';

        if (!nome || !slug || !dono_id) {
            return { ok: false, error: "Preencha todos os campos obrigatórios." };
        }

        // 1. Verifica se o link já está em uso
        const slugExiste = await prisma.agenda.findUnique({ where: { slug } });
        if (slugExiste) {
            return { ok: false, error: "Este link (URL) já está a ser utilizado por outra agenda." };
        }

        // 2. Verifica se o líder já tem uma agenda (só pode ter 1 principal)
        const donoExiste = await prisma.agenda.findUnique({ where: { dono_id } });
        if (donoExiste) {
            return { ok: false, error: "Este líder já possui uma agenda criada." };
        }

        // 3. Vai buscar o tenant_id do líder
        const dono = await prisma.membro.findUnique({ where: { id: dono_id }, select: { tenant_id: true } });
        if (!dono) return { ok: false, error: "Líder não encontrado." };

        // 4. Cria a Agenda
        await prisma.agenda.create({
            data: {
                tenant_id: dono.tenant_id,
                nome,
                slug,
                dono_id,
                is_publica
            }
        });

        revalidatePath('/gabinete');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao criar agenda:", error);
        return { ok: false, error: "Erro interno ao gravar na base de dados." };
    }
}

export async function editarAgendaAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])
        const id = Number(formData.get('id'));
        const nome = formData.get('nome') as string;
        const slug = (formData.get('slug') as string).toLowerCase().replace(/\s+/g, '-');
        const dono_id = Number(formData.get('dono_id'));
        const is_publica = formData.get('is_publica') === 'on';
        const gestores_ids = formData.getAll('gestores[]').map(id => Number(id));

        if (!id || !nome || !slug || !dono_id) {
            return { ok: false, error: "Preencha todos os campos obrigatórios." };
        }

        // Verifica se o slug já existe noutra agenda que não seja esta
        const slugExiste = await prisma.agenda.findFirst({
            where: { slug: slug, NOT: { id: id } }
        });

        if (slugExiste) {
            return { ok: false, error: "Este link já está a ser utilizado por outra agenda." };
        }

        await prisma.agenda.update({
            where: { id: id },
            data: { nome, slug, dono_id, is_publica, gestores: { set: gestores_ids.map(id => ({ id })) } }
        });

        revalidatePath('/gabinete');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao editar agenda:", error);
        return { ok: false, error: "Erro interno ao atualizar a base de dados." };
    }
}

export async function apagarAgendaAction(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])
        await prisma.agenda.delete({
            where: { id }
        });

        revalidatePath('/gabinete');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao apagar agenda:", error);
        return { ok: false, error: "Não foi possível apagar a agenda. Verifique se existem dependências." };
    }
}

export async function criarCompromissoAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])
        const agenda_id = Number(formData.get('agenda_id'));
        const titulo = formData.get('titulo') as string;
        const categoria = formData.get('categoria') as string;
        const dataStr = formData.get('data') as string;
        const hora_inicioStr = formData.get('hora_inicio') as string;
        const hora_fimStr = formData.get('hora_fim') as string;
        const observacoes = formData.get('observacoes') as string;
        const externos = formData.get('externos') as string;

        // Capturar múltiplos IDs
        const membros_ids = formData.getAll('membros[]').map(id => Number(id));
        const visitantes_ids = formData.getAll('visitantes[]').map(id => Number(id));
        const departamentos_ids = formData.getAll('departamentos[]').map(id => Number(id));
        // Capturar múltiplos IDs (Adiciona estas duas linhas)
        const grupos_ids = formData.getAll('grupos[]').map(id => Number(id));
        const celulas_ids = formData.getAll('celulas[]').map(id => Number(id));

        if (!agenda_id || !titulo || !dataStr || !hora_inicioStr || !hora_fimStr) {
            return { ok: false, error: "Preencha todos os campos obrigatórios." };
        }

        const data_inicio = new Date(`${dataStr}T${hora_inicioStr}:00`);
        const data_fim = new Date(`${dataStr}T${hora_fimStr}:00`);

        // Validar: não permitir marcar hora já passada
        if (data_inicio < new Date()) {
            return { ok: false, error: "Não é possível agendar para uma data/hora já passada." };
        }

        // 1. Vai buscar a agenda para saber qual é o tenant_id
        const agenda = await prisma.agenda.findUnique({ where: { id: agenda_id } });
        if (!agenda) return { ok: false, error: "Agenda não encontrada." };

        await prisma.compromisso.create({
            data: {
                tenant_id: agenda.tenant_id,
                agenda_id: agenda_id,
                titulo, 
                categoria, 
                data_inicio, 
                data_fim, 
                observacoes, 
                externos,
                // Conecta múltiplos registos ao mesmo tempo!
                membros: { connect: membros_ids.map(id => ({ id })) },
                visitantes: { connect: visitantes_ids.map(id => ({ id })) },
                departamentos: { connect: departamentos_ids.map(id => ({ id })) },
                grupos: { connect: grupos_ids.map(id => ({ id })) }
            }
        });

        const { revalidatePath } = await import('next/cache');
        revalidatePath('/gabinete');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao criar compromisso:", error);
        return { ok: false, error: "Falha ao gravar a marcação." };
    }
}

// MUDAR STATUS DO COMPROMISSO (Aprovar ou Cancelar)
export async function alterarStatusCompromisso(id: number, status: 'AGENDADO' | 'CANCELADO') {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])
        // 1. Atualiza o status E vai buscar os dados de quem vai à reunião
        const comp = await prisma.compromisso.update({
            where: { id },
            data: { status },
            include: {
                agenda: { include: { dono: true } },
                membros: true,
                visitantes: true
            }
        });

        // 2. SE FOI APROVADO, DISPARA O E-MAIL!
        if (status === 'AGENDADO') {
            const emailsParaEnviar: string[] = [];
            const nomesParaEmail: string[] = [];

            // Apanha o email dos membros
            comp.membros.forEach(m => {
                if (m.email) {
                    emailsParaEnviar.push(m.email);
                    nomesParaEmail.push(m.first_name);
                }
            });

            // Apanha o email dos visitantes (se tiverem esse campo preenchido)
            comp.visitantes.forEach(v => {
                // Assumindo que o visitante tem um campo email. Se não tiver no teu Prisma, apaga o if.
                if (v.email) {
                    emailsParaEnviar.push(v.email);
                    nomesParaEmail.push(v.nome.split(' ')[0]);
                }
            });

            // Se encontrámos alguém com e-mail, enviamos
            if (emailsParaEnviar.length > 0) {
                const dataStr = new Date(comp.data_inicio).toLocaleDateString('pt-PT');
                const horaStr = new Date(comp.data_inicio).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
                const pastorNome = `${comp.agenda.dono.first_name} ${comp.agenda.dono.last_name}`;

                await resend.emails.send({
                    from: 'ADMVC Gabinete <agenda@teusite.com>', // MUDA AQUI PARA O TEU DOMÍNIO VERIFICADO NO RESEND
                    to: emailsParaEnviar,
                    subject: `✅ Confirmado: ${comp.titulo} com ${pastorNome}`,
                    react: EmailConfirmacaoAgenda({
                        nome: nomesParaEmail.join(', '),
                        titulo: comp.titulo,
                        data: dataStr,
                        hora: horaStr,
                        pastor: pastorNome
                    })
                });
            }
        }

        const { revalidatePath } = await import('next/cache');
        revalidatePath('/gabinete');
        return { ok: true };
    } catch (error) {
        console.error("Erro ao atualizar status ou enviar email:", error);
        return { ok: false, error: "Erro ao atualizar o status." };
    }
}

// APAGAR COMPROMISSO (Definitivo)
export async function apagarCompromisso(id: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])
        await prisma.compromisso.delete({ where: { id } });
        const { revalidatePath } = await import('next/cache');
        revalidatePath('/gabinete');
        return { ok: true };
    } catch (error) {
        return { ok: false, error: "Erro ao apagar compromisso." };
    }
}

// ATUALIZAR HORÁRIOS DISPONÍVEIS DA AGENDA
// horarios: [{ dia_semana: 0-6, hora_inicio: "09:00", hora_fim: "12:00" }]
export interface HorarioDisponivel {
    dia_semana: number   // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    hora_inicio: string  // formato "HH:mm" (ex: "09:00")
    hora_fim: string     // formato "HH:mm" (ex: "12:00")
}

export async function atualizarHorariosDisponiveis(agendaId: number, horarios: HorarioDisponivel[]) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])

        // Validação básica dos horários
        for (const h of horarios) {
            if (h.dia_semana < 0 || h.dia_semana > 6) {
                return { ok: false, error: `Dia da semana inválido: ${h.dia_semana}. Use 0 (Domingo) a 6 (Sábado).` }
            }
            if (!/^\d{2}:\d{2}$/.test(h.hora_inicio) || !/^\d{2}:\d{2}$/.test(h.hora_fim)) {
                return { ok: false, error: `Formato de hora inválido. Use "HH:mm" (ex: "09:00").` }
            }
            if (h.hora_inicio >= h.hora_fim) {
                return { ok: false, error: `Hora de início (${h.hora_inicio}) deve ser anterior à hora de fim (${h.hora_fim}).` }
            }
        }

        await prisma.agenda.update({
            where: { id: agendaId },
            data: { horarios_disponiveis: horarios as any }
        })

        revalidatePath('/gabinete')
        return { ok: true }
    } catch (error) {
        console.error("Erro ao atualizar horários disponíveis:", error)
        return { ok: false, error: "Erro interno ao gravar os horários." }
    }
}

// EDITAR COMPROMISSO
export async function editarCompromissoAction(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])
        const id = Number(formData.get('id'));
        const titulo = formData.get('titulo') as string;
        const categoria = formData.get('categoria') as string;
        const dataStr = formData.get('data') as string;
        const hora_inicioStr = formData.get('hora_inicio') as string;
        const hora_fimStr = formData.get('hora_fim') as string;
        const observacoes = formData.get('observacoes') as string;

        const data_inicio = new Date(`${dataStr}T${hora_inicioStr}:00`);
        const data_fim = new Date(`${dataStr}T${hora_fimStr}:00`);

        // No Prisma, para atualizar relações muitos-para-muitos, usamos "set" para substituir a lista atual
        const membros_ids = formData.getAll('membros[]').map(id => ({ id: Number(id) }));
        const visitantes_ids = formData.getAll('visitantes[]').map(id => ({ id: Number(id) }));
        const departamentos_ids = formData.getAll('departamentos[]').map(id => ({ id: Number(id) }));
        const grupos_ids = formData.getAll('grupos[]').map(id => ({ id: Number(id) }));
        const celulas_ids = formData.getAll('celulas[]').map(id => ({ id: Number(id) }));

        await prisma.compromisso.update({
            where: { id },
            data: {
                titulo, categoria, data_inicio, data_fim, observacoes,
                membros: { set: membros_ids },
                visitantes: { set: visitantes_ids },
                departamentos: { set: departamentos_ids },
                grupos: { set: grupos_ids }
            }
        });

        const { revalidatePath } = await import('next/cache');
        revalidatePath('/gabinete');
        return { ok: true };
    } catch (error) {
        return { ok: false, error: "Erro ao editar compromisso." };
    }
}
// ── TOGGLE VISIBILIDADE DA AGENDA ────────────────────────────────────────────
export async function toggleVisibilidadeAgenda(agendaId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])

        const agenda = await prisma.agenda.findUnique({ where: { id: agendaId } })
        if (!agenda) return { ok: false, error: 'Agenda nao encontrada.' }

        await prisma.agenda.update({
            where: { id: agendaId },
            data: { is_publica: !agenda.is_publica },
        })

        revalidatePath('/gabinete')
        return { ok: true, is_publica: !agenda.is_publica }
    } catch (error) {
        console.error('Erro ao alternar visibilidade da agenda:', error)
        return { ok: false, error: 'Erro ao alternar visibilidade.' }
    }
}

// ── LISTAR AGENDAS PUBLICAS (MEMBRO) ────────────────────────────────────────
export async function listarAgendasPublicas() {
    try {
        const session = await requireAuth()
        const agendas = await prisma.agenda.findMany({
            where: { is_publica: true },
            include: {
                dono: { select: { first_name: true, last_name: true, avatar_file: true } },
            },
            orderBy: { nome: 'asc' },
        })
        const membro = await prisma.membro.findUnique({
            where: { id: session.membroId },
            select: { id: true, first_name: true, last_name: true, phone_1: true, email: true },
        })
        return { ok: true, agendas, membro }
    } catch (error: any) {
        return { ok: false, error: error.message || 'Erro ao buscar agendas.' }
    }
}

// ── PEDIR AGENDAMENTO (MEMBRO) ──────────────────────────────────────────────
export async function pedirAgendamentoAction(dados: {
    agenda_id: number
    titulo: string
    categoria: string
    data: string
    hora_inicio: string
    hora_fim: string
    observacoes?: string
    membro_id: number
}) {
    try {
        await requireAuth()

        const data_inicio = new Date(`${dados.data}T${dados.hora_inicio}:00`)
        const data_fim = new Date(`${dados.data}T${dados.hora_fim}:00`)

        if (data_inicio < new Date()) {
            return { ok: false, error: 'Nao e possivel agendar para uma data/hora ja passada.' }
        }

        const agenda = await prisma.agenda.findUnique({ where: { id: dados.agenda_id } })
        if (!agenda) return { ok: false, error: 'Agenda nao encontrada.' }

        await prisma.compromisso.create({
            data: {
                tenant_id: agenda.tenant_id,
                agenda_id: dados.agenda_id,
                titulo: dados.titulo,
                categoria: dados.categoria,
                data_inicio,
                data_fim,
                observacoes: dados.observacoes || null,
                status: 'PENDENTE',
                membros: { connect: [{ id: dados.membro_id }] },
            }
        })

        revalidatePath('/gabinete')
        revalidatePath('/membros/agendar')
        return { ok: true }
    } catch (error: any) {
        return { ok: false, error: 'Erro ao criar pedido de agendamento.' }
    }
}

// ── SINCRONIZAR GOOGLE CALENDAR ──────────────────────────────────────────────
export async function sincronizarCalendarAction(): Promise<{ ok: boolean; criados: number; erros: number; total: number; error?: string }> {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])

        if (!process.env.GOOGLE_CALENDAR_CREDENTIALS) {
            return { ok: false, criados: 0, erros: 0, total: 0, error: 'GOOGLE_CALENDAR_CREDENTIALS não configurado.' }
        }

        const compromissos = await prisma.compromisso.findMany({
            where: {
                status: 'AGENDADO',
                data_inicio: { gte: new Date() }
            },
            include: {
                agenda: { include: { dono: true } },
                membros: true,
                visitantes: true,
            }
        })

        const resultado = await sincronizarCompromissosGoogleCalendar(compromissos)
        return resultado
    } catch (error) {
        console.error('Erro ao sincronizar com Google Calendar:', error)
        return { ok: false, criados: 0, erros: 0, total: 0, error: 'Erro interno ao sincronizar.' }
    }
}
