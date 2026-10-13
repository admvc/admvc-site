// Personalizacao: so com o modulo ligado na igreja (Super Admin → Modulos).
import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'

export default async function AdminPersonalizacaoLayout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.PERSONALIZACAO, '/admin/dashboard')
    return <>{children}</>
}
