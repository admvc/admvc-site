'use client'

// Mídia → Rotina do culto: as definições que o alerta das artes e o botão "Iniciar o culto" do Holyrics usam.
import { useState } from 'react'
import { guardarRotina } from '@/app/midia/rotina/actions'

type Cfg = { funcoes: string[]; horaAlerta: number; horaManha: number; musica: string; video: string; lumikitAcaoId: string; lumikitTipo: 'api' | 'script' }

const campo = 'min-h-[48px] w-full rounded-[12px] border px-3 text-[16px]'
const estiloCampo = { borderColor: 'var(--a-borda)', background: 'var(--a-card)', color: 'var(--a-texto)' }

export default function RotinaCultoForm({ inicial }: { inicial: Cfg }) {
    const [funcoes, setFuncoes] = useState(inicial.funcoes.join(', '))
    const [horaAlerta, setHoraAlerta] = useState(String(inicial.horaAlerta))
    const [horaManha, setHoraManha] = useState(String(inicial.horaManha))
    const [musica, setMusica] = useState(inicial.musica)
    const [video, setVideo] = useState(inicial.video)
    const [lumikitAcaoId, setLumikitAcaoId] = useState(inicial.lumikitAcaoId)
    const [lumikitTipo, setLumikitTipo] = useState<string>(inicial.lumikitTipo)
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
    const [ocupado, setOcupado] = useState(false)

    async function guardar(e: React.FormEvent) {
        e.preventDefault()
        setOcupado(true); setAviso(null)
        const r = await guardarRotina({ funcoes, horaAlerta: Number(horaAlerta), horaManha: Number(horaManha), musica, video, lumikitAcaoId, lumikitTipo })
        setOcupado(false)
        setAviso('erro' in r ? { ok: false, texto: r.erro } : { ok: true, texto: 'Guardado.' })
    }

    return (
        <form onSubmit={guardar} className="a-card space-y-4 p-4">
            <label className="block space-y-1">
                <span className="text-[16px] font-semibold">Funções do telão</span>
                <input className={campo} style={estiloCampo} value={funcoes} onChange={(e) => setFuncoes(e.target.value)} placeholder="Projeção" />
                <span className="block text-[14px] a-suave">Quem está escalado nestas funções (e o líder da equipa) recebe o alerta das artes. Separe por vírgulas.</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                    <span className="text-[16px] font-semibold">Alerta da véspera (h)</span>
                    <input className={campo} style={estiloCampo} inputMode="numeric" value={horaAlerta} onChange={(e) => setHoraAlerta(e.target.value)} />
                </label>
                <label className="block space-y-1">
                    <span className="text-[16px] font-semibold">Alerta no dia (h)</span>
                    <input className={campo} style={estiloCampo} inputMode="numeric" value={horaManha} onChange={(e) => setHoraManha(e.target.value)} />
                </label>
            </div>
            <label className="block space-y-1">
                <span className="text-[16px] font-semibold">Música de fundo</span>
                <input className={campo} style={estiloCampo} value={musica} onChange={(e) => setMusica(e.target.value)} placeholder="Nome do ficheiro na aba Áudio do Holyrics" />
            </label>
            <label className="block space-y-1">
                <span className="text-[16px] font-semibold">Vídeo de pré-início</span>
                <input className={campo} style={estiloCampo} value={video} onChange={(e) => setVideo(e.target.value)} placeholder="Nome do ficheiro na aba Vídeos do Holyrics" />
            </label>
            <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className="block space-y-1">
                    <span className="text-[16px] font-semibold">Luz do pré-culto (Lumikit)</span>
                    <input className={campo} style={estiloCampo} value={lumikitAcaoId} onChange={(e) => setLumikitAcaoId(e.target.value)} placeholder="ID da ação" />
                </label>
                <label className="block space-y-1">
                    <span className="text-[16px] font-semibold">Tipo</span>
                    <select className={campo} style={estiloCampo} value={lumikitTipo} onChange={(e) => setLumikitTipo(e.target.value)}>
                        <option value="api">API</option>
                        <option value="script">Script</option>
                    </select>
                </label>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <button type="submit" disabled={ocupado} className="a-botao a-botao-principal !min-h-[48px]">{ocupado ? 'A guardar…' : 'Guardar'}</button>
                {aviso && <p role="status" className="text-[16px]" style={{ color: aviso.ok ? 'var(--a-sucesso, inherit)' : 'var(--a-perigo, #c0392b)' }}>{aviso.texto}</p>}
            </div>
        </form>
    )
}
