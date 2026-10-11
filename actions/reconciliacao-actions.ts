'use server'
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { requireRole } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

// --- criarContaBancaria ---
export async function criarContaBancaria(formData: FormData) {
    await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const nome = (formData.get('nome') as string)?.trim()
    const iban = (formData.get('iban') as string)?.trim() || null
    const banco = (formData.get('banco') as string)?.trim() || null

    if (!nome) return { ok: false, error: 'Nome da conta e obrigatorio.' }

    try {
        await prisma.contaBancaria.create({
            data: {
                tenant_id: tenantId,
                nome,
                iban,
                banco,
            },
        })
        revalidatePath('/financeiro/reconciliacao')
        return { ok: true }
    } catch (e: any) {
        if (e?.code === 'P2002') return { ok: false, error: 'Ja existe uma conta com este nome.' }
        return { ok: false, error: 'Erro ao criar conta bancaria.' }
    }
}

// --- importarExtrato ---
export async function importarExtrato(contaId: number, csvContent: string) {
    await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    // Detect delimiter
    const lines = csvContent.trim().split(/\r?\n/)
    if (lines.length < 2) return { success: false, error: 'Ficheiro vazio ou sem dados.' }

    const firstLine = lines[0]
    const delimiter = firstLine.includes(';') ? ';' : ','

    // Skip header
    const dataLines = lines.slice(1).filter(l => l.trim().length > 0)

    let imported = 0
    const errors: string[] = []

    for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i]
        const parts = line.split(delimiter).map(p => p.trim().replace(/^"|"$/g, ''))

        if (parts.length < 3) {
            errors.push(`Linha ${i + 2}: formato invalido (menos de 3 colunas)`)
            continue
        }

        const [dataStr, descricao, valorStr, saldoStr] = parts

        // Parse date: DD/MM/YYYY or DD-MM-YYYY
        const dateMatch = dataStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
        if (!dateMatch) {
            errors.push(`Linha ${i + 2}: data invalida "${dataStr}"`)
            continue
        }
        const [, dd, mm, yyyy] = dateMatch
        const parsedDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
        if (isNaN(parsedDate.getTime())) {
            errors.push(`Linha ${i + 2}: data invalida "${dataStr}"`)
            continue
        }

        // Parse value: Portuguese format "1.234,56" -> 1234.56
        const valor = parsePortugueseNumber(valorStr)
        if (valor === null) {
            errors.push(`Linha ${i + 2}: valor invalido "${valorStr}"`)
            continue
        }

        const saldo = saldoStr ? parsePortugueseNumber(saldoStr) : null

        await prisma.movimentoBancario.create({
            data: {
                tenant_id: tenantId,
                conta_id: contaId,
                data: parsedDate,
                descricao: descricao || 'Sem descricao',
                valor,
                saldo_apos: saldo,
                reconciliado: false,
            },
        })
        imported++
    }

    revalidatePath('/financeiro/reconciliacao')
    return { success: true, imported, errors: errors.length > 0 ? errors : undefined }
}

function parsePortugueseNumber(str: string): number | null {
    if (!str || str.trim() === '') return null
    // Remove spaces
    let cleaned = str.trim()
    // Remove currency symbols
    cleaned = cleaned.replace(/[€\s]/g, '')
    // Check if it uses Portuguese format (dot as thousands, comma as decimal)
    // E.g.: "1.234,56" or "-1.234,56" or "1234,56"
    if (cleaned.includes(',')) {
        // Remove thousand separators (dots) and replace comma with dot
        cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    }
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
}

// --- reconciliarMovimento ---
export async function reconciliarMovimento(movimentoId: number, referencia: string) {
    await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()

    if (!referencia || referencia.trim() === '') {
        return { ok: false, error: 'Referencia e obrigatoria.' }
    }

    await prisma.movimentoBancario.update({
        where: { id: movimentoId },
        data: {
            reconciliado: true,
            reconciliado_com: referencia.trim(),
        },
    })

    revalidatePath('/financeiro/reconciliacao')
    return { ok: true }
}

