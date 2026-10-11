'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireRole } from '@/lib/auth-utils'
import { getLoyverseTokenForTenant, getLoyverseItems, getLoyverseCategories } from '@/lib/loyverse-api'
import { revalidatePath } from 'next/cache'

/**
 * Importa todas as categorias e produtos do Loyverse para o sistema local.
 * Cria categorias que nao existem e produtos novos.
 * Atualiza precos e stock de produtos existentes (por nome).
 */
export async function importarDoLoyverse() {
    await requireRole(['ADMIN'])
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const token = await getLoyverseTokenForTenant(tenantId)
    if (!token) {
        return { error: 'Token Loyverse nao configurado para esta igreja.' }
    }

    try {
        // 1. Buscar dados do Loyverse
        const [itensLoyverse, categoriasLoyverse] = await Promise.all([
            getLoyverseItems(token),
            getLoyverseCategories(token),
        ])

        if (!itensLoyverse.length) {
            return { error: 'Nenhum produto encontrado no Loyverse.' }
        }

        // 2. Mapear categorias Loyverse -> locais
        const mapaCategoria: Record<string, number> = {}
        let categoriasImportadas = 0

        for (const cat of categoriasLoyverse) {
            const nome = cat.name?.trim()
            if (!nome) continue

            let local = await db.categoriaCantina.findFirst({
                where: { nome: { equals: nome, mode: 'insensitive' } },
            })

            if (!local) {
                local = await (db as any).categoriaCantina.create({
                    data: { tenant_id: tenantId, nome, ordem: categoriasImportadas },
                })
                categoriasImportadas++
            }

            mapaCategoria[cat.id] = local.id
        }

        // 3. Importar produtos
        let produtosImportados = 0
        let produtosAtualizados = 0

        for (const item of itensLoyverse) {
            const nome = item.item_name?.trim()
            if (!nome) continue

            const preco = item.variants?.[0]?.default_price || 0
            const categoriaId = item.category_id ? mapaCategoria[item.category_id] || null : null

            // Verificar se ja existe localmente (por nome)
            const existente = await db.produtoCantina.findFirst({
                where: { nome: { equals: nome, mode: 'insensitive' } },
            })

            if (existente) {
                // Atualizar preco
                await db.produtoCantina.update({
                    where: { id: existente.id },
                    data: {
                        preco,
                        categoria_id: categoriaId,
                        disponivel: !item.is_hidden && item.available_for_sale !== false,
                    },
                })
                produtosAtualizados++
            } else {
                // Criar novo
                await (db as any).produtoCantina.create({
                    data: {
                        tenant_id: tenantId,
                        nome,
                        preco,
                        categoria_id: categoriaId,
                        stock: 0,
                        controla_stock: item.track_stock || false,
                        disponivel: !item.is_hidden && item.available_for_sale !== false,
                        imagem_url: item.image_url || null,
                    },
                })
                produtosImportados++
            }
        }

        revalidatePath('/cantina')
        revalidatePath('/cantina/produtos')

        return {
            success: true,
            resumo: {
                categorias: categoriasImportadas,
                produtosNovos: produtosImportados,
                produtosAtualizados,
                totalLoyverse: itensLoyverse.length,
            },
        }
    } catch (error) {
        console.error('Erro ao importar do Loyverse:', error)
        return { error: 'Erro ao importar dados do Loyverse. Verifique o token e tente novamente.' }
    }
}
