'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { sendPushToMembro } from '@/lib/web-push'

// ── INICIAR / PARAR TRACKING ─────────────────────────────────────────────────

export async function iniciarTracking(ofertaId: number, latitude: number, longitude: number) {
    const session = await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const oferta = await db.boleiaOferta.findUnique({
        where: { id: ofertaId },
        include: { reservas: { where: { status: 'CONFIRMADA' }, select: { passageiro_id: true } } },
    })

    if (!oferta || oferta.status !== 'ATIVA') return { error: 'Oferta nao encontrada.' }

    const isMotorista = oferta.motorista_id === session.membroId
    const isPassageiro = oferta.reservas.some(r => r.passageiro_id === session.membroId)
    if (!isMotorista && !isPassageiro) return { error: 'Sem permissao para esta boleia.' }

    const papel = isMotorista ? 'MOTORISTA' : 'PASSAGEIRO'

    await (db as any).boleiaTracking.upsert({
        where: { oferta_id_membro_id: { oferta_id: ofertaId, membro_id: session.membroId } },
        update: { latitude, longitude, ativo: true, atualizado_em: new Date() },
        create: {
            tenant_id: tenantId,
            oferta_id: ofertaId,
            membro_id: session.membroId,
            papel,
            latitude,
            longitude,
            ativo: true,
        },
    })

    // Se o motorista iniciou, notificar passageiros
    if (isMotorista) {
        const passageiroIds = oferta.reservas.map(r => r.passageiro_id)
        for (const pid of passageiroIds) {
            sendPushToMembro(pid, {
                title: 'O motorista iniciou a viagem!',
                body: 'Acompanhe a localização em tempo real.',
                url: `/boleia/tracking/${ofertaId}`,
            }).catch(() => {})
        }
    }

    return { success: true, papel }
}

export async function pararTracking(ofertaId: number) {
    const session = await requireAuth()
    const db = await getDb()

    await (db as any).boleiaTracking.updateMany({
        where: { oferta_id: ofertaId, membro_id: session.membroId },
        data: { ativo: false },
    })

    return { success: true }
}

// ── CRIAR OFERTA ─────────────────────────────────────────────────────────────

export async function criarOfertaBoleia(formData: FormData) {
    const session = await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const evento_id = formData.get('evento_id') ? Number(formData.get('evento_id')) : null
    const data_hora_saida = formData.get('data_hora_saida') as string
    const endereco_partida = formData.get('endereco_partida') as string
    const zona_partida = formData.get('zona_partida') as string | null
    const latitude = formData.get('latitude') ? Number(formData.get('latitude')) : null
    const longitude = formData.get('longitude') ? Number(formData.get('longitude')) : null
    const vagas_total = Number(formData.get('vagas_total') || 1)
    const nota = formData.get('nota') as string | null
    const recorrente = formData.get('recorrente') === 'true'

    if (!endereco_partida || !data_hora_saida) {
        return { error: 'Preencha a morada de partida e o horario.' }
    }

    if (vagas_total < 1 || vagas_total > 8) {
        return { error: 'O numero de vagas deve ser entre 1 e 8.' }
    }

    try {
        await (db as any).boleiaOferta.create({
            data: {
                tenant_id: tenantId,
                motorista_id: session.membroId,
                evento_id: evento_id || null,
                data_hora_saida: new Date(data_hora_saida),
                endereco_partida: endereco_partida.trim(),
                zona_partida: zona_partida?.trim() || null,
                latitude,
                longitude,
                vagas_total,
                nota: nota?.trim() || null,
                recorrente,
                status: 'ATIVA',
            },
        })

        revalidatePath('/boleia')
        return { success: true }
    } catch (error) {
        console.error('Erro ao criar oferta de boleia:', error)
        return { error: 'Erro ao criar oferta. Tente novamente.' }
    }
}

// ── CANCELAR OFERTA ──────────────────────────────────────────────────────────

export async function cancelarOfertaBoleia(ofertaId: number) {
    const session = await requireAuth()
    const db = await getDb()

    try {
        const oferta = await db.boleiaOferta.findUnique({ where: { id: ofertaId } })

        if (!oferta || oferta.motorista_id !== session.membroId) {
            return { error: 'Oferta nao encontrada ou sem permissao.' }
        }

        await db.boleiaOferta.update({
            where: { id: ofertaId },
            data: { status: 'CANCELADA' },
        })

        revalidatePath('/boleia')
        revalidatePath('/boleia/minhas')
        return { success: true }
    } catch (error) {
        console.error('Erro ao cancelar oferta:', error)
        return { error: 'Erro ao cancelar. Tente novamente.' }
    }
}

// ── RESERVAR LUGAR ───────────────────────────────────────────────────────────