// --- desreconciliar ---
export async function desreconciliar(movimentoId: number) {
    await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()

    await prisma.movimentoBancario.update({
        where: { id: movimentoId },
        data: {
            reconciliado: false,
            reconciliado_com: null,
        },
    })

    revalidatePath('/financeiro/reconciliacao')
    return { ok: true }
}

// --- autoReconciliar ---
export async function autoReconciliar(contaId: number) {
    await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()

    const pendentes = await prisma.movimentoBancario.findMany({
        where: { conta_id: contaId, reconciliado: false },
        orderBy: { data: 'asc' },
    })

    let reconciled = 0

    for (const mov of pendentes) {
        const dataMin = new Date(mov.data)
        dataMin.setDate(dataMin.getDate() - 2)
        const dataMax = new Date(mov.data)
        dataMax.setDate(dataMax.getDate() + 2)

        let matchRef: string | null = null

        if (mov.valor > 0) {
            // Try Contribuicao
            const contribs = await prisma.contribuicao.findMany({
                where: {
                    valor: mov.valor,
                    data: { gte: dataMin, lte: dataMax },
                },
            })
            if (contribs.length === 1) {
                matchRef = `contribuicao:${contribs[0].id}`
            }

            // Try LancamentoFinanceiro if no match yet
            if (!matchRef) {
                const lancs = await prisma.lancamentoFinanceiro.findMany({
                    where: {
                        valor_pago: mov.valor,
                        data_recebimento: { gte: dataMin, lte: dataMax },
                    },
                })
                if (lancs.length === 1) {
                    matchRef = `lancamento:${lancs[0].id}`
                }
            }

            // Try DonativoOnline if no match yet
            if (!matchRef) {
                const donativos = await prisma.donativoOnline.findMany({
                    where: {
                        valor: mov.valor,
                        status: 'CONFIRMADO',
                        criado_em: { gte: dataMin, lte: dataMax },
                    },
                })
                if (donativos.length === 1) {
                    matchRef = `donativo:${donativos[0].id}`
                }
            }
        } else if (mov.valor < 0) {
            // Try DespesaFinanceira (valor is positive in DB, movement is negative)
            const absValor = Math.abs(mov.valor)
            const despesas = await prisma.despesaFinanceira.findMany({
                where: {
                    valor: absValor,
                    data: { gte: dataMin, lte: dataMax },
                    status: { in: ['APROVADA', 'PAGA'] },
                },
            })
            if (despesas.length === 1) {
                matchRef = `despesa:${despesas[0].id}`
            }
        }

        if (matchRef) {
            await prisma.movimentoBancario.update({
                where: { id: mov.id },
                data: {
                    reconciliado: true,
                    reconciliado_com: matchRef,
                },
            })
            reconciled++
        }
    }

    revalidatePath('/financeiro/reconciliacao')
    return { success: true, reconciled, total: pendentes.length }
}

// --- obterResumoReconciliacao ---
export async function obterResumoReconciliacao(contaId: number) {
    await requireRole(['ADMIN', 'FINANCE'])
    const prisma = await getDb()

    const movimentos = await prisma.movimentoBancario.findMany({
        where: { conta_id: contaId },
    })

    const total = movimentos.length
    const reconciliados = movimentos.filter(m => m.reconciliado).length
    const pendentesCount = total - reconciliados
    const totalCreditos = movimentos.filter(m => m.valor > 0).reduce((s, m) => s + m.valor, 0)
    const totalDebitos = movimentos.filter(m => m.valor < 0).reduce((s, m) => s + m.valor, 0)
    const saldo = totalCreditos + totalDebitos

    return {
        total,
        reconciliados,
        pendentes: pendentesCount,
        totalCreditos,
        totalDebitos,
        saldo,
    }
}
