"use client"

import { useState } from 'react'
import { criarGrupo } from '@/actions/admin-actions'
import SubmitButton from '@/components/SubmitButton'

export default function FormularioGrupo({ departamentos }: { departamentos: any[] }) {
    const [tab, setTab] = useState('geral')

    const TabBtn = ({ id, label }: { id: string, label: string }) => (
        <button
            type="button"
            onClick={() => setTab(id)}
            className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === id ? 'bg-figueira text-white shadow-lg' : 'bg-bg text-muted hover:bg-soft'
                }`}
        >
            {label}
        </button>
    )

    return (
        <section className="bg-bg2 p-10 rounded-[4rem] border border-soft shadow-2xl space-y-8 relative overflow-hidden">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter text-fg">Novo Grupo / PGs</h2>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Gestão de estrutura e localização</p>
                </div>
                <nav className="flex gap-2 bg-bg p-1.5 rounded-2xl border border-soft">
                    <TabBtn id="geral" label="1. Identificação" />
                    <TabBtn id="logistica" label="2. Logística" />
                    <TabBtn id="local" label="3. Localização" />
                </nav>
            </header>

            <form action={criarGrupo} className="mt-8">
                {/* ABA 1: GERAL */}
                {tab === 'geral' && (
                    <div className="grid md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Nome do Grupo</label>
                            <input name="nome" placeholder="Ex: PG Emanuel" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none focus:border-figueira" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Categoria</label>
                            <input name="categoria" placeholder="Ex: PGs, Estudo..." className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Departamento Vinculado</label>
                            <select name="departamento_id" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none appearance-none">
                                <option value="">Nenhum</option>
                                {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Perfil</label>
                            <input name="perfil" placeholder="Ex: Jovens, Casais..." className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Data de Abertura</label>
                            <input name="data_abertura" type="date" defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" />
                        </div>
                    </div>
                )}

                {/* ABA 2: LOGÍSTICA */}
                {tab === 'logistica' && (
                    <div className="grid md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Dia da Semana</label>
                            <select name="dia_semana" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none">
                                <option>Segunda-feira</option>
                                <option>Terça-feira</option>
                                <option>Quarta-feira</option>
                                <option>Quinta-feira</option>
                                <option>Sexta-feira</option>
                                <option>Sábado</option>
                                <option>Domingo</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Horário</label>
                            <input name="horario" type="time" placeholder="20:00" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Descrição / Notas</label>
                            <textarea name="descricao" rows={3} className="w-full bg-bg border border-soft rounded-3xl p-5 text-sm outline-none resize-none" />
                        </div>
                    </div>
                )}

                {/* ABA 3: LOCALIZAÇÃO */}
                {tab === 'local' && (
                    <div className="grid md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="md:col-span-3 space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Endereço (Rua/Avenida)</label>
                            <input name="endereco" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Número</label>
                            <input name="numero" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Bairro</label>
                            <input name="bairro" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Cidade</label>
                            <input name="cidade" defaultValue="Albufeira" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">Estado/Distrito</label>
                            <input name="estado" defaultValue="Algarve" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-2 text-muted">País</label>
                            <input name="pais" defaultValue="Portugal" className="w-full bg-bg border border-soft rounded-2xl p-4 text-sm outline-none" required />
                        </div>
                    </div>
                )}

                <div className="mt-10 pt-6 border-t border-soft">
                    <SubmitButton label="Criar Novo Grupo" />
                </div>
            </form>
        </section>
    )
}