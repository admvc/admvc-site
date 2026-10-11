'use server'

import { revalidatePath } from 'next/cache'
import { getTenantClient } from '@/lib/prisma'
import { headers } from 'next/headers'
import { getSessionData, requireAuth, requireRole } from '@/lib/auth-utils'
import { enviarNotificacaoEscala } from '@/lib/email-escalas'
import { sendPushToMembro } from '@/lib/web-push'
import { audit } from '@/lib/audit'

async function getDb() {
    const headersList = await headers()
    const tenantId = headersList.get('x-tenant-id')
    if (!tenantId) throw new Error('Tenant nao identificado.')
    return {
        db: getTenantClient(Number(tenantId)),
        tenantId: Number(tenantId)
    }
}


export async function deletarEscalaAction(escalaId: number) {
    try {
        const session = await getSessionData();
        if (!session) return { ok: false };

        const { db, tenantId } = await getDb()

        const escala = await db.escala.findUnique({
            where: { id: escalaId },
            select: { departamento_id: true, membro: { select: { first_name: true, last_name: true } } }
        });

        if (!escala) return { ok: false };

        await db.escala.delete({
            where: { id: escalaId }
        });

        audit({ tenant_id: tenantId, categoria: 'ESCALAS', acao: 'APAGAR', alvo_id: escalaId, alvo_tipo: 'ESCALA', descricao: `Escala #${escalaId} removida` }).catch(() => {})

        revalidatePath(`/escalas/gestao/${escala.departamento_id}`);
        revalidatePath('/membros/dashboard');

        return { ok: true };

    } catch (error) {
        return { ok: false };
    }
}

export async function criarEscalaAction(formData: FormData) {
    try {
        const session = await getSessionData();
        if (!session) return { ok: false, error: 'Sessão expirada' };

        const { membroId: liderLogadoId, role } = session;

        // 1. CAPTURAR DADOS
        const eventoId = parseInt(formData.get('evento_id') as string);
        const membroEscaladoId = parseInt(formData.get('membro_id') as string);
        const deptoId = parseInt(formData.get('departamento_id') as string);
        const funcaoId = parseInt(formData.get('funcao_id') as string);
        const horario = (formData.get('horario') as string) || "00:00";

        if (!eventoId || !membroEscaladoId || !funcaoId) {
            return { ok: false, error: 'Dados incompletos para a escala.' };
        }

        const { db } = await getDb()

        // 2. SEGURANÇA E TENANT: Buscar o líder e o Tenant real do departamento
        const depto = await db.departamento.findUnique({
            where: { id: deptoId },
            select: {
                lider_id: true,
                tenant_id: true // 👈 PEGAMOS O TENANT REAL AQUI
            }
        });

        if (!depto || !depto.tenant_id) {
            return { ok: false, error: 'Erro de integridade: Departamento sem Tenant associado.' };
        }

        const vinculoLider = await db.integranteDepartamento.findFirst({
            where: {
                membro_id: liderLogadoId,
                departamento_id: deptoId,
                OR: [
                    { pode_gerir_escalas: true },
                    {
                        funcoes: {
                            some: {
                                funcao: { nome: { contains: 'Lider', mode: 'insensitive' } }
                            }
                        }
                    }
                ]
            }
        });

        const ehAutorizado = role === 'ADMIN' || depto.lider_id === liderLogadoId || !!vinculoLider;

        if (!ehAutorizado) {
            return { ok: false, error: 'Não tens permissão para escalar neste grupo.' };
        }

        // 3. 🛡️ VALIDAÇÃO EXTRA: Evitar escala duplicada no mesmo evento
        const jaEscalado = await db.escala.findFirst({
            where: {
                evento_id: eventoId,
                membro_id: membroEscaladoId,
                departamento_id: deptoId,
                funcao_id: funcaoId
            }
        });

        if (jaEscalado) {
            return { ok: false, error: 'Este membro já está escalado para esta função neste evento.' };
        }

        // 4. CRIAR A ESCALA NO PRISMA (Com o Tenant Correto)
        // Buscamos o nome da função para manter compatibilidade com o campo 'funcao' (string) que ainda é obrigatório no schema
        const funcaoRef = await db.funcaoDepartamento.findUnique({
            where: { id: funcaoId },
            select: { nome: true }
        });

        await db.escala.create({
            data: {
                evento_id: eventoId,
                membro_id: membroEscaladoId,
                departamento_id: deptoId,
                funcao_id: funcaoId,
                funcao: funcaoRef?.nome || 'Serviço', // 👈 Adicionamos este campo que faltava e causava o erro de Tipo
                horario: horario,
                tenant_id: depto.tenant_id // Mantendo o tenant_id real capturado do departamento
            }
        });

        audit({ tenant_id: depto.tenant_id, categoria: 'ESCALAS', acao: 'CRIAR', alvo_id: membroEscaladoId, alvo_tipo: 'ESCALA', descricao: `Membro escalado para evento #${eventoId} — ${funcaoRef?.nome || 'Serviço'}` }).catch(() => {})

        revalidatePath(`/escalas/gestao/${deptoId}`);
        revalidatePath('/membros/dashboard');

        // 6. PUSH NOTIFICATION ao membro escalado
        const evento = await db.evento.findUnique({ where: { id: eventoId }, select: { nome: true, data: true } })
        if (evento) {
            const dataFmt = new Date(evento.data).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' })
            sendPushToMembro(membroEscaladoId, {
                title: 'Nova Escala!',
                body: `Foste escalado para ${evento.nome} (${dataFmt}) — ${funcaoRef?.nome || 'Servico'}`,
                url: '/membros/dashboard',
            }).catch(() => {})
        }

        return { ok: true };

    } catch (error: any) {
        console.error("Erro ao criar escala:", error);
        return { ok: false, error: 'Erro ao processar a escala no servidor.' };
    }
}

