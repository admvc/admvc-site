// /boasvindas: formulário do QR no culto. Cada congregação tem o seu QR
// (/boasvindas?c=montemor) para a equipa saber onde a pessoa esteve.
import prisma from '@/lib/prisma'
import { acharCongregacao } from '@/lib/congregacao-site'
import FormBoasVindas from './FormBoasVindas'

export default async function BoasVindasPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
    const { c } = await searchParams
    let congregacao: { id: number; nome: string } | null = null
    if (c) {
        try {
            // A mesma igreja que o formulário usa (/api/public/visitante)
            const tenant = await prisma.tenant.findFirst({ where: { status: 'ATIVO' }, orderBy: { id: 'asc' }, select: { id: true } })
                ?? await prisma.tenant.findFirst({ orderBy: { id: 'asc' }, select: { id: true } })
            if (tenant) {
                const lista = await prisma.congregacao.findMany({ where: { tenant_id: tenant.id }, select: { id: true, nome: true } })
                congregacao = acharCongregacao(lista, c)
            }
        } catch (err) {
            // Sem base: o formulário funciona na mesma, só sem a congregação
            console.error('[BOASVINDAS] Falha a ler a congregação:', err)
        }
    }
    return <FormBoasVindas congregacao={congregacao} />
}
