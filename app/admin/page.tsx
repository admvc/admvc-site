// app/admin/page.tsx
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'

export default async function RaizAdmin() {
    const session = await getSessionData()

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