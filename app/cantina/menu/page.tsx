// app/cantina/menu/page.tsx
// Redireciona para o menu local (sistema interno)
import { redirect } from 'next/navigation'

export default function CantinaMenuRedirect() {
    redirect('/cantina/menu-local')
}
