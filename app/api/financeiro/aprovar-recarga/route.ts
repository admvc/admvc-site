import { NextResponse } from 'next/server'
import { getTenantClient } from '@/lib/prisma'
import { getLoyverseTokenForTenant } from '@/lib/loyverse-api'
// 7b7958b8-70ba-4573-9844-bc7fc957759e UID de MEMBRO (Tipo de Pagamento do Loyverse)


export async function POST(request: Request) {
    try {
        const tenantId = Number(request.headers.get('x-tenant-id') || 0)
        if (!tenantId) return NextResponse.json({ error: 'Tenant nao identificado' }, { status: 401 })
        const db = getTenantClient(tenantId)

        const { lancamentoId, membroId, valor } = await request.json()
        const membro = await db.membro.findUnique({ where: { id: membroId } })

        if (!membro?.loyverse_id) {
            return NextResponse.json({ error: 'Membro sem UUID Loyverse' }, { status: 400 })
        }

        const loyverseToken = await getLoyverseTokenForTenant(tenantId);
        if (!loyverseToken) {
            return NextResponse.json({ error: 'Loyverse nao configurado para este tenant.' }, { status: 400 })
        }

        // 1. ATUALIZAR NOSSO BANCO PRIMEIRO (Para evitar cliques duplos)
        await db.lancamentoFinanceiro.update({
            where: { id: lancamentoId },
            data: { forma_pagamento: 'MBWAY_CONFIRMADO' }
        });

        // 2. CRIAR UMA VENDA NO LOYVERSE PARA GERAR OS PONTOS
        // O Loyverse adiciona pontos automaticamente quando uma venda é associada ao cliente
        const receipt = {
            customer_id: membro.loyverse_id,
            order_type: 'SALES',
            receipt_type: 'SALE',
            // Data e hora atual no formato ISO exigido pelo Loyverse
            updated_at: new Date().toISOString(),
            total_money: valor,
            total_tax: 0,
            // IMPORTANTE: line_items precisam de ter IDs ou nomes válidos
            line_items: [
                {
                    name: "Recarga de Saldo - Dashboard",
                    quantity: 1,
                    price_piece: valor,
                    total_money: valor,
                    gross_total_money: valor
                }
            ],
            payments: [
                {
                    // SUBSTITUA PELO UUID QUE COPIOU DO DEBUG (Exemplo abaixo)
                    payment_type_id: "7b7958b8-70ba-4573-9844-bc7fc957759e",
                    money_amount: valor
                }
            ]
        };

        const loyverseRes = await fetch(`https://api.loyverse.com/v1.0/receipts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${loyverseToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(receipt)
        });

        if (!loyverseRes.ok) {
            const errorData = await loyverseRes.text();
            console.error("Erro ao gerar recibo no Loyverse:", errorData);
            throw new Error('Loyverse rejeitou a criação do recibo de recarga.');
        }

        console.log(`✅ Sucesso! Recarga de ${valor}€ creditada para ${membro.first_name} via Recibo.`);
        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error("Erro na Rota:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}