import { NextRequest, NextResponse } from 'next/server'
import { getSessionData } from '@/lib/auth-utils'
import { getDb } from '@/lib/db'

// GET /api/boleia/tracking?ofertaId=123
// Retorna posicoes ativas de todos os participantes da boleia
export async function GET(request: NextRequest) {
    const session = await getSessionData()
    if (!session) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

    const ofertaId = Number(request.nextUrl.searchParams.get('ofertaId'))
    if (!ofertaId) return NextResponse.json({ error: 'ofertaId obrigatorio.' }, { status: 400 })

    const db = await getDb()

    // Verificar que o utilizador faz parte desta boleia
    const oferta = await db.boleiaOferta.findUnique({
        where: { id: ofertaId },
        include: { reservas: { where: { status: 'CONFIRMADA' }, select: { passageiro_id: true } } },
    })

    if (!oferta) return NextResponse.json({ error: 'Oferta nao encontrada.' }, { status: 404 })

    const isMotorista = oferta.motorista_id === session.membroId
    const isPassageiro = oferta.reservas.some(r => r.passageiro_id === session.membroId)
    if (!isMotorista && !isPassageiro) {
        return NextResponse.json({ error: 'Sem permissao.' }, { status: 403 })
    }

    // Buscar posicoes ativas
    const posicoes = await db.boleiaTracking.findMany({
        where: { oferta_id: ofertaId, ativo: true },
        include: {
            membro: { select: { first_name: true, last_name: true } },
        },
    })

    const resultado = posicoes.map((p: any) => ({
        membroId: p.membro_id,
        nome: `${p.membro.first_name} ${p.membro.last_name}`,
        papel: p.papel,
        latitude: p.latitude,
        longitude: p.longitude,
        atualizadoEm: p.atualizado_em.toISOString(),
    }))

    return NextResponse.json({ posicoes: resultado })
}

// POST /api/boleia/tracking
// Atualiza a posicao do utilizador
export async function POST(request: NextRequest) {
    const session = await getSessionData()
    if (!session) return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 })

    const body = await request.json()
    const { ofertaId, latitude, longitude } = body

    if (!ofertaId || latitude == null || longitude == null) {
        return NextResponse.json({ error: 'ofertaId, latitude e longitude obrigatorios.' }, { status: 400 })
    }

    const db = await getDb()

    // Atualizar posicao existente
    const updated = await (db as any).boleiaTracking.updateMany({
        where: { oferta_id: ofertaId, membro_id: session.membroId, ativo: true },
        data: { latitude, longitude, atualizado_em: new Date() },
    })

    if (updated.count === 0) {
        return NextResponse.json({ error: 'Tracking nao ativo. Inicie primeiro.' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
}
