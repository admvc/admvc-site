import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'
export default async function AcaoSocialLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.ASSISTENCIA)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
