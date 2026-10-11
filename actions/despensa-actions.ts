// app/cantina/despensa/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth-utils'
import { getLoyverseTokenForTenant } from '@/lib/loyverse-api'
import { headers } from 'next/headers'

async function getTenantId(): Promise<number> {
    const headersList = await headers()
    return Number(headersList.get('x-tenant-id') || 0)
}

export async function cadastrarItemLoyverse(formData: FormData) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const tenantId = await getTenantId();
        const LOYVERSE_TOKEN = await getLoyverseTokenForTenant(tenantId);
        if (!LOYVERSE_TOKEN) return { error: "Loyverse nao configurado para este tenant." };

        const nome = formData.get('nome') as string;
        const categoriaId = formData.get('categoria_id') as string;

        // Estrutura exigida pelo Loyverse para criar um novo produto
        const novoItem = {
            item_name: nome,
            category_id: categoriaId,
            is_sold_by_weight: false,
            track_inventory: true, // Queremos controlar as quantidades!
            variants: [
                {
                    pricing_type: "FIXED",
                    price: 0, // Preço zero, pois é assistência/despensa
                    cost: 0
                }
            ]
        };

        const res = await fetch('https://api.loyverse.com/v1.0/items', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LOYVERSE_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(novoItem)
        });

        if (!res.ok) {
            const erro = await res.json();
            console.error("Erro Loyverse:", erro);
            return { error: "Falha ao criar o item no Loyverse." };
        }

        revalidatePath('/cantina/despensa');
        return { ok: true };
    } catch (error) {
        console.error(error);
        return { error: "Erro interno ao comunicar com o sistema." };
    }
}

export async function atualizarStockLoyverseAction(variantId: string, novoStock: number) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const tenantId = await getTenantId();
        const token = await getLoyverseTokenForTenant(tenantId);
        if (!token) return { ok: false, error: "Loyverse nao configurado para este tenant." };

        // 1. Descobrir o ID da Loja
        const storesRes = await fetch('https://api.loyverse.com/v1.0/stores', {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
        });
        const storesData = await storesRes.json();
        const storeId = storesData.stores[0].id;

        // 2. Injetar a nova quantidade exata no Loyverse
        const invRes = await fetch('https://api.loyverse.com/v1.0/inventory', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inventory_levels: [
                    {
                        variant_id: variantId,
                        store_id: storeId,
                        stock_after: novoStock // 👈 AQUI ESTAVA A RASTEIRA! Mudei de 'in_stock' para 'stock_after'
                    }
                ]
            })
        });

        if (!invRes.ok) {
            const err = await invRes.text();
            throw new Error(`Erro API Loyverse: ${err}`);
        }

        // 3. Limpar a cache
        revalidatePath('/departamentos/cantina/despensa');
        revalidatePath('/departamentos/cantina/dashboard');

        return { ok: true };
    } catch (error: any) {
        console.error("Erro ao atualizar stock:", error);
        return { ok: false, error: "Falha ao sincronizar quantidade com o Loyverse." };
    }
}

export async function atualizarPropriedadesItemLoyverse(
    itemId: string,
    newName?: string,
    isAvailableForSale?: boolean,
    trackStock?: boolean
) {
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const tenantId = await getTenantId();
        const token = await getLoyverseTokenForTenant(tenantId);
        if (!token) return { ok: false, error: "Loyverse nao configurado para este tenant." };

        // 1. Puxar TODOS os items (Isto garante que temos a versão completa do item, com todas as variantes)
        const getRes = await fetch(`https://api.loyverse.com/v1.0/items?limit=250`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!getRes.ok) throw new Error('Falha ao ler os itens do Loyverse.');

        const data = await getRes.json();
        const itemOriginal = data.items.find((i: any) => i.id === itemId);

        if (!itemOriginal) throw new Error('Item não encontrado na API.');

        // 2. Aplicar as alterações solicitadas (com cirurgia precisa)
        if (newName !== undefined) {
            itemOriginal.item_name = newName;
        }

        if (trackStock !== undefined) {
            itemOriginal.track_stock = trackStock;
        }

        if (isAvailableForSale !== undefined) {
            // A flag de "Disponível para venda" vive no fundo das variantes
            if (itemOriginal.variants && Array.isArray(itemOriginal.variants)) {
                itemOriginal.variants.forEach((variant: any) => {
                    if (variant.stores && Array.isArray(variant.stores)) {
                        variant.stores.forEach((store: any) => {
                            store.available_for_sale = isAvailableForSale;
                        });
                    }
                });
            }
        }

        // 3. Enviar o item modificado de volta (O Loyverse não se pode queixar porque o pacote vai completo!)
        const postRes = await fetch('https://api.loyverse.com/v1.0/items', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemOriginal)
        });

        if (!postRes.ok) {
            const err = await postRes.text();
            throw new Error(`Erro API Loyverse: ${err}`);
        }

        revalidatePath('/departamentos/cantina/dashboard');
        revalidatePath('/departamentos/cantina/despensa');
        return { ok: true };
    } catch (error: any) {
        console.error("Erro ao atualizar item:", error);
        return { ok: false, error: "Falha ao atualizar o item no Loyverse." };
    }
}

