import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'
export default async function CantLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.CANTINA)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
