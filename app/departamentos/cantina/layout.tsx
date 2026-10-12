import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'

// Modulo desligado no painel Cloud: volta ao inicio
export default async function Layout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.CANTINA)
    return <>{children}</>
}
