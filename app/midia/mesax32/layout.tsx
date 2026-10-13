// Mesa de som: so com o modulo ligado na igreja (Super Admin → Modulos).
import { exigirModuloAtivo } from '@/lib/modulos'
import { MODULOS } from '@/lib/planos'

export default async function MidiaMesax32Layout({ children }: { children: React.ReactNode }) {
    await exigirModuloAtivo(MODULOS.MESA_SOM)
    return <>{children}</>
}
