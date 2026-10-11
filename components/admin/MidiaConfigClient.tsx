'use client'

import { useState } from 'react'
import {
    MonitorPlay, Music2, Lightbulb, Save, Loader2, CheckCircle2,
    XCircle, Wifi, WifiOff, Settings
} from 'lucide-react'
import { salvarConfigMidia, testarConectividade } from '@/actions/midia-actions'

interface Config {
    holyrics_url?: string | null
    holyrics_token?: string | null
    x32_ip?: string | null
    x32_port?: number | null
    lumikit_url?: string | null
}

type TestResult = { ok: boolean; status?: number; info?: string } | null

export default function MidiaConfigClient({ config }: { config: Config | null }) {
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    const [testHolyrics, setTestHolyrics] = useState<TestResult>(null)
    const [testX32, setTestX32] = useState<TestResult>(null)
    const [testLumikit, setTestLumikit] = useState<TestResult>(null)
    const [testing, setTesting] = useState<string | null>(null)

    // Form state
    const [holyricsUrl, setHolyricsUrl] = useState(config?.holyrics_url || '')
    const [holyricsToken, setHolyricsToken] = useState(config?.holyrics_token || '')
    const [x32Ip, setX32Ip] = useState(config?.x32_ip || '')
    const [x32Port, setX32Port] = useState(config?.x32_port?.toString() || '10023')
    const [lumikitUrl, setLumikitUrl] = useState(config?.lumikit_url || '')

    async function handleSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setSaving(true)
        setMsg('')
        const fd = new FormData(e.currentTarget)
        const res = await salvarConfigMidia(fd)
        setSaving(false)
        setMsg(res.ok ? 'Configuracoes guardadas!' : (res.error || 'Erro'))
        setTimeout(() => setMsg(''), 4000)
    }

    async function handleTest(tipo: 'holyrics' | 'x32' | 'lumikit') {
        setTesting(tipo)
        const url = tipo === 'holyrics' ? holyricsUrl : tipo === 'x32' ? x32Ip : lumikitUrl
        const token = tipo === 'holyrics' ? holyricsToken : undefined
        const res = await testarConectividade(tipo, url, token)
        if (tipo === 'holyrics') setTestHolyrics(res)
        if (tipo === 'x32') setTestX32(res)
        if (tipo === 'lumikit') setTestLumikit(res)
        setTesting(null)
    }

    return (
        <div className="p-5 space-y-5">
            {msg && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold ${msg.includes('guardadas') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <CheckCircle2 size={14} /> {msg}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">

                {/* HOLYRICS */}
                <DeviceCard
                    icon={<MonitorPlay size={20} />}
                    title="Holyrics"
                    description="Software de projeccao de letras e midias"
                    color="purple"
                    testResult={testHolyrics}
                    testing={testing === 'holyrics'}
                    onTest={() => handleTest('holyrics')}
                >
                    <div className="grid sm:grid-cols-2 gap-3">
                        <InputField label="Endereco (URL)" name="holyrics_url" value={holyricsUrl} onChange={setHolyricsUrl}
                            placeholder="http://192.168.1.100:8090" />
                        <InputField label="Token de Acesso" name="holyrics_token" value={holyricsToken} onChange={setHolyricsToken}
                            placeholder="LGDaoWadzR7Bn4fS" />
                    </div>
                </DeviceCard>

                {/* BEHRINGER X32 */}
                <DeviceCard
                    icon={<Music2 size={20} />}
                    title="Behringer X32"
                    description="Mesa de som digital — controlo via protocolo OSC"
                    color="blue"
                    testResult={testX32}
                    testing={testing === 'x32'}
                    onTest={() => handleTest('x32')}
                >
                    <div className="grid sm:grid-cols-2 gap-3">
                        <InputField label="Endereco IP" name="x32_ip" value={x32Ip} onChange={setX32Ip}
                            placeholder="192.168.1.50" />
                        <InputField label="Porta OSC" name="x32_port" value={x32Port} onChange={setX32Port}
                            placeholder="10023" type="number" />
                    </div>
                </DeviceCard>

                {/* LUMIKIT */}
                <DeviceCard
                    icon={<Lightbulb size={20} />}
                    title="Lumikit"
                    description="Controlador de iluminacao — DMX / Art-Net"
                    color="amber"
                    testResult={testLumikit}
                    testing={testing === 'lumikit'}
                    onTest={() => handleTest('lumikit')}
                >
                    <InputField label="Endereco (URL)" name="lumikit_url" value={lumikitUrl} onChange={setLumikitUrl}
                        placeholder="http://192.168.1.60" />
                </DeviceCard>

                {/* GUARDAR */}
                <div className="flex justify-end">
                    <button type="submit" disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-fg text-bg text-[9px] font-black uppercase tracking-widest hover:bg-figueira transition-all disabled:opacity-50 shadow-sm">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                        Guardar Configuracoes
                    </button>
                </div>
            </form>
        </div>
    )
}

function DeviceCard({ icon, title, description, color, testResult, testing, onTest, children }: {
    icon: React.ReactNode
    title: string
    description: string
    color: string
    testResult: TestResult
    testing: boolean
    onTest: () => void
    children: React.ReactNode
}) {
    const colors: Record<string, string> = {
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    }

    return (
        <div className="bg-bg2 border border-soft rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-soft">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors[color]}`}>
                        {icon}
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-fg">{title}</h2>
                        <p className="text-[8px] font-bold text-muted uppercase tracking-widest">{description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Status */}
                    {testResult && (
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1 ${testResult.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-400'}`}>
                            {testResult.ok ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                            {testResult.ok ? 'Conectado' : testResult.info ? 'Info' : 'Offline'}
                        </span>
                    )}
                    <button type="button" onClick={onTest} disabled={testing}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-bg border border-soft text-[8px] font-black uppercase tracking-widest text-muted hover:text-fg hover:border-figueira/30 transition-all disabled:opacity-50">
                        {testing ? <Loader2 size={11} className="animate-spin" /> : <Wifi size={11} />}
                        Testar
                    </button>
                </div>
            </div>

            <div className="p-5 space-y-3">
                {children}
                {testResult && !testResult.ok && testResult.info && (
                    <p className="text-[9px] text-orange-400 bg-orange-500/5 border border-orange-500/10 px-3 py-2 rounded-lg">
                        {testResult.info}
                    </p>
                )}
            </div>
        </div>
    )
}

function InputField({ label, name, value, onChange, placeholder, type = 'text' }: {
    label: string; name: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-[8px] font-black uppercase tracking-widest text-muted">{label}</label>
            <input type={type} name={name} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                className="w-full bg-bg border border-soft rounded-xl px-3 py-2.5 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted/30" />
        </div>
    )
}
