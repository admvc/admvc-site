import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'

export default async function EscalasLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.ESCALAS)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
