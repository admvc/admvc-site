'use client'

import { useState } from 'react'
import {
    Plus, Trash2, Save, Loader2, CheckCircle2,
    Lightbulb, Sun, Moon, Sparkles, Zap, Power, Star,
    Music, Heart, Eye, Flame, CloudLightning, Sunrise, Mic, Church,
    Volume2, VolumeX, Headphones, Speaker, Radio, Sliders,
    type LucideIcon
} from 'lucide-react'
import { salvarX32Cenas, type X32Scene, type X32CenasConfig } from '@/actions/midia-actions'

const CORES = [
    { id: 'blue', nome: 'Azul', classe: 'bg-blue-500' },
    { id: 'purple', nome: 'Roxo', classe: 'bg-purple-500' },
    { id: 'amber', nome: 'Amarelo', classe: 'bg-amber-500' },
    { id: 'indigo', nome: 'Indigo', classe: 'bg-indigo-500' },
    { id: 'emerald', nome: 'Verde', classe: 'bg-emerald-500' },
    { id: 'red', nome: 'Vermelho', classe: 'bg-red-500' },
    { id: 'pink', nome: 'Rosa', classe: 'bg-pink-500' },
    { id: 'cyan', nome: 'Ciano', classe: 'bg-cyan-500' },
]

const ICONES: { id: string; icon: LucideIcon; nome: string }[] = [
    { id: 'volume2', icon: Volume2, nome: 'Volume' },
    { id: 'volumex', icon: VolumeX, nome: 'Mute' },
    { id: 'headphones', icon: Headphones, nome: 'Auscultadores' },
    { id: 'speaker', icon: Speaker, nome: 'Altifalante' },
    { id: 'radio', icon: Radio, nome: 'Radio' },
    { id: 'sliders', icon: Sliders, nome: 'Faders' },
    { id: 'mic', icon: Mic, nome: 'Microfone' },
    { id: 'music', icon: Music, nome: 'Musica' },
    { id: 'church', icon: Church, nome: 'Igreja' },
    { id: 'zap', icon: Zap, nome: 'Raio' },
    { id: 'power', icon: Power, nome: 'Power' },
    { id: 'star', icon: Star, nome: 'Estrela' },
    { id: 'heart', icon: Heart, nome: 'Coracao' },
    { id: 'lightbulb', icon: Lightbulb, nome: 'Lampada' },
    { id: 'sun', icon: Sun, nome: 'Sol' },
]

interface Props {
    initialConfig: X32CenasConfig
}

