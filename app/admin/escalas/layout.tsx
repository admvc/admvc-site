// Escalas: so com o modulo ligado na igreja (Super Admin → Modulos).
import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'

export default async function AdminEscalasLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.ESCALAS, '/admin/dashboard')
    return <>{children}</>
}
