'use client'

import { useState } from 'react'
import { criarNovaIgreja, atualizarIgreja } from '@/actions/super-admin-actions'
import { PlusCircle, Loader2, CheckCircle2, Building, Edit3, ArrowLeft, Users, Church, Settings2, Rocket, Palette, Search, Filter } from 'lucide-react'
import Link from 'next/link'

export default function GestaoIgrejasClient({ igrejasIniciais }: { igrejasIniciais: any[] }) {
    // Estado para controlar a vista: 'lista', 'criar', ou 'editar'
    const [modo, setModo] = useState<'lista' | 'criar' | 'editar'>('lista');
    const [igrejaSelecionada, setIgrejaSelecionada] = useState<any>(null);
    const [busca, setBusca] = useState('')
    const [filtroPlano, setFiltroPlano] = useState<string>('todos')

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'error' | 'success', msg: string } | null>(null);

    // Função que lida com a submissão (tanto para criar como para editar)
    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setStatus(null);

        let res;
        if (modo === 'criar') {
            res = await criarNovaIgreja(formData);
        } else if (modo === 'editar' && igrejaSelecionada) {
            res = await atualizarIgreja(igrejaSelecionada.id, formData);
        }

        if (res?.error) {
            setStatus({ type: 'error', msg: res.error });
            setLoading(false);
        } else if (res?.success) {
            setStatus({ type: 'success', msg: res.message! });
            setLoading(false);

            // Espera 1.5s para o utilizador ler o sucesso e volta para a lista
            setTimeout(() => {
                setModo('lista');
                setStatus(null);
            }, 1500);
        }
    }

    const abrirEdicao = (igreja: any) => {
        setIgrejaSelecionada(igreja);
        setModo('editar');
        setStatus(null);
    };

    const voltarLista = () => {
        setModo('lista');
        setIgrejaSelecionada(null);
        setStatus(null);
    };

    return (
        <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 animate-in fade-in">

            {/* CABEÇALHO DO PAINEL */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-fg flex items-center gap-3">
                        <Building size={28} className="text-figueira" />
                        Plataforma Super Admin
                    </h1>
                    <p className="text-xs font-bold text-muted uppercase tracking-widest mt-1">
                        Gestão global de Tenants (Igrejas)
                    </p>
                </div>

                {modo === 'lista' ? (
                    <button onClick={() => setModo('criar')} className="bg-fg text-bg px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-figueira transition-all flex items-center gap-2">
                        <PlusCircle size={16} /> Registar Nova Igreja
                    </button>
                ) : (
                    <button onClick={voltarLista} className="bg-bg2 border border-soft text-fg px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:border-figueira transition-all flex items-center gap-2">
                        <ArrowLeft size={16} /> Voltar à Lista
                    </button>
                )}
            </header>

            {/* ========================================================= */}
            {/* VISTA 1: LISTA DE IGREJAS                                 */}
            {/* ========================================================= */}
            {modo === 'lista' && (
                <>
                {/* FILTROS */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            placeholder="Pesquisar igreja..."
                            className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors placeholder:text-zinc-600"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={12} className="text-zinc-500" />
                        {['todos', 'FREE', 'BASIC', 'PRO', 'ENTERPRISE'].map(p => (
                            <button key={p} onClick={() => setFiltroPlano(p)}
                                className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                    filtroPlano === p
                                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                        : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
                                }`}>
                                {p === 'todos' ? 'Todos' : p}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {igrejasIniciais
                        .filter(i => filtroPlano === 'todos' || i.plano === filtroPlano)
                        .filter(i => !busca || i.nome.toLowerCase().includes(busca.toLowerCase()) || i.slug.toLowerCase().includes(busca.toLowerCase()))
                        .map((igreja) => (
                        <div key={igreja.id} className="bg-bg2 border border-soft p-6 rounded-[2.5rem] shadow-sm hover:shadow-lg hover:border-figueira/30 transition-all flex flex-col justify-between group">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-figueira/10 text-figueira p-3 rounded-2xl shrink-0">
                                        <Church size={20} />
                                    </div>
                                    <span className="bg-soft text-muted px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest">
                                        Plano {igreja.plano}
                                    </span>
                                </div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg leading-none truncate">
                                    {igreja.nome}
                                </h3>
                                <p className="text-[10px] font-bold text-muted mt-1 truncate">/{igreja.slug}</p>

                                <div className="mt-6 flex items-center gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-muted uppercase tracking-widest">Membros</p>
                                        <p className="text-sm font-black text-fg flex items-center gap-1"><Users size={14} className="text-figueira" /> {igreja._count.membros}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-muted uppercase tracking-widest">Congregações</p>
                                        <p className="text-sm font-black text-fg flex items-center gap-1"><Building size={14} className="text-blue-500" /> {igreja._count.congregacoes}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-2">
                                <button onClick={() => abrirEdicao(igreja)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg border border-soft rounded-xl text-[9px] font-black uppercase tracking-widest text-muted hover:bg-fg hover:text-bg transition-all">
                                    <Edit3 size={14} /> Editar
                                </button>
                                <Link href={`/super-admin/igrejas/${igreja.id}/modulos`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg border border-soft rounded-xl text-[9px] font-black uppercase tracking-widest text-muted hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all">
                                    <Settings2 size={14} /> Modulos
                                </Link>
                                <Link href={`/super-admin/igrejas/${igreja.id}/tema`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg border border-soft rounded-xl text-[9px] font-black uppercase tracking-widest text-muted hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all">
                                    <Palette size={14} /> Tema
                                </Link>
                                {!igreja.onboarding_completo && (
                                    <Link href={`/super-admin/onboarding/${igreja.id}`} className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg border border-amber-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/10 transition-all">
                                        <Rocket size={14} /> Setup
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                </>
            )}

            {/* ========================================================= */}
            {/* VISTA 2: FORMULÁRIO DE CRIAÇÃO / EDIÇÃO                   */}
            {/* ========================================================= */}
            {(modo === 'criar' || modo === 'editar') && (
                <div className="w-full max-w-3xl mx-auto bg-bg2 border border-soft p-8 md:p-12 rounded-[3.5rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom-4 duration-500">

                    <div className="flex items-center gap-4 border-b border-soft pb-6">
                        <div className="bg-figueira/20 p-4 rounded-full text-figueira shrink-0">
                            {modo === 'criar' ? <PlusCircle size={28} /> : <Edit3 size={28} />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter text-fg italic">
                                {modo === 'criar' ? 'Nova Organização' : `Editar: ${igrejaSelecionada?.nome}`}
                            </h2>
                            <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">
                                {modo === 'criar' ? 'Configurar tenant e conta de administrador' : 'Alterar dados principais do Tenant'}
                            </p>
                        </div>
                    </div>

                    <form action={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* DADOS DA IGREJA (Sempre visível) */}
                            <div className="space-y-5 col-span-1 md:col-span-2">
                                <h3 className="text-[10px] font-black uppercase text-figueira tracking-[0.2em] bg-figueira/10 px-4 py-2 rounded-xl inline-block border border-figueira/20">
                                    1. Definições do Tenant
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Nome da Igreja</label>
                                        <input name="nomeIgreja" defaultValue={igrejaSelecionada?.nome} required className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Ex: Assembleia Central" />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Identificador (Slug)</label>
                                        <input name="slug" defaultValue={igrejaSelecionada?.slug} required className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all" placeholder="Ex: assembleia-central" />
                                        <p className="text-[8px] text-muted font-bold tracking-widest uppercase ml-4 mt-1">Usado para subdomínios e identificação</p>
                                    </div>

                                    {modo === 'editar' && (
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Plano de Assinatura</label>
                                            <select name="plano" defaultValue={igrejaSelecionada?.plano || 'FREE'} className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-figueira transition-all appearance-none">
                                                <option value="FREE">FREE (Gratuito)</option>
                                                <option value="PRO">PRO (Profissional)</option>
                                                <option value="ENTERPRISE">ENTERPRISE (Ilimitado)</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* DADOS DO ADMIN (Apenas na Criação) */}
                            {modo === 'criar' && (
                                <div className="space-y-5 col-span-1 md:col-span-2 pt-6 border-t border-soft">
                                    <h3 className="text-[10px] font-black uppercase text-blue-500 tracking-[0.2em] bg-blue-500/10 px-4 py-2 rounded-xl inline-block border border-blue-500/20">
                                        2. Conta de Acesso (Administrador)
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Nome do Responsável</label>
                                            <input name="adminNome" required className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-blue-500 transition-all" placeholder="Nome do Pastor/Líder" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">E-mail de Acesso</label>
                                            <input name="adminEmail" type="email" required className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-blue-500 transition-all" placeholder="admin@igreja.pt" />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-muted ml-4 tracking-widest">Palavra-passe Provisória</label>
                                            <input name="adminPassword" type="password" required className="w-full bg-bg border border-soft rounded-2xl px-5 py-4 text-xs font-bold text-fg outline-none focus:border-blue-500 transition-all" placeholder="••••••••" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* STATUS DE FEEDBACK */}
                        {status && (
                            <div className={`flex items-center justify-center gap-3 text-[10px] font-black uppercase p-4 rounded-2xl animate-in zoom-in-95 duration-300 ${status.type === 'error' ? 'text-red-500 bg-red-500/10 border border-red-500/20' : 'text-green-500 bg-green-500/10 border border-green-500/20'}`}>
                                {status.type === 'error' ? '❌ ' : <CheckCircle2 size={18} />}
                                {status.msg}
                            </div>
                        )}

                        <button
                            disabled={loading}
                            className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 ${loading ? 'bg-muted text-bg cursor-wait' : 'bg-fg text-bg hover:bg-figueira'}`}
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {!loading && modo === 'criar' && <PlusCircle size={18} />}
                            {!loading && modo === 'editar' && <CheckCircle2 size={18} />}
                            {loading ? 'A processar...' : modo === 'criar' ? 'Criar Igreja e Gerar Acesso' : 'Guardar Alterações'}
                        </button>
                    </form>
                </div>
            )}
        </main>
    )
}