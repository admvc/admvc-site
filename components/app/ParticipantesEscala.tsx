'use client'

// Participantes de uma escala: por pessoa ("Membros") ou por funcao, como no
// LouveApp. O lider tem "Alterar participantes".

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, UserRound, UsersRound } from 'lucide-react'
import type { DadosEscala, Participante } from '@/lib/ministerios-app'
import { Avatar } from './Avatares'
import Estado from './Estado'

function Linha({ p, mostrarFuncao = true }: { p: Participante; mostrarFuncao?: boolean }) {
    return (
        <li className="flex items-center gap-3 py-2.5">
            <Avatar pessoa={p} tamanho={44} />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold">{p.nome}</span>
                {mostrarFuncao && <span className="block text-[15px] a-suave">{p.funcao}</span>}
                {p.estado === 'NAO_PODE' && p.motivo && <span className="block text-[14px] a-suave">{p.motivo}</span>}
            </span>
            <Estado estado={p.estado} />
        </li>
    )
}

export default function ParticipantesEscala({ dados }: { dados: DadosEscala }) {
    const [vista, setVista] = useState<'membros' | 'funcoes'>('membros')
    const { participantes, funcoes, gere, evento, departamento } = dados
    const confirmados = new Set(participantes.filter((p) => p.estado === 'CONFIRMADA').map((p) => p.membroId)).size
    const pessoas = new Set(participantes.map((p) => p.membroId)).size

    const separador = (ativo: boolean) =>
        `a-foco inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[15px] font-semibold ${ativo ? '' : 'a-suave'}`

    return (
        <section className="a-card p-4 space-y-3" aria-labelledby="participantes">
            <h2 id="participantes" className="flex items-center gap-2 text-[19px] font-bold">
                Participantes
                <span className="rounded-full px-2 py-0.5 text-[13px] font-semibold a-suave" style={{ background: 'var(--a-bg)' }}>
                    {confirmados}/{pessoas} confirmados
                </span>
            </h2>

            <div className="flex flex-wrap gap-2">
                <button type="button" className={separador(vista === 'membros')} aria-pressed={vista === 'membros'} onClick={() => setVista('membros')}
                    style={vista === 'membros' ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' } : { background: 'var(--a-bg)' }}>
                    <UserRound size={18} aria-hidden /> Pessoas
                </button>
                <button type="button" className={separador(vista === 'funcoes')} aria-pressed={vista === 'funcoes'} onClick={() => setVista('funcoes')}
                    style={vista === 'funcoes' ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' } : { background: 'var(--a-bg)' }}>
                    <UsersRound size={18} aria-hidden /> Funções ({funcoes.filter((f) => f.pessoas.length > 0).length})
                </button>
                {gere && (
                    <Link href={`/escalas/culto/${evento.id}/pessoas?equipa=${departamento.id}`} className={separador(false)} style={{ background: 'var(--a-bg)', color: 'var(--a-destaque)' }}>
                        <Pencil size={17} aria-hidden /> Alterar
                    </Link>
                )}
            </div>

            {vista === 'membros' ? (
                participantes.length === 0 ? (
                    <p className="text-[16px] a-suave">Ninguém escalado ainda.</p>
                ) : (
                    <ul className="a-divide">
                        {participantes.map((p) => <Linha key={p.escalaId} p={p} />)}
                    </ul>
                )
            ) : (() => {
                const comGente = funcoes.filter((f) => f.pessoas.length > 0)
                return comGente.length === 0 ? (
                    <p className="text-[16px] a-suave">Ninguém escalado ainda.</p>
                ) : (
                    <ul className="space-y-4">
                        {comGente.map((f) => (
                            <li key={f.id}>
                                <h3 className="text-[15px] font-semibold a-suave">{f.nome}</h3>
                                <ul>{f.pessoas.map((p) => <Linha key={p.escalaId} p={p} mostrarFuncao={false} />)}</ul>
                            </li>
                        ))}
                    </ul>
                )
            })()}
        </section>
    )
}
