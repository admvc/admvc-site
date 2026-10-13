// /super-admin abre o painel (o middleware manda para o login se nao houver sessao).
import { redirect } from 'next/navigation'

export default function SuperAdmin() {
    redirect('/super-admin/dashboard')
}