export async function salvarItemLoyverseAction(formData: FormData) {
    const inicio = Date.now();
    try {
        await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
        const tenantId = await getTenantId();
        const token = await getLoyverseTokenForTenant(tenantId);
        if (!token) return { ok: false, error: "Loyverse nao configurado para este tenant." };
        const id = formData.get('id') as string;
        const nome = formData.get('nome') as string;
        const categoria_id = formData.get('categoria_id') as string;
        const preco = parseFloat(formData.get('preco') as string || "0");
        const imagemArquivo = formData.get('imagem') as File;

        console.log(`\n🚀 [LOYVERSE SYNC] Iniciando atualização: "${nome}"`);

        // 1. BUSCAR DADOS ORIGINAIS
        let itemOriginal: any = { variants: [] };
        if (id) {
            const getRes = await fetch(`https://api.loyverse.com/v1.0/items/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (getRes.ok) itemOriginal = await getRes.json();
        }

        // 2. LIMPEZA E FORMATAÇÃO DAS VARIANTES
        // Precisamos garantir que não enviamos purchase_cost se track_stock for false
        const trackStockAtivo = itemOriginal.track_stock === true;

        const variantesAtualizadas = itemOriginal.variants.length > 0
            ? itemOriginal.variants.map((v: any) => {
                const baseVar: any = {
                    ...v,
                    default_price: preco,
                    stores: v.stores?.map((s: any) => ({ ...s, price: preco }))
                };

                // 👇 A CORREÇÃO DO ERRO: Se não rastreia stock, removemos o custo de compra
                if (!trackStockAtivo) {
                    delete baseVar.purchase_cost;
                }

                return baseVar;
            })
            : [{ default_price: preco }];

        const payloadDados: any = {
            id: id || undefined,
            item_name: nome,
            category_id: categoria_id,
            variants: variantesAtualizadas,
            track_stock: itemOriginal.track_stock // Mantemos o estado original do stock
        };

        // 3. ENVIO DOS DADOS BÁSICOS
        console.log(`📡 [1/2] Enviando dados (limpeza de purchase_cost aplicada)...`);
        const resDados = await fetch('https://api.loyverse.com/v1.0/items', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payloadDados)
        });

        if (!resDados.ok) {
            const erroTexto = await resDados.text();
            console.error("Erro no primeiro envio:", erroTexto);
            throw new Error(erroTexto);
        }

        // 4. SE HOUVER IMAGEM, ENVIO DEDICADO
        if (imagemArquivo && imagemArquivo.size > 0 && imagemArquivo.name !== 'undefined') {
            console.log(`📸 [2/2] Injetando nova imagem...`);
            const buffer = Buffer.from(await imagemArquivo.arrayBuffer());
            const base64 = buffer.toString('base64');

            const resImagem = await fetch('https://api.loyverse.com/v1.0/items', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: id,
                    item_name: nome,
                    representation_type: 'IMAGE',
                    image_base64: base64
                })
            });

            if (!resImagem.ok) console.warn("⚠️ Dados salvos, mas a imagem foi rejeitada pelo Loyverse.");
        }

        console.log(`✨ SUCESSO! Finalizado em ${Date.now() - inicio}ms`);
        revalidatePath('/departamentos/cantina/dashboard');
        return { ok: true };

    } catch (error: any) {
        console.error(`💥 [FATAL ERROR]:`, error.message);
        return { ok: false, error: error.message };
    }
}