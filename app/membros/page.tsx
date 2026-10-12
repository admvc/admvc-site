// app/membros/page.tsx
import { getSessionData } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'

export default async function RaizMembros() {
    const session = await getSessionData()

    if (session) {
        redirect('/membros/dashboard')
    } else {
        redirect('/membros/login')
    }
}