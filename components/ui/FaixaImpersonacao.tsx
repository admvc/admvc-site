// Faixa no topo quando alguém do Cloud entrou como este membro ("impersonar"):
// diz quem está a ver e dá para voltar ao Cloud.
import { getSessionData } from '@/lib/auth-utils'
import { terminarImpersonacao } from '@/actions/super-admin-actions'
import { ShieldAlert, LogOut } from 'lucide-react'

export default async function FaixaImpersonacao() {
    const session = await getSessionData()
    if (!session?.impersonadoPor) return null
    return (
        <div role="status" className="sticky top-0 z-[60] flex flex-wrap items-center justify-between gap-2 bg-amber-500 text-black px-4 py-2 text-[14px] font-semibold">
            <span className="flex items-center gap-2 min-w-0">
                <ShieldAlert size={16} className="shrink-0" aria-hidden />
                <span className="truncate">
                    {session.impersonadoPor.nome} (Cloud) a ver como administrador · tudo fica registado
                </span>
            </span>
            <form action={terminarImpersonacao}>
                <button type="submit" className="flex items-center gap-1.5 rounded-lg bg-black/85 text-white px-3 py-1.5 text-[13px] font-bold hover:bg-black">
                    <LogOut size={14} aria-hidden /> Voltar ao Cloud
                </button>
            </form>
        </div>
    )
}
