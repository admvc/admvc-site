import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'
import MembroLayoutWrapper from '@/components/membros/MembroLayoutWrapper'
export default async function PregacaoLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.PREGACAO)
    return <MembroLayoutWrapper>{children}</MembroLayoutWrapper>
}