// ── CONFIRMAR PRESENÇA ────────────────────────────────────────────────────────
export async function confirmarEscala(ids: number[]) {
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, error: 'Sessão expirada.' }

        const { db } = await getDb()

        await db.escala.updateMany({
            where: { id: { in: ids }, membro_id: session.membroId },
            data: { confirmado: true, motivo_recusa: null }
        })

        // Notificar lider por email (fire-and-forget)
        notificarLiderEscala(ids[0], session.membroId, 'CONFIRMADO').catch(() => {})

        revalidatePath('/membros/dashboard')
        return { sucesso: true }
    } catch (error: any) {
        console.error('Erro ao confirmar escala:', error)
        return { sucesso: false, error: 'Erro interno.' }
    }
}

// ── RECUSAR PRESENÇA COM MOTIVO ───────────────────────────────────────────────
export async function recusarEscala(ids: number[], motivo: string) {
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, error: 'Sessão expirada.' }

        if (!motivo?.trim()) return { sucesso: false, error: 'Motivo obrigatório.' }

        const { db } = await getDb()

        await db.escala.updateMany({
            where: { id: { in: ids }, membro_id: session.membroId },
            data: { confirmado: false, motivo_recusa: motivo.trim() }
        })

        // Notificar lider por email (fire-and-forget)
        notificarLiderEscala(ids[0], session.membroId, 'RECUSADO', motivo.trim()).catch(() => {})

        revalidatePath('/membros/dashboard')
        return { sucesso: true }
    } catch (error: any) {
        console.error('Erro ao recusar escala:', error)
        return { sucesso: false, error: 'Erro interno.' }
    }
}

