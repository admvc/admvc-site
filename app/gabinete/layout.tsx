import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'

export default async function GabineteLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.GABINETE)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
