// lib/loyverse-api.ts
// Todas as funcoes recebem o token Loyverse como parametro
// para suportar isolamento multi-tenant.

import prisma from '@/lib/prisma'

const BASE_URL = 'https://api.loyverse.com/v1.0'

/**
 * Busca o token Loyverse configurado para o tenant.
 * Fallback para a env var global (retrocompatibilidade).
 */
export async function getLoyverseTokenForTenant(tenantId: number): Promise<string | null> {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { loyverse_token: true },
    })
    return tenant?.loyverse_token || process.env.LOYVERSE_ACCESS_TOKEN || null
}

// 1. Puxar todos os produtos (Items)
export async function getLoyverseItems(token: string) {
    try {
        const res = await fetch(`${BASE_URL}/items`, {
            headers: { 'Authorization': `Bearer ${token}` },
            next: { revalidate: 60 }
        })
        if (!res.ok) {
            const erroReal = await res.text()
            console.error(`ERRO LOYVERSE (Status: ${res.status}):`, erroReal)
            throw new Error('Falha ao buscar itens')
        }
        const data = await res.json()
        return data.items || []
    } catch (error) {
        console.error(error)
        return []
    }
}

// 2. Puxar o Stock Atual (Inventory)
export async function getLoyverseInventory(token: string) {
    try {
        const res = await fetch(`${BASE_URL}/inventory`, {
            headers: { 'Authorization': `Bearer ${token}` },
            next: { revalidate: 60 }
        })
        if (!res.ok) throw new Error('Falha ao buscar stock')
        const data = await res.json()
        return data.inventory_levels || []
    } catch (error) {
        console.error(error)
        return []
    }
}

// 3. Puxar as Categorias
export async function getLoyverseCategories(token: string) {
    try {
        const res = await fetch(`${BASE_URL}/categories`, {
            headers: { 'Authorization': `Bearer ${token}` },
            next: { revalidate: 60 }
        })
        if (!res.ok) throw new Error('Falha ao buscar categorias')
        const data = await res.json()
        return data.categories || []
    } catch (error) {
        console.error(error)
        return []
    }
}

// 4. Buscar clientes Loyverse
export async function getLoyverseCustomers(token: string) {
    try {
        const res = await fetch(`${BASE_URL}/customers?limit=250`, {
            headers: { 'Authorization': `Bearer ${token}` },
            next: { revalidate: 0 }
        })
        if (!res.ok) return null
        const data = await res.json()
        return data.customers || []
    } catch (error) {
        console.error(error)
        return null
    }
}

// 5. Criar cliente no Loyverse
export async function createLoyverseCustomer(token: string, payload: {
    name: string
    email?: string | null
    note?: string
}) {
    const res = await fetch(`${BASE_URL}/customers`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const errorData = await res.json()
        console.error('ERRO API LOYVERSE:', errorData)
        throw new Error('Falha ao criar cliente no Loyverse.')
    }

    return await res.json()
}
