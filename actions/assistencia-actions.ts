'use server'

import { revalidatePath } from 'next/cache'
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth } from '@/lib/auth-utils'

// ── CRIAR ITEM ─────────────────────────────────────────────────────────────────
export async function criarItemAssistencia(formData: FormData) {
    try {
        const session = await requireAuth()
        const db = await getDb()
        const tenantId = await getTenantIdFromHeaders()

        const nome = formData.get('nome') as string
        const categoria = formData.get('categoria') as string
        const unidade = formData.get('unidade') as string || 'unidade'
        const stock = Number(formData.get('stock')) || 0
        const stock_minimo = Number(formData.get('stock_minimo')) || 0

        if (!nome || !categoria) {
            return { error: 'Nome e categoria sao obrigatorios.' }
        }

        await db.itemAssistenciaSocial.create({
            data: {
                tenant_id: tenantId,
                nome,
                categoria,
                unidade,
                stock,
                stock_minimo,
            }
        })

        revalidatePath('/assistencia')
        revalidatePath('/assistencia/stock')
        return { ok: true }
    } catch (err: any) {
        console.error('Erro ao criar item assistencia:', err)
        return { error: err.message || 'Erro ao criar item.' }
    }
}

// ── REGISTAR MOVIMENTO ──────────────────────────────────────────────────────────
export async function registarMovimentoAssistencia(formData: FormData) {
    try {
        const session = await requireAuth()
        const db = await getDb()
        const tenantId = await getTenantIdFromHeaders()

        const item_id = Number(formData.get('item_id'))
        const tipo = formData.get('tipo') as string
        const quantidade = Number(formData.get('quantidade'))
        const destinatario = formData.get('destinatario') as string || null
        const observacao = formData.get('observacao') as string || null

        if (!item_id || !tipo || !quantidade || quantidade <= 0) {
            return { error: 'Campos obrigatorios em falta ou quantidade invalida.' }
        }

        const tiposValidos = ['DOACAO_RECEBIDA', 'ENTREGA_FAMILIA', 'ENTREGA_ENTIDADE', 'REPASSE_CANTINA']
        if (!tiposValidos.includes(tipo)) {
            return { error: 'Tipo de movimento invalido.' }
        }

        const item = await db.itemAssistenciaSocial.findUnique({ where: { id: item_id } })
        if (!item) return { error: 'Item nao encontrado.' }

        if (tipo === 'DOACAO_RECEBIDA') {
            // Incrementar stock
            await db.$transaction([
                db.movimentoAssistencia.create({
                    data: {
                        tenant_id: tenantId,
                        item_id,
                        tipo,
                        quantidade,
                        destinatario,
                        observacao,
                        registrado_por: session.membroId,
                    }
                }),
                db.itemAssistenciaSocial.update({
                    where: { id: item_id },
                    data: { stock: item.stock + quantidade }
                })
            ])
        } else {
            // ENTREGA_FAMILIA, ENTREGA_ENTIDADE, REPASSE_CANTINA — decrementar
            if (quantidade > item.stock) {
                return { error: `Stock insuficiente. Disponivel: ${item.stock} ${item.unidade}(s).` }
            }

            await db.$transaction([
                db.movimentoAssistencia.create({
                    data: {
                        tenant_id: tenantId,
                        item_id,
                        tipo,
                        quantidade,
                        destinatario,
                        observacao,
                        registrado_por: session.membroId,
                    }
                }),
                db.itemAssistenciaSocial.update({
                    where: { id: item_id },
                    data: { stock: item.stock - quantidade }
                })
            ])
        }

        revalidatePath('/assistencia')
        revalidatePath('/assistencia/stock')
        revalidatePath('/assistencia/movimentos')
        return { ok: true }
    } catch (err: any) {
        console.error('Erro ao registar movimento:', err)
        return { error: err.message || 'Erro ao registar movimento.' }
    }
}

// ── CESTAS BASICAS ──────────────────────────────────────────────────────────────

export async function criarTipoCesta(formData: FormData) {
    try {
        await requireAuth()
        const db = await getDb()
        const tenantId = await getTenantIdFromHeaders()

        const nome = formData.get('nome') as string
        const descricao = formData.get('descricao') as string || null

        if (!nome?.trim()) return { error: 'Nome da cesta e obrigatorio.' }

        const cesta = await db.tipoCesta.create({
            data: { tenant_id: tenantId, nome: nome.trim(), descricao }
        })

        revalidatePath('/assistencia/cestas')
        return { ok: true, id: cesta.id }
    } catch (err: any) {
        return { error: err.message || 'Erro ao criar tipo de cesta.' }
    }
}

