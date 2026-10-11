import { cookies } from 'next/headers'
import { LogOut, ShieldAlert } from 'lucide-react'
import { logoutSuperAdmin } from '@/actions/sa-auth-actions'
import prismaGlobal from '@/lib/prisma'
import SANav from '@/components/superadmin/SANav'

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    const saSession = cookieStore.get('admvc_sa_session')

    if (!saSession) {
        return <>{children}</>
    }

    const onboardingPendente = await prismaGlobal.tenant.count({
        where: { onboarding_completo: false },
    })

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex flex-col md:flex-row font-sans text-white">

            {/* SIDEBAR */}
            <aside className="hidden md:flex w-64 bg-[#111111] border-r border-[#222] flex-col justify-between shrink-0 sticky top-0 h-dvh">
                <div className="flex flex-col flex-1 overflow-y-auto">
                    <div className="h-20 flex items-center px-8 border-b border-[#222] shrink-0">
                        <a href="/super-admin/dashboard" className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
                            </div>
                            <span className="font-black italic uppercase tracking-tighter text-lg">
                                ADMVC <span className="text-blue-500">Cloud</span>
                            </span>
                        </a>
                    </div>

                    <SANav onboardingPendente={onboardingPendente} />
                </div>

                <div className="p-4 border-t border-[#222] shrink-0">
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#1A1A1A] rounded-xl border border-[#333] mb-4">
                        <ShieldAlert size={16} className="text-orange-500" />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">Acesso Restrito</p>
                            <p className="text-[10px] font-bold text-zinc-400">Super Administrador</p>
                        </div>
                    </div>

                    <form action={logoutSuperAdmin}>
                        <button type="submit" className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
                            <LogOut size={14} /> Terminar Sessao
                        </button>
                    </form>
                </div>
            </aside>

            {/* MOBILE HEADER */}
            <SAMobileHeader onboardingPendente={onboardingPendente} />

            <main className="flex-1 overflow-y-auto bg-[#0A0A0A]">
                <div className="min-h-screen text-white bg-gradient-to-br from-[#0A0A0A] to-[#111111]">
                    {children}
                </div>
            </main>
        </div>
    )
}

function SAMobileHeader({ onboardingPendente }: { onboardingPendente: number }) {
    return (
        <div className="md:hidden sticky top-0 z-50 bg-[#111] border-b border-[#222] px-4 py-3 flex items-center justify-between">
            <a href="/super-admin/dashboard" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
                </div>
                <span className="font-black italic uppercase tracking-tighter text-sm text-white">
                    ADMVC <span className="text-blue-500">Cloud</span>
                </span>
            </a>
            <SANav onboardingPendente={onboardingPendente} mobile />
        </div>
    )
}