// ── HELPER: Notificar lider do departamento ─────────────────────────────────
async function notificarLiderEscala(escalaId: number, membroId: number, tipo: 'CONFIRMADO' | 'RECUSADO', motivo?: string) {
    const { db } = await getDb()
    const escala = await db.escala.findUnique({
        where: { id: escalaId },
        include: {
            membro: { select: { first_name: true, last_name: true } },
            evento: { select: { nome: true, data: true } },
            departamento: {
                select: {
                    nome: true,
                    lider: { select: { first_name: true, email: true } }
                }
            }
        }
    })
    if (!escala?.departamento?.lider?.email) return

    await enviarNotificacaoEscala({
        membroNome: `${escala.membro.first_name} ${escala.membro.last_name}`,
        eventoNome: escala.evento.nome,
        eventoData: new Date(escala.evento.data).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' }),
        departamentoNome: escala.departamento.nome,
        funcao: escala.funcao,
        tipo,
        motivo,
        liderEmail: escala.departamento.lider.email,
        liderNome: escala.departamento.lider.first_name,
    })
}

// ── RELATÓRIO ESTRATÉGICO POR DEPARTAMENTO ────────────────────────────────────
export async function buscarRelatorioEscalasDepartamentoAction(
    departamentoId: number,
    mes: number,   // 1-12
    ano: number
) {
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, escalas: [] }

        const { db } = await getDb()

        const inicio = new Date(ano, mes - 1, 1)
        const fim = new Date(ano, mes, 0, 23, 59, 59)

        const escalas = await db.escala.findMany({
            where: {
                departamento_id: departamentoId,
                evento: { data: { gte: inicio, lte: fim } }
            },
            select: {
                id: true,
                confirmado: true,
                motivo_recusa: true,
                funcao: true,
                horario: true,
                membro_id: true,
                membro: {
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        avatar_file: true
                    }
                },
                evento: {
                    select: {
                        id: true,
                        nome: true,
                        data: true
                    }
                }
            },
            orderBy: { evento: { data: 'asc' } }
        })

        // Serializa datas para passar ao Client Component
        const serializados = escalas.map(e => ({
            ...e,
            motivo_recusa: e.motivo_recusa ?? null,
            evento: {
                ...e.evento,
                data: e.evento.data.toISOString()
            }
        }))

        return { sucesso: true, escalas: serializados }
    } catch (error: any) {
        console.error('Erro no relatório de escalas:', error)
        return { sucesso: false, escalas: [] }
    }
}

// NOVOS













// ── LISTAR INDISPONIBILIDADES DO MEMBRO ───────────────────────────────────────
export async function buscarIndisponibilidades(membroId?: number) {
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, dados: [] }

        const { db } = await getDb()
        const id = membroId ?? session.membroId

        const dados = await db.indisponibilidadeMembro.findMany({
            where: { membro_id: id },
            orderBy: { criado_em: 'desc' }
        })

        return {
            sucesso: true,
            dados: dados.map(d => ({
                ...d,
                data_inicio: d.data_inicio?.toISOString() ?? null,
                data_fim: d.data_fim?.toISOString() ?? null,
                criado_em: d.criado_em.toISOString()
            }))
        }
    } catch (error: any) {
        console.error('Erro ao buscar indisponibilidades:', error)
        return { sucesso: false, dados: [] }
    }
}

