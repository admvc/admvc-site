import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'

export default async function BoleiaLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.BOLEIA)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
