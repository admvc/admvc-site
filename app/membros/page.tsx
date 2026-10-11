// app/membros/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RaizMembros() {
    const cookieStore = await cookies()
    const session = cookieStore.get('admvc_session')

    if (session) {
        redirect('/membros/dashboard')
    } else {
        redirect('/membros/login')
    }
}