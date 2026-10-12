import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'

export default async function LouvorLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.LOUVOR)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
