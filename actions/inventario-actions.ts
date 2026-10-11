'use server'
// actions/inventario-actions.ts

import prisma, { getTenantClient } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getSessionData } from '@/lib/auth-utils'

async function verificarAcesso() {
    const session = await getSessionData()
    if (!session) throw new Error('Não autenticado.')
    const rolesPermitidos = ['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE', 'LEADER']
    if (!rolesPermitidos.includes(session.role)) throw new Error('Sem permissão.')
    return session
}

async function getDb() {
    const h = await headers()
    const tenantId = Number(h.get('x-tenant-id') || 0)
    if (!tenantId) throw new Error('Igreja não identificada.')
    return { db: getTenantClient(tenantId), tenantId }
}

// ── LISTAR ────────────────────────────────────────────────────────────────────
export async function listarInventario(filtros?: {
    categoria?: string
    estado?: string
    dono_tipo?: string
    busca?: string
    apenas_garantia?: boolean
    apenas_emprestados?: boolean
}) {
    try {
        await verificarAcesso()
        const { db, tenantId } = await getDb()

        const where: any = { tenant_id: tenantId, ativo: true }

        if (filtros?.categoria) where.categoria = filtros.categoria
        if (filtros?.estado) where.estado = filtros.estado
        if (filtros?.dono_tipo) where.dono_tipo = filtros.dono_tipo
        if (filtros?.apenas_garantia) where.tem_garantia = true
        if (filtros?.busca) {
            where.OR = [
                { nome: { contains: filtros.busca, mode: 'insensitive' } },
                { marca: { contains: filtros.busca, mode: 'insensitive' } },
                { modelo: { contains: filtros.busca, mode: 'insensitive' } },
                { codigo_patrimonio: { contains: filtros.busca, mode: 'insensitive' } },
                { numero_serie: { contains: filtros.busca, mode: 'insensitive' } },
            ]
        }

        const itens = await db.itemInventario.findMany({
            where,
            include: {
                dono_departamento: { select: { id: true, nome: true } },
                dono_grupo: { select: { id: true, nome: true } },
                dono_membro: { select: { id: true, first_name: true, last_name: true } },
                movimentos: {
                    orderBy: { created_at: 'desc' },
                    take: 5,
                }
            },
            orderBy: [{ categoria: 'asc' }, { nome: 'asc' }]
        })

        // Filtra emprestados após query (quantidade_disponivel < quantidade_total)
        const resultado = filtros?.apenas_emprestados
            ? itens.filter(i => i.quantidade_disponivel < i.quantidade_total)
            : itens

        return { ok: true, data: resultado }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

// ── BUSCAR UM ITEM ─────────────────────────────────────────────────────────────
export async function buscarItemInventario(id: number) {
    try {
        await verificarAcesso()
        const { db } = await getDb()
        const item = await db.itemInventario.findUnique({
            where: { id },
            include: {
                dono_departamento: { select: { id: true, nome: true } },
                dono_grupo: { select: { id: true, nome: true } },
                dono_membro: { select: { id: true, first_name: true, last_name: true } },
                movimentos: { orderBy: { created_at: 'desc' } }
            }
        })
        return { ok: true, data: item }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

// ── CRIAR ITEM ────────────────────────────────────────────────────────────────
export async function criarItemInventario(formData: FormData) {
    try {
        await verificarAcesso()
        const { db, tenantId } = await getDb()

        const dono_tipo = formData.get('dono_tipo') as string || 'IGREJA'
        const dono_departamento_id = formData.get('dono_departamento_id')
        const dono_grupo_id = formData.get('dono_grupo_id')
        const dono_membro_id = formData.get('dono_membro_id')
        const tem_garantia = formData.get('tem_garantia') === 'true'
        const quantidade = Number(formData.get('quantidade_total')) || 1
        const valor = formData.get('valor_aquisicao')
        const data_aquisicao = formData.get('data_aquisicao')
        const garantia_validade = formData.get('garantia_validade')

        const item = await db.itemInventario.create({
            data: {
                tenant_id: tenantId,
                nome: formData.get('nome') as string,
                descricao: formData.get('descricao') as string || null,
                categoria: formData.get('categoria') as any || 'OUTRO',
                estado: formData.get('estado') as any || 'BOM',
                numero_serie: formData.get('numero_serie') as string || null,
                codigo_patrimonio: formData.get('codigo_patrimonio') as string || null,
                marca: formData.get('marca') as string || null,
                modelo: formData.get('modelo') as string || null,
                cor: formData.get('cor') as string || null,
                quantidade_total: quantidade,
                quantidade_disponivel: quantidade,
                data_aquisicao: data_aquisicao ? new Date(data_aquisicao as string) : null,
                valor_aquisicao: valor ? Number(valor) : null,
                fornecedor: formData.get('fornecedor') as string || null,
                nota_fiscal: formData.get('nota_fiscal') as string || null,
                tem_garantia,
                garantia_validade: tem_garantia && garantia_validade ? new Date(garantia_validade as string) : null,
                garantia_info: tem_garantia ? formData.get('garantia_info') as string || null : null,
                localizacao: formData.get('localizacao') as string || null,
                foto_url: formData.get('foto_url') as string || null,
                notas: formData.get('notas') as string || null,
                dono_tipo,
                dono_departamento_id: dono_tipo === 'DEPARTAMENTO' && dono_departamento_id ? Number(dono_departamento_id) : null,
                dono_grupo_id: dono_tipo === 'GRUPO' && dono_grupo_id ? Number(dono_grupo_id) : null,
                dono_membro_id: dono_tipo === 'MEMBRO' && dono_membro_id ? Number(dono_membro_id) : null,
            }
        })

        // Regista movimento inicial de entrada
        await db.movimentoInventario.create({
            data: {
                tenant_id: tenantId,
                item_id: item.id,
                tipo: 'ENTRADA',
                quantidade,
                observacao: 'Cadastro inicial do item',
            }
        })

        const nome = formData.get('nome') as string
        audit({ tenant_id: tenantId, categoria: 'INVENTARIO', acao: 'CRIAR', alvo_id: item.id, alvo_tipo: 'ITEM_INVENTARIO', alvo_nome: nome, descricao: `Item "${nome}" criado (qtd: ${quantidade})` }).catch(() => {})

        revalidatePath('/inventario')
        return { ok: true, data: item }
    } catch (err: any) {
        if (err.code === 'P2002') return { ok: false, error: 'Código de património já existe.' }
        return { ok: false, error: err.message }
    }
}

// ── EDITAR ITEM ───────────────────────────────────────────────────────────────
export async function editarItemInventario(id: number, formData: FormData) {
    try {
        await verificarAcesso()
        const { db, tenantId } = await getDb()

        const dono_tipo = formData.get('dono_tipo') as string || 'IGREJA'
        const tem_garantia = formData.get('tem_garantia') === 'true'
        const valor = formData.get('valor_aquisicao')
        const data_aquisicao = formData.get('data_aquisicao')
        const garantia_validade = formData.get('garantia_validade')
        const dono_departamento_id = formData.get('dono_departamento_id')
        const dono_grupo_id = formData.get('dono_grupo_id')
        const dono_membro_id = formData.get('dono_membro_id')

        await db.itemInventario.update({
            where: { id },
            data: {
                nome: formData.get('nome') as string,
                descricao: formData.get('descricao') as string || null,
                categoria: formData.get('categoria') as any,
                estado: formData.get('estado') as any,
                numero_serie: formData.get('numero_serie') as string || null,
                codigo_patrimonio: formData.get('codigo_patrimonio') as string || null,
                marca: formData.get('marca') as string || null,
                modelo: formData.get('modelo') as string || null,
                cor: formData.get('cor') as string || null,
                data_aquisicao: data_aquisicao ? new Date(data_aquisicao as string) : null,
                valor_aquisicao: valor ? Number(valor) : null,
                fornecedor: formData.get('fornecedor') as string || null,
                nota_fiscal: formData.get('nota_fiscal') as string || null,
                tem_garantia,
                garantia_validade: tem_garantia && garantia_validade ? new Date(garantia_validade as string) : null,
                garantia_info: tem_garantia ? formData.get('garantia_info') as string || null : null,
                localizacao: formData.get('localizacao') as string || null,
                foto_url: formData.get('foto_url') as string || null,
                notas: formData.get('notas') as string || null,
                dono_tipo,
                dono_departamento_id: dono_tipo === 'DEPARTAMENTO' && dono_departamento_id ? Number(dono_departamento_id) : null,
                dono_grupo_id: dono_tipo === 'GRUPO' && dono_grupo_id ? Number(dono_grupo_id) : null,
                dono_membro_id: dono_tipo === 'MEMBRO' && dono_membro_id ? Number(dono_membro_id) : null,
            }
        })

        audit({ tenant_id: tenantId, categoria: 'INVENTARIO', acao: 'EDITAR', alvo_id: id, alvo_tipo: 'ITEM_INVENTARIO', descricao: `Item #${id} editado` }).catch(() => {})

        revalidatePath('/inventario')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

// ── REGISTAR MOVIMENTO ────────────────────────────────────────────────────────
export async function registarMovimento(formData: FormData) {
    try {
        await verificarAcesso()
        const { db, tenantId } = await getDb()

        const itemId = Number(formData.get('item_id'))
        const tipo = formData.get('tipo') as string
        const quantidade = Number(formData.get('quantidade')) || 1
        const destino = formData.get('destino') as string || null
        const observacao = formData.get('observacao') as string || null
        const data_retorno_prevista = formData.get('data_retorno_prevista') as string || null
        const responsavel = formData.get('responsavel') as string || null

        const item = await db.itemInventario.findUnique({ where: { id: itemId } })
        if (!item) return { ok: false, error: 'Item não encontrado.' }

        // Calcula nova disponibilidade
        let novaDispo = item.quantidade_disponivel
        if (tipo === 'EMPRESTIMO' || tipo === 'MANUTENCAO' || tipo === 'SAIDA') {
            if (quantidade > item.quantidade_disponivel) {
                return { ok: false, error: `Apenas ${item.quantidade_disponivel} unidade(s) disponível(is).` }
            }
            novaDispo -= quantidade
        } else if (tipo === 'DEVOLUCAO' || tipo === 'RETORNO_MANUTENCAO') {
            novaDispo = Math.min(item.quantidade_total, novaDispo + quantidade)
        } else if (tipo === 'ENTRADA') {
            novaDispo += quantidade
            await db.itemInventario.update({
                where: { id: itemId },
                data: { quantidade_total: item.quantidade_total + quantidade }
            })
        } else if (tipo === 'AJUSTE') {
            novaDispo = quantidade // ajuste directo
        }

        await db.$transaction([
            db.movimentoInventario.create({
                data: {
                    tenant_id: tenantId,
                    item_id: itemId,
                    tipo: tipo as any,
                    quantidade,
                    responsavel,
                    destino,
                    observacao,
                    data_retorno_prevista: data_retorno_prevista ? new Date(data_retorno_prevista) : null,
                }
            }),
            db.itemInventario.update({
                where: { id: itemId },
                data: { quantidade_disponivel: novaDispo }
            })
        ])

        audit({ tenant_id: tenantId, categoria: 'INVENTARIO', acao: 'EDITAR', alvo_id: itemId, alvo_tipo: 'ITEM_INVENTARIO', descricao: `Movimento ${tipo} registado no item #${itemId} (qtd: ${quantidade})` }).catch(() => {})

        revalidatePath('/inventario')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

// ── ARQUIVAR ITEM ─────────────────────────────────────────────────────────────
export async function arquivarItemInventario(id: number) {
    try {
        await verificarAcesso()
        const { db, tenantId } = await getDb()
        await db.itemInventario.update({ where: { id }, data: { ativo: false } })
        audit({ tenant_id: tenantId, categoria: 'INVENTARIO', acao: 'ARQUIVAR', alvo_id: id, alvo_tipo: 'ITEM_INVENTARIO', descricao: `Item #${id} arquivado` }).catch(() => {})
        revalidatePath('/inventario')
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}

// ── KPIs ──────────────────────────────────────────────────────────────────────
export async function getKpisInventario() {
    try {
        await verificarAcesso()
        const { db, tenantId } = await getDb()

        const [total, emprestados, emManutencao, garantiaExpirando, valorTotal] = await Promise.all([
            db.itemInventario.count({ where: { tenant_id: tenantId, ativo: true } }),
            db.itemInventario.count({
                where: {
                    tenant_id: tenantId, ativo: true,
                    quantidade_disponivel: { lt: prisma.itemInventario.fields.quantidade_total }
                }
            }),
            db.movimentoInventario.count({
                where: {
                    tipo: 'MANUTENCAO',
                    data_retorno_real: null,
                    item: { tenant_id: tenantId }
                }
            }),
            db.itemInventario.count({
                where: {
                    tenant_id: tenantId, ativo: true, tem_garantia: true,
                    garantia_validade: { lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
                }
            }),
            db.itemInventario.aggregate({
                where: { tenant_id: tenantId, ativo: true },
                _sum: { valor_aquisicao: true }
            })
        ])

        return {
            ok: true,
            data: {
                total,
                emprestados,
                emManutencao,
                garantiaExpirando,
                valorTotal: valorTotal._sum.valor_aquisicao || 0,
            }
        }
    } catch (err: any) {
        return { ok: false, error: err.message }
    }
}