import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'

export default async function GruposLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.GRUPOS)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
