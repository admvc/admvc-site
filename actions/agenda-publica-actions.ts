'use server'

import prisma from '@/lib/prisma'

export async function submeterMarcacaoPublica(formData: FormData) {
    try {
        const agenda_id = Number(formData.get('agenda_id'));
        const categoria = formData.get('categoria') as string;
        const data_str = formData.get('data') as string;
        const hora_inicio = formData.get('hora_inicio') as string;
        const nome = formData.get('nome') as string;
        const email = formData.get('email') as string;
        const telefone = formData.get('telefone') as string;
        const observacoes = formData.get('observacoes') as string;

        if (!agenda_id || !categoria || !data_str || !hora_inicio || !nome || !telefone) {
            return { ok: false, error: "Preencha todos os campos obrigatórios." };
        }

        // 0. Buscar a Agenda para obter o tenant_id
        const agenda = await prisma.agenda.findUnique({
            where: { id: agenda_id }
        });

        if (!agenda) {
            return { ok: false, error: "Agenda não encontrada." };
        }

        const tenant_id = agenda.tenant_id;

        // 1. Calcula a Data de Fim (vamos assumir reuniões de 1 hora por padrão)
        const data_inicio_completa = new Date(`${data_str}T${hora_inicio}:00`);
        const data_fim_completa = new Date(data_inicio_completa.getTime() + 60 * 60 * 1000);

        // 2. Verificar se esse horário não foi ocupado entretanto
        const conflito = await prisma.compromisso.findFirst({
            where: {
                agenda_id,
                status: 'AGENDADO',
                data_inicio: { lt: data_fim_completa },
                data_fim: { gt: data_inicio_completa }
            }
        });

        if (conflito) {
            return { ok: false, error: "Lamentamos, mas este horário acabou de ser reservado. Por favor, escolha outro." };
        }

        // 3. Tentar encontrar se a pessoa já é membro pelo telefone (simplificado)
        const membro = await prisma.membro.findFirst({ where: { phone_1: telefone } });
        let membro_id = membro?.id || null;
        let visitante_id = null;

        // Se não for membro, procuramos ou criamos um visitante
        if (!membro_id) {
            let visitante = await prisma.visitante.findFirst({ where: { telefone, tenant_id } });
            
            if (!visitante) {
                visitante = await prisma.visitante.create({
                    data: {
                        tenant_id,
                        nome,
                        telefone,
                        email,
                        data_primeira_visita: new Date(),
                        status: 'NOVO'
                    }
                });
            }
            visitante_id = visitante.id;
        }

        // 4. Criar o Compromisso
        await prisma.compromisso.create({
            data: {
                tenant_id,
                agenda_id,
                titulo: `Agendamento Web: ${categoria}`,
                categoria,
                status: 'PENDENTE',
                data_inicio: data_inicio_completa,
                data_fim: data_fim_completa,
                observacoes,
                // Associa o visitante ou membro criado/encontrado usando connect (já que é muitos-para-muitos)
                membros: membro_id ? { connect: [{ id: membro_id }] } : undefined,
                visitantes: visitante_id ? { connect: [{ id: visitante_id }] } : undefined,
            }
        });

        // (Opcional Futuro: Disparar o email do Resend aqui!)

        return { ok: true };
    } catch (error) {
        console.error("Erro na marcação pública:", error);
        return { ok: false, error: "Ocorreu um erro no servidor. Tente novamente mais tarde." };
    }
}