export async function reservarBoleia(ofertaId: number, latitude?: number, longitude?: number) {
    const session = await requireAuth()
    const db = await getDb()

    try {
        const oferta = await db.boleiaOferta.findUnique({
            where: { id: ofertaId },
            include: {
                reservas: { where: { status: 'CONFIRMADA' } },
                evento: { select: { nome: true } },
            },
        })

        if (!oferta || oferta.status !== 'ATIVA') {
            return { error: 'Esta oferta ja nao esta disponivel.' }
        }

        if (oferta.motorista_id === session.membroId) {
            return { error: 'Nao pode reservar a sua propria boleia.' }
        }

        const vagasOcupadas = oferta.reservas.length
        if (vagasOcupadas >= oferta.vagas_total) {
            return { error: 'Ja nao ha vagas disponiveis.' }
        }

        const jaReservou = oferta.reservas.some(r => r.passageiro_id === session.membroId)
        if (jaReservou) {
            return { error: 'Ja tem uma reserva nesta boleia.' }
        }

        const tenantId = await getTenantIdFromHeaders()

        const passageiro = await db.membro.findUnique({
            where: { id: session.membroId },
            select: { first_name: true, last_name: true },
        })

        await (db as any).boleiaReserva.create({
            data: {
                tenant_id: tenantId,
                oferta_id: ofertaId,
                passageiro_id: session.membroId,
                status: 'CONFIRMADA',
                latitude: latitude || null,
                longitude: longitude || null,
            },
        })

        // Enviar push notification ao motorista
        const nomePassageiro = passageiro ? `${passageiro.first_name} ${passageiro.last_name}` : 'Alguem'
        const dataInfo = oferta.evento?.nome
            ? oferta.evento.nome
            : new Date(oferta.data_hora_saida).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
        sendPushToMembro(oferta.motorista_id, {
            title: 'Nova reserva na sua boleia',
            body: `${nomePassageiro} reservou lugar na sua boleia para ${dataInfo}`,
            url: '/boleia/minhas',
        }).catch(() => {}) // fire and forget

        revalidatePath('/boleia')
        return { success: true }
    } catch (error) {
        console.error('Erro ao reservar boleia:', error)
        return { error: 'Erro ao reservar. Tente novamente.' }
    }
}

// ── CANCELAR RESERVA ─────────────────────────────────────────────────────────

export async function cancelarReservaBoleia(reservaId: number) {
    const session = await requireAuth()
    const db = await getDb()

    try {
        const reserva = await db.boleiaReserva.findUnique({
            where: { id: reservaId },
            include: {
                oferta: { select: { motorista_id: true, data_hora_saida: true, evento: { select: { nome: true } } } },
                passageiro: { select: { first_name: true, last_name: true } },
            },
        })

        if (!reserva || reserva.passageiro_id !== session.membroId) {
            return { error: 'Reserva nao encontrada ou sem permissao.' }
        }

        await db.boleiaReserva.update({
            where: { id: reservaId },
            data: { status: 'CANCELADA' },
        })

        // Enviar push notification ao motorista
        const nomePassageiro = `${reserva.passageiro.first_name} ${reserva.passageiro.last_name}`
        const dataInfo = reserva.oferta.evento?.nome
            ? reserva.oferta.evento.nome
            : new Date(reserva.oferta.data_hora_saida).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })
        sendPushToMembro(reserva.oferta.motorista_id, {
            title: 'Reserva cancelada',
            body: `${nomePassageiro} cancelou a reserva na sua boleia para ${dataInfo}`,
            url: '/boleia/minhas',
        }).catch(() => {}) // fire and forget

        revalidatePath('/boleia')
        return { success: true }
    } catch (error) {
        console.error('Erro ao cancelar reserva:', error)
        return { error: 'Erro ao cancelar. Tente novamente.' }
    }
}

// ── AGRADECER BOLEIA ────────────────────────────────────────────────────────

export async function agradecerBoleia(reservaId: number) {
    const session = await requireAuth()
    const db = await getDb()

    try {
        const reserva = await db.boleiaReserva.findUnique({ where: { id: reservaId } })

        if (!reserva || reserva.passageiro_id !== session.membroId) {
            return { error: 'Reserva nao encontrada ou sem permissao.' }
        }

        await db.boleiaReserva.update({
            where: { id: reservaId },
            data: { agradecimento: true },
        })

        revalidatePath('/boleia')
        return { success: true }
    } catch (error) {
        console.error('Erro ao agradecer boleia:', error)
        return { error: 'Erro ao agradecer. Tente novamente.' }
    }
}

// ── GERAR BOLEIAS RECORRENTES ───────────────────────────────────────────────
// Encontra ofertas recorrentes que ja passaram e cria novas para a proxima semana.
// Pode ser chamada manualmente por admin ou via cron job.

export async function gerarBoleiasRecorrentes() {
    const db = await getDb()
    const agora = new Date()

    try {
        const ofertasRecorrentes = await db.boleiaOferta.findMany({
            where: {
                recorrente: true,
                status: 'ATIVA',
                data_hora_saida: { lt: agora },
            },
        })

        let criadas = 0

        for (const oferta of ofertasRecorrentes) {
            // Marcar a oferta antiga como CONCLUIDA
            await db.boleiaOferta.update({
                where: { id: oferta.id },
                data: { status: 'CONCLUIDA' },
            })

            // Criar nova oferta para a proxima semana (+7 dias)
            const novaData = new Date(oferta.data_hora_saida.getTime() + 7 * 24 * 60 * 60 * 1000)

            await (db as any).boleiaOferta.create({
                data: {
                    tenant_id: oferta.tenant_id,
                    motorista_id: oferta.motorista_id,
                    evento_id: null, // Eventos sao unicos, nao repetir
                    data_hora_saida: novaData,
                    endereco_partida: oferta.endereco_partida,
                    zona_partida: oferta.zona_partida,
                    latitude: oferta.latitude,
                    longitude: oferta.longitude,
                    vagas_total: oferta.vagas_total,
                    nota: oferta.nota,
                    recorrente: true,
                    status: 'ATIVA',
                },
            })

            criadas++
        }

        revalidatePath('/boleia')
        return { success: true, criadas }
    } catch (error) {
        console.error('Erro ao gerar boleias recorrentes:', error)
        return { error: 'Erro ao gerar boleias recorrentes.' }
    }
}
