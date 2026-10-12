import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'

export default async function FinanceiroLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.FINANCEIRO)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
