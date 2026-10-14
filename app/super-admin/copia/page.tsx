import { redirect } from 'next/navigation'
import { DatabaseBackup, Download, ShieldAlert } from 'lucide-react'
import { requireSAAuth } from '@/lib/sa-auth'
import { saAdmin } from '@/lib/copia/acesso'
import { listarCopias, type CopiaGuardada } from '@/lib/copia/guardadas'
import RestaurarCopia from '@/components/superadmin/RestaurarCopia'

// O restauro corre numa server action desta pagina: precisa de tempo.
export const maxDuration = 300

async function guardadas(): Promise<CopiaGuardada[] | null> {
    try {
        return await listarCopias()
    } catch (err) {
        console.warn('[copias] nao consegui listar', err)
        return null
    }
}

const tamanho = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} kB`)

export default async function CopiaPage() {
    await requireSAAuth()
    if (!(await saAdmin())) redirect('/super-admin/dashboard')
    const copias = await guardadas()

    const cartao = 'bg-[#111] border border-[#222] rounded-2xl p-6 space-y-4'
    const titulo = 'text-sm font-black uppercase tracking-widest text-white'

    return (
        <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="border-b border-[#222] pb-6">
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                    <DatabaseBackup size={32} className="text-blue-500" /> Cópia de segurança
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                    A base inteira, de todas as igrejas, num ficheiro — e o restauro a partir dele.
                </p>
            </div>

            <section className={cartao} aria-labelledby="t-descarregar">
                <h2 id="t-descarregar" className={titulo}>Descarregar cópia</h2>
                <p className="text-sm text-zinc-400">
                    Um ficheiro .json com todas as tabelas. Não leva palavras-passe, tokens nem os avisos no
                    telemóvel. Guarde-o num sítio seguro: tem os dados pessoais dos membros.
                </p>
                <a href="/super-admin/copia/descarregar" download
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-blue-500">
                    <Download size={16} aria-hidden /> Descarregar cópia
                </a>
            </section>

            <section className={cartao} aria-labelledby="t-restaurar">
                <h2 id="t-restaurar" className={`${titulo} flex items-center gap-2`}>
                    <ShieldAlert size={16} className="text-red-400" aria-hidden /> Restaurar uma cópia
                </h2>
                <p className="text-sm text-zinc-400">
                    Substitui tudo o que há agora pelo que está na cópia, em todas as igrejas.
                </p>
                <RestaurarCopia />
            </section>

            <section className={cartao} aria-labelledby="t-guardadas">
                <h2 id="t-guardadas" className={titulo}>Cópias guardadas pela app</h2>
                <p className="text-sm text-zinc-400">Gravadas sozinhas antes de cada restauro.</p>
                {copias === null ? (
                    <p className="text-sm text-amber-300">Não consegui ver a lista agora.</p>
                ) : copias.length === 0 ? (
                    <p className="text-sm text-zinc-500">Ainda nenhuma.</p>
                ) : (
                    <ul className="divide-y divide-[#1A1A1A]">
                        {copias.slice(0, 20).map((c) => (
                            <li key={c.caminho} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                <span className="text-zinc-300">
                                    {c.gravadaEm.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon', dateStyle: 'short', timeStyle: 'short' })}
                                    <span className="text-zinc-500"> · {tamanho(c.tamanho)}</span>
                                </span>
                                <a href={`/super-admin/copia/guardada?c=${encodeURIComponent(c.caminho)}`} download
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-blue-400 hover:text-blue-300">
                                    <Download size={14} aria-hidden /> Descarregar
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    )
}
