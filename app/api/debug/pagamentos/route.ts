import { NextResponse } from 'next/server'
import { getLoyverseTokenForTenant } from '@/lib/loyverse-api'

export async function GET(request: Request) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Endpoint indisponível.' }, { status: 404 })
    }

    const tenantId = Number(request.headers.get('x-tenant-id') || 0)
    if (!tenantId) return NextResponse.json({ error: 'Tenant nao identificado' }, { status: 401 })

    const token = await getLoyverseTokenForTenant(tenantId);
    if (!token) return NextResponse.json({ error: 'Loyverse nao configurado para este tenant.' }, { status: 400 })

    const res = await fetch(`https://api.loyverse.com/v1.0/payment_types`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.table(data.payment_types);
    return NextResponse.json(data);
}
