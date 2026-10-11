// app/page.tsx — Cloud: redireciona para o login
import { redirect } from 'next/navigation'

export default function Home() {
    redirect('/membros/login')
}
