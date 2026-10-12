import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'
export default async function EBDLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.EBD)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
