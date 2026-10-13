// Mural: so com o modulo ligado na igreja (Super Admin → Modulos).
import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'

export default async function MembrosMuralLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.MURAL)
    return <>{children}</>
}
