// Os sermões passaram para o histórico das pregações (com os esboços).
import { redirect } from 'next/navigation'

export default function SermoesPage() {
    redirect('/pregacao/historico')
}
