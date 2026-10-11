// app/admin/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RaizAdmin() {
    const cookieStore = await cookies()
    const session = cookieStore.get('admvc_session')

    // LÓGICA DE DIRECIONAMENTO:
    if (session) {
        // Se o cookie existir, ele vai direto para o painel de controle
        redirect('/admin/dashboard')
    } else {
        // Se não houver sessão, ele é mandado para a tela de login do admin
        redirect('/membros/login')
    }

    // Como o redirect interrompe a execução, o retorno abaixo nunca aparece, 
    // mas é necessário para o Next.js não reclamar.
    return null
}