// ── CRIAR INDISPONIBILIDADE ───────────────────────────────────────────────────
export async function criarIndisponibilidade(formData: FormData) {
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, error: 'Sessão expirada.' }

        const { db, tenantId } = await getDb()

        const tipo = formData.get('tipo') as string
        const motivo = formData.get('motivo') as string | null
        const hora_inicio = formData.get('hora_inicio') as string | null
        const hora_fim = formData.get('hora_fim') as string | null

        let data: any = {
            tenant_id: tenantId,
            membro_id: session.membroId,
            tipo,
            motivo: motivo || null,
            hora_inicio: hora_inicio || null,
            hora_fim: hora_fim || null,
        }

        if (tipo === 'DIA_SEMANA') {
            const dia = Number(formData.get('dia_semana'))
            if (isNaN(dia) || dia < 0 || dia > 6) {
                return { sucesso: false, error: 'Dia da semana inválido.' }
            }
            data.dia_semana = dia

        } else if (tipo === 'DATA_ESPECIFICA') {
            const dataStr = formData.get('data_inicio') as string
            if (!dataStr) return { sucesso: false, error: 'Data obrigatória.' }
            data.data_inicio = new Date(dataStr)

        } else if (tipo === 'INTERVALO') {
            const inicioStr = formData.get('data_inicio') as string
            const fimStr = formData.get('data_fim') as string
            if (!inicioStr || !fimStr) return { sucesso: false, error: 'Datas de início e fim obrigatórias.' }
            const inicio = new Date(inicioStr)
            const fim = new Date(fimStr)
            if (fim < inicio) return { sucesso: false, error: 'A data de fim deve ser posterior à data de início.' }
            data.data_inicio = inicio
            data.data_fim = fim
        }

        await db.indisponibilidadeMembro.create({ data })

        revalidatePath('/membros/dashboard')
        return { sucesso: true }
    } catch (error: any) {
        console.error('Erro ao criar indisponibilidade:', error)
        return { sucesso: false, error: 'Erro interno do servidor.' }
    }
}

// ── REMOVER INDISPONIBILIDADE ─────────────────────────────────────────────────
export async function removerIndisponibilidade(id: number) {
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, error: 'Sessão expirada.' }

        const { db } = await getDb()

        // Garante que só remove a sua própria
        await db.indisponibilidadeMembro.deleteMany({
            where: { id, membro_id: session.membroId }
        })

        revalidatePath('/membros/dashboard')
        return { sucesso: true }
    } catch (error: any) {
        console.error('Erro ao remover indisponibilidade:', error)
        return { sucesso: false, error: 'Erro interno.' }
    }
}

// ── VERIFICAR INDISPONIBILIDADE (usado pelo MontadorEscalas) ──────────────────
export async function verificarIndisponibilidade(
    membroId: number,
    dataEvento: string   // ISO string
): Promise<{ bloqueado: boolean; motivo: string | null }> {
    try {
        await requireAuth()
        const { db } = await getDb()
        const data = new Date(dataEvento)
        const diaSemana = data.getDay()          // 0-6
        const horaEvento = data.toTimeString().slice(0, 5)  // 'HH:MM'

        const indisponibilidades = await db.indisponibilidadeMembro.findMany({
            where: { membro_id: membroId }
        })

        for (const ind of indisponibilidades) {
            // DIA DA SEMANA
            if (ind.tipo === 'DIA_SEMANA' && ind.dia_semana === diaSemana) {
                // Verifica se há restrição de horário
                if (ind.hora_inicio && ind.hora_fim) {
                    if (horaEvento >= ind.hora_inicio && horaEvento <= ind.hora_fim) {
                        return { bloqueado: true, motivo: ind.motivo || `Indisponível às ${DIAS[diaSemana]}s entre ${ind.hora_inicio} e ${ind.hora_fim}` }
                    }
                } else {
                    return { bloqueado: true, motivo: ind.motivo || `Indisponível às ${DIAS[diaSemana]}s` }
                }
            }

            // DATA ESPECÍFICA
            if (ind.tipo === 'DATA_ESPECIFICA' && ind.data_inicio) {
                const dInd = new Date(ind.data_inicio)
                if (mesmoDia(data, dInd)) {
                    if (ind.hora_inicio && ind.hora_fim) {
                        if (horaEvento >= ind.hora_inicio && horaEvento <= ind.hora_fim) {
                            return { bloqueado: true, motivo: ind.motivo || `Indisponível neste dia entre ${ind.hora_inicio} e ${ind.hora_fim}` }
                        }
                    } else {
                        return { bloqueado: true, motivo: ind.motivo || 'Indisponível neste dia' }
                    }
                }
            }

            // INTERVALO
            if (ind.tipo === 'INTERVALO' && ind.data_inicio && ind.data_fim) {
                const inicio = new Date(ind.data_inicio)
                const fim = new Date(ind.data_fim)
                inicio.setHours(0, 0, 0, 0)
                fim.setHours(23, 59, 59, 999)
                if (data >= inicio && data <= fim) {
                    return { bloqueado: true, motivo: ind.motivo || `Indisponível de ${fmtData(inicio)} a ${fmtData(fim)}` }
                }
            }
        }

        return { bloqueado: false, motivo: null }
    } catch {
        return { bloqueado: false, motivo: null }
    }
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const mesmoDia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
const fmtData = (d: Date) =>
    d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })

