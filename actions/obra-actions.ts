'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { audit } from '@/lib/audit'
import { obraDaIgreja } from '@/lib/obra'

export type EstadoObra = { ok: boolean; erro?: string }

const texto = (f: FormData, k: string) => String(f.get(k) ?? '').trim()
const numero = (f: FormData, k: string) => {
    const v = Number(texto(f, k).replace(/\s/g, '').replace(',', '.'))
    return Number.isFinite(v) ? v : NaN
}

/** Grava a campanha dos tijolos. Só o financeiro e os administradores. */
export async function guardarObraAction(_antes: EstadoObra, formData: FormData): Promise<EstadoObra> {
    let sessao
    try {
        sessao = await requireRole(['ADMIN', 'FINANCE'])
    } catch {
        return { ok: false, erro: 'Sem permissão para alterar a obra.' }
    }

    const titulo = texto(formData, 'titulo')
    const objetivoFinal = numero(formData, 'objetivoFinal')
    const valorTijolo = numero(formData, 'valorTijolo')
    const arrecadado = numero(formData, 'arrecadado')
    const contribuintes = numero(formData, 'contribuintes')

    if (titulo.length < 3) return { ok: false, erro: 'Escreva o título da campanha.' }
    if (!(objetivoFinal > 0)) return { ok: false, erro: 'O valor total da obra tem de ser maior que zero.' }
    if (!(valorTijolo > 0) || valorTijolo > objetivoFinal) return { ok: false, erro: 'O valor de cada tijolo tem de estar entre 1 € e o valor da obra.' }
    if (objetivoFinal / valorTijolo > 2000) return { ok: false, erro: 'São tijolos a mais (máximo 2000). Aumente o valor de cada tijolo.' }
    if (!(arrecadado >= 0)) return { ok: false, erro: 'O valor arrecadado não pode ser negativo.' }
    if (!(contribuintes >= 0) || !Number.isInteger(contribuintes)) return { ok: false, erro: 'O número de contribuintes tem de ser um número inteiro.' }

    const tenantId = sessao.tenantId
    const antes = await obraDaIgreja(tenantId)
    const dados = {
        titulo,
        objetivoFinal,
        valorTijolo,
        arrecadado,
        contribuintes,
        chamada: texto(formData, 'chamada') || null,
        versiculo: texto(formData, 'versiculo') || null,
        versiculoRef: texto(formData, 'versiculoRef') || null,
    }
    await getTenantClient(tenantId).projetoObra.update({ where: { id: antes.id }, data: dados })

    await audit({
        tenant_id: tenantId,
        categoria: 'FINANCEIRO',
        acao: 'EDITAR',
        descricao: 'Campanha da obra atualizada',
        dados_antes: { objetivoFinal: antes.objetivoFinal, valorTijolo: antes.valorTijolo, arrecadado: antes.arrecadado, contribuintes: antes.contribuintes },
        dados_apos: { objetivoFinal, valorTijolo, arrecadado, contribuintes },
    })

    revalidatePath('/departamentos/financeiro/obra')
    revalidatePath('/tesouraria')
    return { ok: true }
}
