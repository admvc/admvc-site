import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'

export default async function InventarioLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.INVENTARIO)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
