// Banco de fundos: acesso à base (sempre com tenant_id) e ao Blob. Só no servidor. A parte pura está em lib/fundos.ts.
import { del } from '@vercel/blob'
import prisma from '@/lib/prisma'
import { categoriaValida, moverNaLista, urlDoBlob, type CategoriaFundo, type Fundo } from '@/lib/fundos'

const campos = { id: true, nome: true, categoria: true, url: true, largura: true, altura: true, bytes: true, ordem: true } as const

export async function listarFundos(tenantId: number, categoria?: string | null): Promise<Fundo[]> {
    const r = await prisma.fundoMidia.findMany({
        where: { tenant_id: tenantId, ...(categoriaValida(categoria) ? { categoria } : {}) },
        orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }, { id: 'asc' }],
        select: campos,
    })
    return r as Fundo[]
}

export async function criarFundo(tenantId: number, membroId: number | null, d: { nome: string; categoria: CategoriaFundo; url: string; largura: number; altura: number; bytes: number }): Promise<Fundo> {
    const ultimo = await prisma.fundoMidia.aggregate({ where: { tenant_id: tenantId, categoria: d.categoria }, _max: { ordem: true } })
    const r = await prisma.fundoMidia.create({
        data: { tenant_id: tenantId, criado_por: membroId, ...d, ordem: (ultimo._max.ordem ?? 0) + 1 },
        select: campos,
    })
    return r as Fundo
}

export async function atualizarFundo(tenantId: number, id: number, d: { nome?: string; categoria?: CategoriaFundo }): Promise<Fundo | null> {
    const atual = await prisma.fundoMidia.findFirst({ where: { id, tenant_id: tenantId } })
    if (!atual) return null
    const data: { nome?: string; categoria?: CategoriaFundo; ordem?: number } = {}
    if (d.nome !== undefined) data.nome = d.nome
    if (d.categoria && d.categoria !== atual.categoria) {
        const ultimo = await prisma.fundoMidia.aggregate({ where: { tenant_id: tenantId, categoria: d.categoria }, _max: { ordem: true } })
        data.categoria = d.categoria
        data.ordem = (ultimo._max.ordem ?? 0) + 1
    }
    const r = await prisma.fundoMidia.update({ where: { id }, data, select: campos })
    return r as Fundo
}

/** Move um fundo uma casa dentro da categoria (renumera a categoria toda para não haver empates). */
export async function moverFundo(tenantId: number, id: number, dir: -1 | 1): Promise<boolean> {
    const atual = await prisma.fundoMidia.findFirst({ where: { id, tenant_id: tenantId }, select: { categoria: true } })
    if (!atual) return false
    const lista = await prisma.fundoMidia.findMany({ where: { tenant_id: tenantId, categoria: atual.categoria }, orderBy: [{ ordem: 'asc' }, { id: 'asc' }], select: { id: true } })
    const nova = moverNaLista(lista.map((x) => x.id), id, dir)
    await prisma.$transaction(nova.map((fid, i) => prisma.fundoMidia.update({ where: { id: fid }, data: { ordem: i + 1 } })))
    return true
}

/** Apaga o registo e o ficheiro do Blob. Devolve false se não existir. */
export async function apagarFundo(tenantId: number, id: number): Promise<boolean> {
    const f = await prisma.fundoMidia.findFirst({ where: { id, tenant_id: tenantId } })
    if (!f) return false
    await prisma.fundoMidia.delete({ where: { id } })
    if (urlDoBlob(f.url)) {
        try { await del(f.url) } catch { /* o registo já saiu; um ficheiro órfão não estraga nada */ }
    }
    return true
}
