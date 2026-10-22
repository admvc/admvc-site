// O antigo "Culto no Holyrics" saiu (21/10): o culto passa para o Holyrics pelo módulo "Receber o culto do portal" no próprio PC.
// Fica este endereço só para quem o tinha nos favoritos.
import { redirect } from 'next/navigation'

export default function CultoNoHolyricsAntigo() {
    redirect('/membros/dashboard')
}
