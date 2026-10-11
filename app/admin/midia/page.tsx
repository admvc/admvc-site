// app/admin/midia/page.tsx
import { getDb, getTenantIdFromHeaders } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { getModulosAtivos, MODULOS } from '@/lib/planos'
import MidiaConfigClient from '@/components/admin/MidiaConfigClient'
import LumikitCenasEditor from '@/components/admin/LumikitCenasEditor'
import X32CenasEditor from '@/components/admin/X32CenasEditor'
import Link from 'next/link'
import { Music2, Lightbulb, MonitorPlay, Download, Terminal, ArrowRight, Settings, ChevronDown } from 'lucide-react'
import type { LumikitConfig, X32CenasConfig } from '@/actions/midia-actions'
import Breadcrumbs from '@/components/Breadcrumbs'

export default async function MidiaConfigPage() {
    const session = await getSessionData()
    if (!session || !['ADMIN'].includes(session.role)) redirect('/membros/dashboard')

    const db = await getDb()
    const tenantId = await getTenantIdFromHeaders()

    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: {
            plano: true,
            modulos_custom: true,
            holyrics_url: true,
            holyrics_token: true,
            x32_ip: true,
            x32_port: true,
            lumikit_url: true,
            lumikit_cenas: true,
            x32_cenas: true,
        }
    })

    const modulosAtivos = getModulosAtivos(tenant?.plano || 'FREE', tenant?.modulos_custom as string[] | null)
    const temMesaSom = modulosAtivos.includes(MODULOS.MESA_SOM)
    const temLumikit = modulosAtivos.includes(MODULOS.LUMIKIT)

    const lumikitCenas = (tenant?.lumikit_cenas as LumikitConfig | null) || { scenes: [] }
    const x32Cenas = (tenant?.x32_cenas as X32CenasConfig | null) || { scenes: [] }

    return (
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-700 pb-20">
            <Breadcrumbs items={[{ label: 'Mídia' }]} />

            <header className="space-y-1">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg">Midia</h1>
                <p className="text-xs text-muted">Equipamentos de som, iluminacao e projeccao.</p>
            </header>

            {/* ACESSO RAPIDO — Links para os modulos */}
            {(temMesaSom || temLumikit) && (
                <div className="grid sm:grid-cols-2 gap-3">
                    {temMesaSom && (
                        <Link href="/midia/mesax32"
                            className="bg-bg2 border border-soft rounded-2xl p-4 hover:border-blue-500/30 transition-all flex items-center justify-between gap-4 group">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Music2 size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-fg">Mesa X32</p>
                                    <p className="text-[8px] font-bold text-muted">Controlo de faders</p>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-muted group-hover:text-blue-500 transition-colors" />
                        </Link>
                    )}
                    {temLumikit && (
                        <Link href="/midia/lumikit"
                            className="bg-bg2 border border-soft rounded-2xl p-4 hover:border-amber-500/30 transition-all flex items-center justify-between gap-4 group">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Lightbulb size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-fg">Lumikit</p>
                                    <p className="text-[8px] font-bold text-muted">Controlo de cenas</p>
                                </div>
                            </div>
                            <ArrowRight size={14} className="text-muted group-hover:text-amber-500 transition-colors" />
                        </Link>
                    )}
                </div>
            )}

            {/* CONFIGURACOES DE DISPOSITIVOS — colapsavel */}
            <details className="group bg-bg2 border border-soft rounded-2xl overflow-hidden">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between px-5 py-4 hover:bg-soft/10 transition-colors">
                    <div className="flex items-center gap-2">
                        <Settings size={14} className="text-figueira" />
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg">Dispositivos</h2>
                        <span className="text-[8px] bg-soft/50 px-2 py-0.5 rounded text-muted font-bold">
                            {[tenant?.holyrics_url, tenant?.x32_ip, tenant?.lumikit_url].filter(Boolean).length}/3 configurados
                        </span>
                    </div>
                    <ChevronDown size={14} className="text-muted group-open:rotate-180 transition-transform" />
                </summary>
                <div className="border-t border-soft">
                    <MidiaConfigClient config={tenant} />
                </div>
            </details>

            {/* BOTOES DE ILUMINACAO — colapsavel */}
            {temLumikit && (
                <details className="group bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between px-5 py-4 hover:bg-soft/10 transition-colors">
                        <div className="flex items-center gap-2">
                            <Lightbulb size={14} className="text-amber-500" />
                            <h2 className="text-sm font-black uppercase tracking-widest text-fg">Botoes Iluminacao</h2>
                            <span className="text-[8px] bg-soft/50 px-2 py-0.5 rounded text-muted font-bold">{lumikitCenas.scenes.length}</span>
                        </div>
                        <ChevronDown size={14} className="text-muted group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="border-t border-soft p-5">
                        <LumikitCenasEditor initialConfig={lumikitCenas} />
                    </div>
                </details>
            )}

            {/* PRESETS MESA DE SOM — colapsavel */}
            {temMesaSom && (
                <details className="group bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between px-5 py-4 hover:bg-soft/10 transition-colors">
                        <div className="flex items-center gap-2">
                            <Music2 size={14} className="text-blue-500" />
                            <h2 className="text-sm font-black uppercase tracking-widest text-fg">Presets Mesa de Som</h2>
                            <span className="text-[8px] bg-soft/50 px-2 py-0.5 rounded text-muted font-bold">{x32Cenas.scenes.length}</span>
                        </div>
                        <ChevronDown size={14} className="text-muted group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="border-t border-soft p-5">
                        <X32CenasEditor initialConfig={x32Cenas} />
                    </div>
                </details>
            )}

            {/* PROXY LOCAL — colapsavel */}
            {temMesaSom && (
                <details className="group bg-bg2 border border-soft rounded-2xl overflow-hidden">
                    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between px-5 py-4 hover:bg-soft/10 transition-colors">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-figueira" />
                            <h2 className="text-sm font-black uppercase tracking-widest text-fg">Proxy Local (X32)</h2>
                            <span className="text-[8px] bg-soft/50 px-2 py-0.5 rounded text-muted font-bold">Avancado</span>
                        </div>
                        <ChevronDown size={14} className="text-muted group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="border-t border-soft p-5 space-y-4">
                        <p className="text-xs text-muted leading-relaxed">
                            O X32 usa protocolo OSC (UDP). Para controlar a mesa pelo Cloud, corra o proxy no PC da igreja.
                        </p>

                        <div className="bg-bg border border-soft rounded-xl p-4 space-y-3">
                            <p className="text-[8px] font-black uppercase tracking-widest text-figueira">Script (Node.js)</p>
                            <div className="bg-black/50 rounded-lg px-3 py-2 font-mono text-emerald-400 text-xs space-y-1">
                                <p>npm install ws</p>
                                <p>node x32-proxy.js</p>
                            </div>
                            <p className="text-[9px] text-muted">Apos iniciar, conecte com <code className="bg-soft px-1.5 rounded text-[10px]">ws://localhost:8080</code></p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-muted">Downloads:</p>
                            <div className="grid grid-cols-3 gap-2">
                                <a href="https://tjlntjdqtemsmz7i.public.blob.vercel-storage.com/proxy/admvc-x32-proxy-win.exe" download
                                    className="flex flex-col items-center gap-1 py-3 rounded-xl bg-fg text-bg text-[8px] font-black uppercase tracking-widest hover:bg-figueira transition-all">
                                    <Download size={14} /> Windows
                                </a>
                                <a href="https://tjlntjdqtemsmz7i.public.blob.vercel-storage.com/proxy/admvc-x32-proxy-macos" download
                                    className="flex flex-col items-center gap-1 py-3 rounded-xl bg-bg border border-soft text-muted text-[8px] font-black uppercase tracking-widest hover:text-fg hover:border-figueira/30 transition-all">
                                    <Download size={14} /> macOS
                                </a>
                                <a href="https://tjlntjdqtemsmz7i.public.blob.vercel-storage.com/proxy/admvc-x32-proxy-linux" download
                                    className="flex flex-col items-center gap-1 py-3 rounded-xl bg-bg border border-soft text-muted text-[8px] font-black uppercase tracking-widest hover:text-fg hover:border-figueira/30 transition-all">
                                    <Download size={14} /> Linux
                                </a>
                            </div>
                            <a href="https://tjlntjdqtemsmz7i.public.blob.vercel-storage.com/proxy/x32-proxy.js" download="x32-proxy.js"
                                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest text-muted hover:text-fg transition-all">
                                <Download size={10} /> Ou descarregar script .js
                            </a>
                        </div>
                    </div>
                </details>
            )}
        </main>
    )
}