export default function X32CenasEditor({ initialConfig }: Props) {
    const [scenes, setScenes] = useState<X32Scene[]>(initialConfig.scenes)
    const [saving, setSaving] = useState(false)
    const [msg, setMsg] = useState('')

    const addScene = () => {
        setScenes(prev => [...prev, {
            id: crypto.randomUUID(),
            nome: '',
            cor: 'blue',
            icone: 'volume2',
            tipo: 'push',
            endpoint: 'FavoriteAction',
            scriptOn: '',
            scriptOff: '',
        }])
    }

    const update = (id: string, field: keyof X32Scene, value: any) => {
        setScenes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    const remove = (id: string) => {
        setScenes(prev => prev.filter(s => s.id !== id))
    }

    const handleSave = async () => {
        setSaving(true)
        setMsg('')
        const res = await salvarX32Cenas({ scenes })
        setSaving(false)
        setMsg(res.ok ? 'Presets guardados!' : (res.error || 'Erro'))
        setTimeout(() => setMsg(''), 4000)
    }

    return (
        <div className="space-y-4">
            {msg && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold ${msg.includes('guardados') ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                    <CheckCircle2 size={14} /> {msg}
                </div>
            )}

            <div className="flex items-center justify-end">
                <button onClick={addScene} type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-figueira text-white text-[8px] font-black uppercase tracking-widest hover:bg-figueira/90 transition-all">
                    <Plus size={12} /> Adicionar
                </button>
            </div>

            <div className="space-y-4">
                    {scenes.length === 0 && (
                        <p className="text-[10px] text-muted text-center py-4 font-bold uppercase tracking-widest">
                            Nenhum preset configurado. Clique em "Adicionar" para criar.
                        </p>
                    )}

                    {scenes.map((scene) => {
                        const IconPreview = ICONES.find(i => i.id === scene.icone)?.icon || Volume2
                        return (
                            <div key={scene.id} className="p-4 bg-bg border border-soft rounded-xl space-y-4">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[7px] font-black uppercase tracking-widest text-muted">Nome do preset</label>
                                        <input type="text" value={scene.nome} onChange={e => update(scene.id, 'nome', e.target.value)}
                                            placeholder="Ex: Preset Louvor, Mute Banda, Pregacao..."
                                            className="w-full bg-bg2 border border-soft rounded-lg px-3 py-2 text-sm font-bold text-fg focus:border-figueira outline-none placeholder:text-muted/30" />
                                    </div>
                                    <div className="w-32 space-y-1">
                                        <label className="text-[7px] font-black uppercase tracking-widest text-muted">Tipo</label>
                                        <select value={scene.tipo} onChange={e => update(scene.id, 'tipo', e.target.value)}
                                            className="w-full bg-bg2 border border-soft rounded-lg px-2 py-2 text-sm font-bold text-fg focus:border-figueira outline-none">
                                            <option value="push">Push (1x)</option>
                                            <option value="toggle">Liga/Desliga</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button type="button" onClick={() => remove(scene.id)}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors" title="Remover">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[7px] font-black uppercase tracking-widest text-muted">Cor</label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {CORES.map(c => (
                                                <button key={c.id} type="button" onClick={() => update(scene.id, 'cor', c.id)}
                                                    className={`w-6 h-6 rounded-lg ${c.classe} transition-all ${scene.cor === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-bg scale-110' : 'opacity-50 hover:opacity-100'}`}
                                                    title={c.nome} />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[7px] font-black uppercase tracking-widest text-muted">Icone</label>
                                        <div className="flex gap-1.5 flex-wrap">
                                            {ICONES.map(ic => {
                                                const Ic = ic.icon
                                                return (
                                                    <button key={ic.id} type="button" onClick={() => update(scene.id, 'icone', ic.id)}
                                                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${scene.icone === ic.id ? 'bg-fg text-bg border-fg scale-110' : 'bg-bg2 text-muted border-soft hover:text-fg'}`}
                                                        title={ic.nome}>
                                                        <Ic size={14} />
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="w-full sm:w-48 space-y-1">
                                        <label className="text-[7px] font-black uppercase tracking-widest text-muted">Endpoint API</label>
                                        <select value={['FavoriteAction', 'ScriptAction', 'MediaPlaylistAction'].includes(scene.endpoint) ? scene.endpoint : '__custom'}
                                            onChange={e => { if (e.target.value !== '__custom') update(scene.id, 'endpoint', e.target.value) }}
                                            className="w-full bg-bg2 border border-soft rounded-lg px-2 py-2 text-xs font-bold text-fg focus:border-figueira outline-none">
                                            <option value="FavoriteAction">FavoriteAction</option>
                                            <option value="ScriptAction">ScriptAction</option>
                                            <option value="MediaPlaylistAction">MediaPlaylistAction</option>
                                            <option value="__custom">Personalizado...</option>
                                        </select>
                                        {!['FavoriteAction', 'ScriptAction', 'MediaPlaylistAction'].includes(scene.endpoint) && (
                                            <input type="text" value={scene.endpoint} onChange={e => update(scene.id, 'endpoint', e.target.value)}
                                                placeholder="NomeDaAction"
                                                className="w-full bg-bg2 border border-soft rounded-lg px-3 py-2 text-xs font-mono text-fg focus:border-figueira outline-none placeholder:text-muted/30 mt-1" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[7px] font-black uppercase tracking-widest text-muted">{scene.tipo === 'toggle' ? 'ID (Ligar)' : 'ID'}</label>
                                        <input type="text" value={scene.scriptOn} onChange={e => update(scene.id, 'scriptOn', e.target.value)}
                                            placeholder="ID do favorito ou script no Holyrics"
                                            className="w-full bg-bg2 border border-soft rounded-lg px-3 py-2 text-xs font-mono text-fg focus:border-figueira outline-none placeholder:text-muted/30" />
                                    </div>
                                    {scene.tipo === 'toggle' && (
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[7px] font-black uppercase tracking-widest text-muted">ID (Desligar)</label>
                                            <input type="text" value={scene.scriptOff || ''} onChange={e => update(scene.id, 'scriptOff', e.target.value)}
                                                placeholder="ID para desligar"
                                                className="w-full bg-bg2 border border-soft rounded-lg px-3 py-2 text-xs font-mono text-fg focus:border-figueira outline-none placeholder:text-muted/30" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-soft/50">
                                    <span className="text-[7px] font-black uppercase tracking-widest text-muted">Preview:</span>
                                    <div className={`px-3 py-1.5 rounded-lg border-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest
                                        ${scene.cor === 'blue' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                                        ${scene.cor === 'purple' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : ''}
                                        ${scene.cor === 'amber' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                                        ${scene.cor === 'indigo' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : ''}
                                        ${scene.cor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                                        ${scene.cor === 'red' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                                        ${scene.cor === 'pink' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : ''}
                                        ${scene.cor === 'cyan' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : ''}
                                    `}>
                                        <IconPreview size={14} />
                                        {scene.nome || 'Sem nome'}
                                        {scene.tipo === 'toggle' && <span className="text-[7px] opacity-60 ml-1">ON/OFF</span>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
            </div>

            <div className="bg-bg border border-soft rounded-xl p-4 text-[9px] text-muted/60 space-y-1">
                <p className="font-black uppercase tracking-widest text-muted text-[8px]">Como funciona:</p>
                <p><strong>Push:</strong> Executa o preset uma vez (ex: "Preset Louvor" que ajusta todos os faders).</p>
                <p><strong>Toggle:</strong> Liga/desliga — usa 2 scripts (ex: "Mute Banda" / "Unmute Banda").</p>
                <p><strong>Script ID:</strong> No Holyrics, va a Ferramentas &gt; Favoritos ou Scripts e copie o ID.</p>
                <p>Os comandos sao enviados via API do Holyrics que controla a mesa X32 por OSC.</p>
            </div>

            <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-fg text-bg text-[9px] font-black uppercase tracking-widest hover:bg-figueira transition-all disabled:opacity-50 shadow-sm">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Guardar Presets
                </button>
            </div>
        </div>
    )
}
