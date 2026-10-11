import { NextResponse } from 'next/server'
import { getLoyverseTokenForTenant, getLoyverseCustomers } from '@/lib/loyverse-api'

export async function GET(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Endpoint indisponível.' }, { status: 404 })
    }

    try {
        const tenantId = Number(request.headers.get('x-tenant-id') || 0)
        if (!tenantId) return NextResponse.json({ error: 'Tenant nao identificado' }, { status: 401 })

        const loyverseToken = await getLoyverseTokenForTenant(tenantId);
        if (!loyverseToken) return NextResponse.json({ error: 'Loyverse nao configurado para este tenant.' }, { status: 400 })

        const customers = await getLoyverseCustomers(loyverseToken);
        if (!customers) return NextResponse.json({ error: "Erro na API" }, { status: 500 });

        const listaSimplificada = customers.map((c: any) => ({
            nome: c.name,
            email: c.email,
            id_real_uuid: c.id,
            codigo_antigo: c.customer_code
        }));

        console.table(listaSimplificada);

        return NextResponse.json({
            message: "Verifica o teu terminal",
            total: listaSimplificada.length
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
