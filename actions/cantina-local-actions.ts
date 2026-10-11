'use server'

import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireAuth, requireRole, isAdmin } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIAS
// ══════════════════════════════════════════════════════════════════════════════

export async function criarCategoria(formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const nome = (formData.get('nome') as string)?.trim()
    if (!nome) return { error: 'Nome da categoria e obrigatorio.' }

    try {
        await (db as any).categoriaCantina.create({
            data: { tenant_id: tenantId, nome, ordem: 0 },
        })
        revalidatePath('/cantina')
        return { success: true }
    } catch (error: any) {
        if (error?.code === 'P2002') return { error: 'Ja existe uma categoria com este nome.' }
        return { error: 'Erro ao criar categoria.' }
    }
}

export async function eliminarCategoria(categoriaId: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()

    try {
        await db.categoriaCantina.delete({ where: { id: categoriaId } })
        revalidatePath('/cantina')
        return { success: true }
    } catch {
        return { error: 'Erro ao eliminar categoria. Verifique se nao tem produtos associados.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUTOS
// ══════════════════════════════════════════════════════════════════════════════

export async function criarProduto(formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const nome = (formData.get('nome') as string)?.trim()
    const preco = Number(formData.get('preco') || 0)
    const categoria_id = formData.get('categoria_id') ? Number(formData.get('categoria_id')) : null
    const stock = Number(formData.get('stock') || 0)
    const stock_minimo = Number(formData.get('stock_minimo') || 0)
    const controla_stock = formData.get('controla_stock') !== 'false'
    const imagem_url = (formData.get('imagem_url') as string)?.trim() || null
    const custoRaw = formData.get('custo')
    const custo = custoRaw && custoRaw !== '' ? Number(custoRaw) : null
    const promocoesRaw = formData.get('promocoes') as string | null
    const promocoes = promocoesRaw ? JSON.parse(promocoesRaw) : null

    if (!nome) return { error: 'Nome do produto e obrigatorio.' }
    if (preco < 0) return { error: 'Preco nao pode ser negativo.' }

    try {
        await (db as any).produtoCantina.create({
            data: {
                tenant_id: tenantId,
                nome,
                preco,
                custo,
                categoria_id,
                stock,
                stock_minimo,
                controla_stock,
                imagem_url,
                disponivel: true,
                promocoes,
            },
        })
        revalidatePath('/cantina')
        return { success: true }
    } catch {
        return { error: 'Erro ao criar produto.' }
    }
}

export async function atualizarProduto(produtoId: number, formData: FormData) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()

    const nome = (formData.get('nome') as string)?.trim()
    const preco = Number(formData.get('preco') || 0)
    const categoria_id = formData.get('categoria_id') ? Number(formData.get('categoria_id')) : null
    const stock = Number(formData.get('stock') || 0)
    const stock_minimo = Number(formData.get('stock_minimo') || 0)
    const controla_stock = formData.get('controla_stock') !== 'false'
    const disponivel = formData.get('disponivel') !== 'false'
    const imagem_url = (formData.get('imagem_url') as string)?.trim() || null
    const custoRaw = formData.get('custo')
    const custo = custoRaw && custoRaw !== '' ? Number(custoRaw) : null
    const promocoesRaw = formData.get('promocoes') as string | null
    const promocoes = promocoesRaw ? JSON.parse(promocoesRaw) : null

    if (!nome) return { error: 'Nome do produto e obrigatorio.' }

    try {
        await db.produtoCantina.update({
            where: { id: produtoId },
            data: { nome, preco, custo, categoria_id, stock, stock_minimo, controla_stock, disponivel, imagem_url, promocoes },
        })
        revalidatePath('/cantina')
        return { success: true }
    } catch {
        return { error: 'Erro ao atualizar produto.' }
    }
}

export async function eliminarProduto(produtoId: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()
    try {
        await db.produtoCantina.delete({ where: { id: produtoId } })
        revalidatePath('/cantina')
        return { success: true }
    } catch {
        return { error: 'Erro ao eliminar produto. Pode ter transacoes associadas.' }
    }
}

export async function toggleDisponibilidadeProduto(produtoId: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()

    try {
        const produto = await db.produtoCantina.findUnique({ where: { id: produtoId } })
        if (!produto) return { error: 'Produto nao encontrado.' }

        await db.produtoCantina.update({
            where: { id: produtoId },
            data: { disponivel: !produto.disponivel },
        })
        revalidatePath('/cantina')
        return { success: true }
    } catch {
        return { error: 'Erro ao alterar disponibilidade.' }
    }
}

export async function atualizarStock(produtoId: number, quantidade: number) {
    await requireRole(['ADMIN', 'CONGREGATION_ADMIN'])
    const db = await getDb()

    try {
        await db.produtoCantina.update({
            where: { id: produtoId },
            data: { stock: quantidade },
        })
        revalidatePath('/cantina')
        return { success: true }
    } catch {
        return { error: 'Erro ao atualizar stock.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// SALDO / RECARGA
// ══════════════════════════════════════════════════════════════════════════════

export async function recarregarSaldo(membroId: number, valor: number, descricao?: string) {
    const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'FINANCE'])
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (valor <= 0) return { error: 'O valor da recarga deve ser positivo.' }

    try {
        // Buscar ou criar saldo
        let saldo = await db.saldoCantina.findUnique({ where: { membro_id: membroId } })

        if (!saldo) {
            saldo = await (db as any).saldoCantina.create({
                data: { tenant_id: tenantId, membro_id: membroId, saldo: 0 },
            })
        }

        const novoSaldo = (saldo?.saldo || 0) + valor

        // Atualizar saldo
        await db.saldoCantina.update({
            where: { membro_id: membroId },
            data: { saldo: novoSaldo },
        })

        // Registar transacao
        await (db as any).transacaoCantina.create({
            data: {
                tenant_id: tenantId,
                membro_id: membroId,
                tipo: 'RECARGA',
                valor,
                saldo_apos: novoSaldo,
                descricao: descricao || 'Recarga de saldo',
                operador_id: session.membroId,
            },
        })

        revalidatePath('/cantina')
        revalidatePath('/membros/dashboard')
        return { success: true, novoSaldo }
    } catch (error) {
        console.error('Erro ao recarregar saldo:', error)
        return { error: 'Erro ao recarregar saldo.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// VENDA (POS)
// ══════════════════════════════════════════════════════════════════════════════

interface ItemVenda {
    produtoId: number
    quantidade: number
}

export async function registarVenda(
    membroId: number | null,
    itens: ItemVenda[],
    formaPagamento: string | { forma: string; valor: number }[] = 'CREDITOS',
    turnoId: number | null = null
) {
    const session = await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (!itens.length) return { error: 'Adicione pelo menos um item.' }

    // Normalizar pagamentos: string simples → array com um unico pagamento
    const pagamentos: { forma: string; valor: number }[] = typeof formaPagamento === 'string'
        ? [] // sera preenchido apos calcular o total
        : formaPagamento
    const formaPrincipal = typeof formaPagamento === 'string' ? formaPagamento : 'MISTO'
    const isDividido = Array.isArray(formaPagamento) && typeof formaPagamento !== 'string'

    // Vendas por CREDITOS exigem membro
    if (formaPrincipal === 'CREDITOS' && !membroId) {
        return { error: 'Para pagamento com creditos, selecione um membro.' }
    }
    if (isDividido && pagamentos.some(p => p.forma === 'CREDITOS') && !membroId) {
        return { error: 'Para pagamento com creditos, selecione um membro.' }
    }

    try {
        // 1. Buscar produtos e calcular total
        const produtoIds = itens.map(i => i.produtoId)
        const produtos = await db.produtoCantina.findMany({
            where: { id: { in: produtoIds }, disponivel: true },
        })

        if (produtos.length !== produtoIds.length) {
            return { error: 'Um ou mais produtos nao estao disponiveis.' }
        }

        let total = 0
        const itensValidados = itens.map(item => {
            const produto = produtos.find(p => p.id === item.produtoId)!
            const subtotal = produto.preco * item.quantidade
            total += subtotal

            // Verificar stock
            if (produto.controla_stock && produto.stock < item.quantidade) {
                throw new Error(`Stock insuficiente para "${produto.nome}". Disponivel: ${produto.stock}`)
            }

            return { ...item, preco_unitario: produto.preco, nome: produto.nome, produto }
        })

        // Se pagamento simples, preencher o array de pagamentos com o total
        if (!isDividido) {
            pagamentos.length = 0
            pagamentos.push({ forma: formaPrincipal, valor: total })
        }

        // Validar que a soma dos pagamentos = total
        const somaPagamentos = pagamentos.reduce((s, p) => s + p.valor, 0)
        if (Math.abs(somaPagamentos - total) > 0.01) {
            return { error: `Soma dos pagamentos (${somaPagamentos.toFixed(2)}€) nao corresponde ao total (${total.toFixed(2)}€).` }
        }

        // 2. Buscar saldo do membro (se houver membro)
        let novoSaldo = 0
        const valorCreditos = pagamentos.filter(p => p.forma === 'CREDITOS').reduce((s, p) => s + p.valor, 0)

        if (membroId) {
            const saldo = await db.saldoCantina.findUnique({ where: { membro_id: membroId } })

            // Verificar limites de consumo (diario/semanal)
            if (saldo && (saldo.limite_diario || saldo.limite_semanal)) {
                const agora = new Date()
                const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
                const diaSemana = agora.getDay()
                const inicioSemana = new Date(inicioDia)
                inicioSemana.setDate(inicioSemana.getDate() - (diaSemana === 0 ? 6 : diaSemana - 1))

                if (saldo.limite_diario) {
                    const consumoHoje = await db.transacaoCantina.aggregate({
                        where: { membro_id: membroId, tipo: 'CONSUMO', criado_em: { gte: inicioDia } },
                        _sum: { valor: true },
                    })
                    const gastoHoje = Math.abs(consumoHoje._sum.valor || 0)
                    if (gastoHoje + total > saldo.limite_diario) {
                        return { error: `Limite diario atingido. Limite: ${saldo.limite_diario.toFixed(2)}€. Ja gasto hoje: ${gastoHoje.toFixed(2)}€.` }
                    }
                }

                if (saldo.limite_semanal) {
                    const consumoSemana = await db.transacaoCantina.aggregate({
                        where: { membro_id: membroId, tipo: 'CONSUMO', criado_em: { gte: inicioSemana } },
                        _sum: { valor: true },
                    })
                    const gastoSemana = Math.abs(consumoSemana._sum.valor || 0)
                    if (gastoSemana + total > saldo.limite_semanal) {
                        return { error: `Limite semanal atingido. Limite: ${saldo.limite_semanal.toFixed(2)}€. Ja gasto esta semana: ${gastoSemana.toFixed(2)}€.` }
                    }
                }
            }

            if (valorCreditos > 0) {
                if (!saldo || saldo.saldo < valorCreditos) {
                    return { error: `Saldo insuficiente para a parte em creditos. Disponivel: ${(saldo?.saldo || 0).toFixed(2)}€. Creditos: ${valorCreditos.toFixed(2)}€` }
                }
                novoSaldo = saldo.saldo - valorCreditos
                await db.saldoCantina.update({
                    where: { membro_id: membroId },
                    data: { saldo: novoSaldo },
                })
            } else {
                novoSaldo = saldo?.saldo || 0
            }
        }

        // 4. Registar transacao com itens
        const descricaoItens = itensValidados.map(i => `${i.quantidade}x ${i.nome}`).join(', ')

        await (db as any).transacaoCantina.create({
            data: {
                tenant_id: tenantId,
                membro_id: membroId || null,
                tipo: 'CONSUMO',
                valor: -total,
                saldo_apos: novoSaldo,
                descricao: descricaoItens,
                operador_id: session.membroId,
                forma_pagamento: formaPrincipal,
                turno_id: turnoId,
                itens: {
                    create: itensValidados.map(i => ({
                        produto_id: i.produtoId,
                        quantidade: i.quantidade,
                        preco_unitario: i.preco_unitario,
                    })),
                },
                pagamentos: {
                    create: pagamentos.map(p => ({
                        forma_pagamento: p.forma,
                        valor: p.valor,
                    })),
                },
            },
        })

        // 5. Atualizar stock
        for (const item of itensValidados) {
            if (item.produto.controla_stock) {
                await db.produtoCantina.update({
                    where: { id: item.produtoId },
                    data: { stock: { decrement: item.quantidade } },
                })
            }
        }

        revalidatePath('/cantina')
        return { success: true, total, novoSaldo }
    } catch (error: any) {
        console.error('Erro ao registar venda:', error)
        return { error: error.message || 'Erro ao registar venda.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// ESTORNO
// ══════════════════════════════════════════════════════════════════════════════

export async function estornarTransacao(transacaoId: number) {
    await requireRole(['ADMIN', 'FINANCE'])
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const transacao = await db.transacaoCantina.findUnique({
            where: { id: transacaoId },
            include: { itens: true },
        })

        if (!transacao || transacao.tipo !== 'CONSUMO') {
            return { error: 'Transacao nao encontrada ou nao e estornavel.' }
        }

        const valorEstorno = Math.abs(transacao.valor)

        // Devolver saldo
        const saldo = await db.saldoCantina.findUnique({ where: { membro_id: transacao.membro_id } })
        const novoSaldo = (saldo?.saldo || 0) + valorEstorno

        await db.saldoCantina.update({
            where: { membro_id: transacao.membro_id },
            data: { saldo: novoSaldo },
        })

        // Devolver stock
        for (const item of transacao.itens) {
            await db.produtoCantina.update({
                where: { id: item.produto_id },
                data: { stock: { increment: item.quantidade } },
            })
        }

        // Registar transacao de estorno
        await (db as any).transacaoCantina.create({
            data: {
                tenant_id: tenantId,
                membro_id: transacao.membro_id,
                tipo: 'ESTORNO',
                valor: valorEstorno,
                saldo_apos: novoSaldo,
                descricao: `Estorno da transacao #${transacaoId}`,
            },
        })

        revalidatePath('/cantina')
        return { success: true }
    } catch (error) {
        console.error('Erro ao estornar:', error)
        return { error: 'Erro ao estornar transacao.' }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSULTAS
// ══════════════════════════════════════════════════════════════════════════════

export async function obterSaldoMembro(membroId: number) {
    const db = await getDb()
    const saldo = await db.saldoCantina.findUnique({ where: { membro_id: membroId } })
    return saldo?.saldo || 0
}

export async function obterExtratoMembro(membroId: number, limite = 50) {
    const db = await getDb()
    return db.transacaoCantina.findMany({
        where: { membro_id: membroId },
        include: { itens: { include: { produto: { select: { nome: true } } } } },
        orderBy: { criado_em: 'desc' },
        take: limite,
    })
}

// ══════════════════════════════════════════════════════════════════════════════
// QR CODE
// ══════════════════════════════════════════════════════════════════════════════

export async function gerarQrCodeMembro(membroId: number) {
    await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let random6 = ''
        for (let i = 0; i < 6; i++) {
            random6 += chars.charAt(Math.floor(Math.random() * chars.length))
        }

        const qrCode = `ADMVC-${tenantId}-${membroId}-${random6}`

        await db.membro.update({
            where: { id: membroId },
            data: { qr_code: qrCode },
        })

        revalidatePath('/cantina')
        return { success: true, qrCode }
    } catch (error) {
        console.error('Erro ao gerar QR code:', error)
        return { error: 'Erro ao gerar QR code.' }
    }
}

export async function gerarQrCodesTodosMembros() {
    await requireRole(['ADMIN'])
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    try {
        const semQr = await db.membro.findMany({
            where: { qr_code: null, is_active: true },
            select: { id: true },
        })

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        let count = 0

        for (const m of semQr) {
            let rnd = ''
            for (let i = 0; i < 4; i++) rnd += chars.charAt(Math.floor(Math.random() * chars.length))
            await db.membro.update({
                where: { id: m.id },
                data: { qr_code: `ADMVC-${tenantId}-${m.id}-${rnd}` },
            })
            count++
        }

        revalidatePath('/admin/membros')
        return { success: true, count }
    } catch (error) {
        console.error('Erro ao gerar QR codes em lote:', error)
        return { error: 'Erro ao gerar QR codes.' }
    }
}

export async function buscarMembroPorQr(qrCode: string) {
    const db = await getDb()
    const qrNormalizado = qrCode.trim()

    console.log('[SCANNER] Procurando QR:', qrNormalizado, '| Comprimento:', qrNormalizado.length)

    try {
        // Busca exacta primeiro
        let membro = await db.membro.findFirst({
            where: { qr_code: qrNormalizado },
            select: { id: true, first_name: true, last_name: true },
        })

        // Fallback: busca pelo membroId extraido do QR (ADMVC-{tenantId}-{membroId}-{random})
        if (!membro && qrNormalizado.startsWith('ADMVC-')) {
            const partes = qrNormalizado.split('-')
            if (partes.length >= 3) {
                const membroIdExtraido = Number(partes[2])
                if (membroIdExtraido > 0) {
                    console.log('[SCANNER] Busca exacta falhou, tentando por membroId:', membroIdExtraido)
                    membro = await db.membro.findFirst({
                        where: { id: membroIdExtraido },
                        select: { id: true, first_name: true, last_name: true },
                    })
                    // Se encontrou, corrigir o QR na BD para futuras leituras
                    if (membro) {
                        console.log('[SCANNER] Membro encontrado por ID, a corrigir QR na BD')
                        await db.membro.update({
                            where: { id: membro.id },
                            data: { qr_code: qrNormalizado },
                        }).catch(() => {}) // silencioso se falhar (ex: unique constraint)
                    }
                }
            }
        }

        if (membro) {
            console.log('[SCANNER] Membro encontrado:', membro.id, membro.first_name)
        } else {
            console.log('[SCANNER] Nenhum membro encontrado para QR:', qrNormalizado)
        }

        return membro || null
    } catch (error) {
        console.error('[SCANNER] Erro ao buscar membro por QR:', error)
        return null
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// LIMITES DE CONSUMO (CONTROLO PARENTAL)
// ══════════════════════════════════════════════════════════════════════════════

export async function definirLimiteCantina(
    membroId: number,
    limiteDiario: number | null,
    limiteSemanal: number | null
) {
    await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    // Verificar que o membro pertence a mesma familia do utilizador autenticado (ou e admin)
    const session = await requireAuth()
    const isAdmin = session.role === 'ADMIN' || session.role === 'CONGREGATION_ADMIN'

    if (!isAdmin) {
        // Verificar vinculo familiar
        const membroLogado = await db.membro.findUnique({
            where: { id: session.membroId },
            select: { familia_id: true },
        })
        const membroAlvo = await db.membro.findUnique({
            where: { id: membroId },
            select: { familia_id: true },
        })

        if (!membroLogado?.familia_id || membroLogado.familia_id !== membroAlvo?.familia_id) {
            return { error: 'So pode definir limites para membros da sua familia.' }
        }
    }

    try {
        // Buscar ou criar saldo
        let saldo = await db.saldoCantina.findUnique({ where: { membro_id: membroId } })

        if (!saldo) {
            await (db as any).saldoCantina.create({
                data: { tenant_id: tenantId, membro_id: membroId, saldo: 0, limite_diario: limiteDiario, limite_semanal: limiteSemanal },
            })
        } else {
            await db.saldoCantina.update({
                where: { membro_id: membroId },
                data: { limite_diario: limiteDiario, limite_semanal: limiteSemanal },
            })
        }

        revalidatePath('/membros/dashboard')
        return { success: true }
    } catch (error) {
        console.error('Erro ao definir limite:', error)
        return { error: 'Erro ao definir limite.' }
    }
}

export async function obterLimitesFilhos() {
    const session = await requireAuth()
    const db = await getDb()

    const membro = await db.membro.findUnique({
        where: { id: session.membroId },
        select: { familia_id: true },
    })

    if (!membro?.familia_id) return []

    // Buscar todos os membros da mesma familia (exceto o proprio)
    const familiares = await db.membro.findMany({
        where: {
            familia_id: membro.familia_id,
            id: { not: session.membroId },
            is_active: true,
        },
        select: { id: true, first_name: true, last_name: true },
        orderBy: { first_name: 'asc' },
    })

    // Buscar saldos com limites
    const saldos = await db.saldoCantina.findMany({
        where: { membro_id: { in: familiares.map(f => f.id) } },
        select: { membro_id: true, limite_diario: true, limite_semanal: true },
    })

    return familiares.map(f => {
        const saldo = saldos.find(s => s.membro_id === f.id)
        return {
            ...f,
            limite_diario: saldo?.limite_diario ?? null,
            limite_semanal: saldo?.limite_semanal ?? null,
        }
    })
}

// ══════════════════════════════════════════════════════════════════════════════
// PEDIDOS DE RECARGA (SELF-SERVICE)
// ══════════════════════════════════════════════════════════════════════════════

export async function solicitarRecarga(valor: number, formaPagamento: string) {
    const session = await requireAuth()
    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    if (valor <= 0) return { error: 'O valor deve ser positivo.' }

    try {
        await (db as any).pedidoSaldoCantina.create({
            data: {
                tenant_id: tenantId,
                membro_id: session.membroId,
                valor,
                forma_pagamento: formaPagamento,
                status: 'PENDENTE',
            },
        })

        revalidatePath('/cantina/carregar')
        return { success: true }
    } catch (error) {
        console.error('Erro ao solicitar recarga:', error)
        return { error: 'Erro ao solicitar recarga.' }
    }
}

export async function aprovarRecarga(pedidoId: number) {
    const session = await requireRole(['ADMIN', 'CONGREGATION_ADMIN', 'LEADER', 'USER'])
    const db = await getDb()

    // Apenas admin ou lider/integrante da cantina pode aprovar recargas
    if (!isAdmin(session.role)) {
        const membroCantina = await db.integranteDepartamento.findFirst({
            where: {
                membro_id: session.membroId,
                departamento: { nome: { contains: 'cantina', mode: 'insensitive' } },
            },
        })
        const liderCantina = await db.departamento.findFirst({
            where: {
                lider_id: session.membroId,
                nome: { contains: 'cantina', mode: 'insensitive' },
            },
        })
        if (!membroCantina && !liderCantina) {
            throw new Error('Sem permissão. Apenas líderes da cantina podem aprovar recargas.')
        }
    }

    const pedido = await db.pedidoSaldoCantina.findUnique({ where: { id: pedidoId } })
    if (!pedido || pedido.status !== 'PENDENTE') return { error: 'Pedido nao encontrado ou ja processado.' }

    // Credit saldo
    const result = await recarregarSaldo(pedido.membro_id, pedido.valor, `Recarga aprovada (${pedido.forma_pagamento})`)
    if (result.error) return result

    // Update pedido status
    await db.pedidoSaldoCantina.update({
        where: { id: pedidoId },
        data: { status: 'APROVADO' },
    })

    revalidatePath('/cantina/recargas')
    return { success: true }
}