export async function adicionarItemCesta(tipoCestaId: number, itemId: number, quantidade: number) {
    try {
        await requireAuth()
        const db = await getDb()

        await db.itemCesta.upsert({
            where: { tipo_cesta_id_item_id: { tipo_cesta_id: tipoCestaId, item_id: itemId } },
            create: { tipo_cesta_id: tipoCestaId, item_id: itemId, quantidade },
            update: { quantidade },
        })

        revalidatePath('/assistencia/cestas')
        return { ok: true }
    } catch (err: any) {
        return { error: err.message || 'Erro ao adicionar item a cesta.' }
    }
}

export async function removerItemCesta(itemCestaId: number) {
    try {
        await requireAuth()
        const db = await getDb()
        await db.itemCesta.delete({ where: { id: itemCestaId } })
        revalidatePath('/assistencia/cestas')
        return { ok: true }
    } catch (err: any) {
        return { error: err.message || 'Erro ao remover item.' }
    }
}

export async function eliminarTipoCesta(tipoCestaId: number) {
    try {
        await requireAuth()
        const db = await getDb()
        await db.tipoCesta.delete({ where: { id: tipoCestaId } })
        revalidatePath('/assistencia/cestas')
        return { ok: true }
    } catch (err: any) {
        return { error: err.message || 'Erro ao eliminar cesta.' }
    }
}

export async function montarCesta(tipoCestaId: number, destinatario: string, observacao?: string) {
    try {
        const session = await requireAuth()
        const db = await getDb()
        const tenantId = await getTenantIdFromHeaders()

        if (!destinatario?.trim()) return { error: 'Destinatario e obrigatorio.' }

        const tipoCesta = await db.tipoCesta.findUnique({
            where: { id: tipoCestaId },
            include: { itens: { include: { item: true } } }
        })

        if (!tipoCesta) return { error: 'Tipo de cesta nao encontrado.' }
        if (tipoCesta.itens.length === 0) return { error: 'Esta cesta nao tem itens definidos.' }

        // Verificar stock de todos os itens
        for (const ic of tipoCesta.itens) {
            if (ic.item.stock < ic.quantidade) {
                return { error: `Stock insuficiente de "${ic.item.nome}": precisa ${ic.quantidade}, tem ${ic.item.stock}.` }
            }
        }

        // Descontar stock e registar movimentos numa transacção
        await db.$transaction([
            // Registar entrega
            db.entregaCesta.create({
                data: {
                    tenant_id: tenantId,
                    tipo_cesta_id: tipoCestaId,
                    destinatario: destinatario.trim(),
                    observacao: observacao?.trim() || null,
                    entregue_por: session.membroId,
                }
            }),
            // Descontar stock de cada item + registar movimento
            ...tipoCesta.itens.flatMap(ic => [
                db.itemAssistenciaSocial.update({
                    where: { id: ic.item_id },
                    data: { stock: { decrement: ic.quantidade } }
                }),
                db.movimentoAssistencia.create({
                    data: {
                        tenant_id: tenantId,
                        item_id: ic.item_id,
                        tipo: 'ENTREGA_FAMILIA',
                        quantidade: ic.quantidade,
                        destinatario: destinatario.trim(),
                        observacao: `Cesta: ${tipoCesta.nome}`,
                        registrado_por: session.membroId,
                    }
                }),
            ])
        ])

        revalidatePath('/assistencia')
        revalidatePath('/assistencia/cestas')
        revalidatePath('/assistencia/stock')
        revalidatePath('/assistencia/movimentos')
        return { ok: true }
    } catch (err: any) {
        return { error: err.message || 'Erro ao montar cesta.' }
    }
}

// ── ELIMINAR ITEM ───────────────────────────────────────────────────────────────
export async function eliminarItemAssistencia(itemId: number) {
    try {
        await requireAuth()
        const db = await getDb()

        // Eliminar movimentos associados primeiro
        await db.movimentoAssistencia.deleteMany({ where: { item_id: itemId } })
        await db.itemAssistenciaSocial.delete({ where: { id: itemId } })

        revalidatePath('/assistencia')
        revalidatePath('/assistencia/stock')
        revalidatePath('/assistencia/movimentos')
        return { ok: true }
    } catch (err: any) {
        console.error('Erro ao eliminar item:', err)
        return { error: err.message || 'Erro ao eliminar item.' }
    }
}
