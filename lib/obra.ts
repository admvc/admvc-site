// lib/obra.ts
// A campanha da obra de uma igreja (há uma por igreja). Cria-a com os valores
// da campanha dos tijolos na primeira vez que alguém a abre.

import { getTenantClient } from '@/lib/prisma'

export const OBRA_PADRAO = {
    titulo: 'Construção da nossa Igreja',
    descricao: 'Acompanhe os passos de fé para a nossa sede na Figueira da Foz.',
    objetivoFinal: 200000,
    valorTijolo: 1000,
    chamada: 'Juntos, vamos construir um lugar de adoração, comunhão e alcance para a nossa cidade.',
    versiculo: 'Não nos cansemos de fazer o bem. Pois, se não desanimarmos, chegará o tempo certo em que faremos a colheita.',
    versiculoRef: 'Gálatas 6.9',
}

export async function obraDaIgreja(tenantId: number) {
    const db = getTenantClient(tenantId)
    return (await db.projetoObra.findFirst({ where: { tenant_id: tenantId } }))
        ?? db.projetoObra.create({ data: { tenant_id: tenantId, ...OBRA_PADRAO } })
}