// ── BUSCAR MENSAGEM DE UM EVENTO ──────────────────────────────────────────────
export async function buscarMensagemEventoAction(eventoId: number) {
    try {
        await requireAuth()
        const { db } = await getDb()
        const mensagem = await db.mensagemEvento.findUnique({
            where: { evento_id: eventoId },
            include: {
                pregador: {
                    select: { id: true, first_name: true, last_name: true, avatar_file: true }
                }
            }
        })

        if (!mensagem) return { sucesso: true, mensagem: null }

        return {
            sucesso: true,
            mensagem: {
                ...mensagem,
                criado_em: mensagem.criado_em.toISOString(),
                atualizado_em: mensagem.atualizado_em.toISOString(),
            }
        }
    } catch (error: any) {
        console.error('Erro ao buscar mensagem:', error)
        return { sucesso: false, mensagem: null }
    }
}

// ── GUARDAR / ACTUALIZAR MENSAGEM ─────────────────────────────────────────────
export async function salvarMensagemEventoAction(formData: FormData) {
    console.log('=== MENSAGEM ACTION ===')
    console.log('Dados recebidos:', Object.fromEntries(formData))
    try {
        const session = await getSessionData()
        if (!session) return { sucesso: false, error: 'Sessao expirada.' }

        const evento_id = Number(formData.get('evento_id'))
        const pregador_id = formData.get('pregador_id') ? Number(formData.get('pregador_id')) : null
        const titulo = (formData.get('titulo') as string)?.trim() || null
        const texto_biblico = (formData.get('texto_biblico') as string)?.trim() || null
        const tema = (formData.get('tema') as string)?.trim() || null
        const notas = (formData.get('notas') as string)?.trim() || null

        if (!evento_id) return { sucesso: false, error: 'Evento invalido.' }

        const { db } = await getDb()

        const evento = await db.evento.findUnique({
            where: { id: evento_id },
            select: { tenant_id: true }
        })
        if (!evento) return { sucesso: false, error: 'Evento nao encontrado.' }

        await db.mensagemEvento.upsert({
            where: { evento_id },
            create: {
                tenant_id: evento.tenant_id,
                evento_id,
                pregador_id,
                titulo,
                texto_biblico,
                tema,
                notas,
            },
            update: {
                pregador_id,
                titulo,
                texto_biblico,
                tema,
                notas,
            }
        })

        revalidatePath('/escalas/admin')
        revalidatePath('/escalas/gestao/[id]', 'page')
        revalidatePath('/membros/dashboard')
        return { sucesso: true }
    } catch (error: any) {
        console.error('Erro ao guardar mensagem:', error)
        return { sucesso: false, error: 'Erro interno do servidor.' }
    }
}

// ── REMOVER MENSAGEM ──────────────────────────────────────────────────────────
export async function removerMensagemEventoAction(eventoId: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER'])
        const { db } = await getDb()
        await db.mensagemEvento.deleteMany({
            where: { evento_id: eventoId }
        })
        revalidatePath('/escalas/admin')
        revalidatePath('/escalas/gestao/[id]', 'page')
        return { sucesso: true }
    } catch (error: any) {
        console.error('Erro ao remover mensagem:', error)
        return { sucesso: false, error: 'Erro interno.' }
    }
}