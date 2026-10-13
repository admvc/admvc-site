"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { excluirGrupo, salvarGrupo } from "@/actions/admin-actions";
import { useToast } from '@/components/ui/ConfirmDialog'
import {
    Search, X, Shield, Users, MapPin, Trash2,
    Edit3, Loader2, Check,
    Building2, UserX, Plus, Info
} from "lucide-react";
import SeccaoColapsavel from '@/components/acolhimento/SeccaoColapsavel'
import dynamic from 'next/dynamic'
import type { PontoArea } from '@/lib/area-grupo'

const EditorAreaGrupo = dynamic(() => import('@/components/grupos/EditorAreaGrupo'), {
    ssr: false,
    loading: () => <div className="h-[320px] animate-pulse rounded-[14px]" style={{ background: 'var(--a-borda)' }} />,
})

interface GerenciadorProps {
    grupos: any[];
    departamentos: any[];
    membrosDisponiveis: any[];
    regioes?: string[];
}

export default function GerenciadorGrupos({ grupos, departamentos, membrosDisponiveis, regioes = [] }: GerenciadorProps) {
    const toast = useToast()
    const router = useRouter();
    // ✅ useTransition em vez de window.location.reload()
    const [isPending, startTransition] = useTransition();

    const [modo, setModo] = useState<'lista' | 'form'>('lista');
    const [grupoAtual, setGrupoAtual] = useState<any>(null);
    const [salvando, setSalvando] = useState(false);
    const [confirmarExclusao, setConfirmarExclusao] = useState<number | null>(null);
    const [buscaMembros, setBuscaMembros] = useState("");
    const [selecionadosMembros, setSelecionadosMembros] = useState<number[]>([]);
    const [selecionadosLideres, setSelecionadosLideres] = useState<number[]>([]);
    const [area, setArea] = useState<PontoArea[] | null>(null);
    const [mostrarMapa, setMostrarMapa] = useState(false);

    const abrirFormulario = (grupo: any = null) => {
        setGrupoAtual(grupo);
        setSelecionadosMembros(grupo?.membros?.map((m: any) => m.id) || []);
        setSelecionadosLideres(grupo?.lideres?.map((l: any) => l.id) || []);
        setArea(grupo?.area ?? null);
        setMostrarMapa(grupo?.mostrar_mapa ?? false);
        setBuscaMembros("");
        setModo('form');
    };

    const membrosFiltrados = useMemo(() => {
        if (buscaMembros.length < 2) return [];
        return membrosDisponiveis
            .filter((m: any) =>
                `${m.first_name} ${m.last_name}`.toLowerCase().includes(buscaMembros.toLowerCase())
            )
            .slice(0, 6);
    }, [buscaMembros, membrosDisponiveis]);

    const toggleSelecao = (id: number, lista: number[], setLista: any, limit?: number) => {
        if (lista.includes(id)) {
            setLista(lista.filter((item: number) => item !== id));
        } else {
            if (limit && lista.length >= limit) return;
            setLista([...lista, id]);
        }
    };

    const selecionarPessoa = (id: number, tipo: 'LIDER' | 'MEMBRO') => {
        if (tipo === 'LIDER') {
            toggleSelecao(id, selecionadosLideres, setSelecionadosLideres, 2);
        } else {
            toggleSelecao(id, selecionadosMembros, setSelecionadosMembros);
        }
        setBuscaMembros("");
    };

    // ✅ USA router.refresh() em vez de window.location.reload()
    const handleSalvar = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSalvando(true);

        const formData = new FormData(e.currentTarget);
        if (grupoAtual?.id) formData.append("id", grupoAtual.id.toString());
        selecionadosMembros.forEach(id => formData.append("membros_ids", id.toString()));
        selecionadosLideres.forEach(id => formData.append("lideres_ids", id.toString()));
        formData.set("area", area ? JSON.stringify(area) : "");

        try {
            const res = await salvarGrupo(formData) as { sucesso: boolean; error?: string };
            if (res.sucesso) {
                setModo('lista');
                // ✅ Revalida apenas os dados da página sem reload completo
                startTransition(() => router.refresh());
            } else {
                toast(res.error || "Erro ao guardar o grupo.", 'erro');
            }
        } catch {
            toast("Erro de ligação ao servidor.", 'erro');
        } finally {
            setSalvando(false);
        }
    };

    const handleExcluir = async (id: number) => {
        setSalvando(true);
        const res = await excluirGrupo(id) as { sucesso: boolean };
        if (res.sucesso) {
            setConfirmarExclusao(null);
            startTransition(() => router.refresh());
        } else {
            toast("Erro ao excluir.", 'erro');
            setConfirmarExclusao(null);
        }
        setSalvando(false);
    };

    // ─── HELPERS PARA OS CHIPS ───────────────────────────────────────────────
    const getNomeMembro = (id: number) => {
        const m = membrosDisponiveis.find((mem: any) => mem.id === id);
        return m ? `${m.first_name} ${m.last_name}` : '—';
    };

    return (
        // app-novo: os cartoes e botoes (a-card, a-botao) so tem estilo dentro dele
        <div className="app-novo space-y-6 animate-in fade-in duration-500" style={{ background: 'transparent' }}>

            {/* ── MODO LISTA ──────────────────────────────────────────────── */}
            {modo === 'lista' && (
                <>
                    <div className="flex justify-end">
                        <button onClick={() => abrirFormulario()} className="a-botao a-botao-principal">
                            <Plus size={16} /> Novo Grupo
                        </button>
                    </div>

                    {isPending && (
                        <div className="flex items-center justify-center gap-2 py-4 text-[14px] font-semibold a-suave">
                            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--a-destaque)' }} /> A atualizar...
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {grupos.map((grupo) => (
                            <div key={grupo.id} className="a-card p-4 relative overflow-hidden group">

                                {confirmarExclusao === grupo.id && (
                                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-5 text-center rounded-[inherit]" style={{ background: 'var(--a-erro)' }}>
                                        <Trash2 size={20} className="mb-2" style={{ color: '#fff' }} />
                                        <p className="text-[14px] font-semibold mb-4" style={{ color: '#fff' }}>
                                            Eliminar &quot;{grupo.nome}&quot;?
                                        </p>
                                        <div className="flex gap-2 w-full max-w-[200px]">
                                            <button onClick={() => handleExcluir(grupo.id)} disabled={salvando}
                                                className="a-botao flex-1 justify-center" style={{ background: '#fff', color: 'var(--a-erro)' }}>
                                                {salvando ? <Loader2 size={14} className="animate-spin" /> : null} Sim
                                            </button>
                                            <button onClick={() => setConfirmarExclusao(null)}
                                                className="a-botao flex-1 justify-center" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>
                                                Não
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-[15px] font-bold"
                                            style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                                            {grupo.nome[0]}
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-bold leading-tight line-clamp-1">{grupo.nome}</h3>
                                            <p className="text-[13px] a-suave mt-0.5">
                                                {grupo.dia_semana} · {grupo.horario}
                                                {grupo.cidade ? ` · ${grupo.cidade}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setConfirmarExclusao(grupo.id)}
                                        className="a-foco rounded-lg p-1.5 a-suave opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{ color: 'var(--a-erro)' }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <span className="text-[13px] font-semibold rounded-lg px-2 py-0.5 a-suave" style={{ background: 'var(--a-borda)' }}>
                                        <Users size={12} className="inline -mt-0.5 mr-1" />{grupo._count?.membros ?? grupo.membros?.length ?? 0} membros
                                    </span>
                                    {grupo.lideres?.length > 0 && (
                                        <span className="text-[13px] font-semibold rounded-lg px-2 py-0.5"
                                            style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                                            <Shield size={12} className="inline -mt-0.5 mr-1" />{grupo.lideres.map((l: any) => l.first_name).join(', ')}
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={() => abrirFormulario(grupo)} className="a-botao a-botao-secundario flex-1 justify-center">
                                        <Edit3 size={14} /> Editar
                                    </button>
                                    {grupo.latitude && grupo.longitude && (
                                        <a href={`https://www.google.com/maps?q=${grupo.latitude},${grupo.longitude}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="a-botao a-botao-secundario !px-3" title="Ver no mapa">
                                            <MapPin size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}

                        {grupos.length === 0 && (
                            <div className="col-span-full a-card py-10 text-center" style={{ borderStyle: 'dashed' }}>
                                <p className="text-[15px] font-semibold a-suave">Nenhum grupo criado.</p>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── MODAL FORMULÁRIO ─────────────────────────────────────────── */}
            {modo === 'form' && (
                <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4" role="dialog" aria-modal="true" aria-label="Novo Grupo">
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.5)' }} onClick={() => setModo('lista')} />
                    <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-[20px] md:rounded-[20px] border p-4 md:p-6"
                        style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)' }}>
                <form onSubmit={handleSalvar} className="space-y-6">

                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-[19px] font-bold">
                                {grupoAtual ? `Editar: ${grupoAtual.nome}` : 'Novo Grupo'}
                            </h3>
                            <p className="text-[14px] a-suave mt-0.5">Preencha os dados abaixo</p>
                        </div>
                        <button type="button" onClick={() => setModo('lista')}
                            className="a-foco flex h-10 w-10 items-center justify-center rounded-[12px]"
                            style={{ background: 'var(--a-borda)' }} aria-label="Fechar">
                            <X size={18} />
                        </button>
                    </div>

                    {/* BLOCO 1: INFORMAÇÕES */}
                    <SeccaoColapsavel
                        titulo="Informacoes Gerais"
                        icon={<Info size={16} style={{ color: 'var(--a-destaque)' }} />}
                        defaultOpen
                    >

                        <div className="grid md:grid-cols-3 gap-4 px-4 pb-4">
                            <label className="md:col-span-2 space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Nome do Grupo</span>
                                <input name="nome" defaultValue={grupoAtual?.nome || ''} required
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Perfil</span>
                                <select name="perfil" defaultValue={grupoAtual?.perfil || 'Misto'}
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                    {['Misto', 'Mulheres', 'Homens', 'Jovens', 'Casais', 'Crianças'].map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="md:col-span-3 space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Descrição</span>
                                <textarea name="descricao" rows={2} defaultValue={grupoAtual?.descricao || ''}
                                    placeholder="Objetivo e perfil do grupo…"
                                    className="a-foco w-full rounded-[14px] border px-4 py-3 text-[16px] resize-none"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                            </label>

                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Dia</span>
                                <select name="dia_semana" defaultValue={grupoAtual?.dia_semana || 'Domingo'} required
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                    {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'].map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Horário</span>
                                <input name="horario" type="time" defaultValue={grupoAtual?.horario || '19:30'} required
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Categoria</span>
                                <select name="categoria" defaultValue={grupoAtual?.categoria || 'Grupo'}
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                    {['Grupo', 'PG', 'Estudo Bíblico', 'Reunião de Oração', 'Equipa de Serviço'].map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </label>

                            <div className="md:col-span-2 space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Morada</span>
                                <div className="flex gap-2">
                                    <input name="endereco" placeholder="Rua…" defaultValue={grupoAtual?.endereco || ''} required
                                        className="a-foco min-h-[48px] flex-1 rounded-[14px] border px-4 text-[16px]"
                                        style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                                    <input name="numero" placeholder="Nº" defaultValue={grupoAtual?.numero || ''}
                                        className="a-foco min-h-[48px] w-20 shrink-0 rounded-[14px] border px-3 text-center text-[16px]"
                                        style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                                </div>
                            </div>
                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Bairro</span>
                                <input name="bairro" defaultValue={grupoAtual?.bairro || ''} required
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Cidade</span>
                                <input name="cidade" defaultValue={grupoAtual?.cidade || ''} required
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Distrito</span>
                                <input name="estado" defaultValue={grupoAtual?.estado || ''} required
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">País</span>
                                <input name="pais" defaultValue={grupoAtual?.pais || 'Portugal'} required
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                            </label>
                            <label className="space-y-1">
                                <span className="text-[14px] font-semibold a-suave">Região</span>
                                <select name="regiao" defaultValue={grupoAtual?.regiao || ''}
                                    className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                    <option value="">Selecione…</option>
                                    {regioes.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[14px] border px-4"
                                style={{ borderColor: 'var(--a-borda)' }}>
                                <input type="checkbox" name="publico"
                                    defaultChecked={grupoAtual?.publico ?? false}
                                    className="h-5 w-5" style={{ accentColor: 'var(--a-destaque)' }} />
                                <span className="text-[15px] font-semibold">Mostrar no site público</span>
                            </label>

                            <label className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-[14px] border px-4"
                                style={{ borderColor: 'var(--a-borda)' }}>
                                <input type="checkbox" name="mostrar_mapa"
                                    checked={mostrarMapa} onChange={(e) => setMostrarMapa(e.target.checked)}
                                    className="h-5 w-5 shrink-0" style={{ accentColor: 'var(--a-destaque)' }} />
                                <span className="text-[15px] font-semibold">
                                    Mostrar mapa aos membros
                                    <span className="block text-[13px] font-normal a-suave">Desligado para grupos que se juntam na igreja</span>
                                </span>
                            </label>
                        </div>

                        {mostrarMapa && (
                            <div className="space-y-2 px-4 pb-4">
                                <p className="text-[14px] font-semibold a-suave">Zona que o grupo abrange</p>
                                <EditorAreaGrupo key={grupoAtual?.id ?? 'novo'} latitude={grupoAtual?.latitude} longitude={grupoAtual?.longitude}
                                    valor={area} onChange={setArea} />
                            </div>
                        )}
                    </SeccaoColapsavel>

                    {/* BLOCO 2: EQUIPA */}
                    <SeccaoColapsavel
                        titulo="Gestao de Equipa"
                        icon={<Users size={16} style={{ color: 'var(--a-destaque)' }} />}
                        defaultOpen
                    >

                        <div className="relative max-w-xl mb-4 z-50 px-4">
                            <Search size={18} className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 a-suave" />
                            <input type="text" placeholder="Pesquisar membro…" value={buscaMembros}
                                onChange={(e) => setBuscaMembros(e.target.value)}
                                className="a-foco min-h-[48px] w-full rounded-[14px] border pl-12 pr-4 text-[16px]"
                                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }} />
                            {membrosFiltrados.length > 0 && (
                                <div className="absolute top-full left-4 right-4 mt-1 rounded-[14px] border overflow-hidden shadow-lg z-50"
                                    style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)' }}>
                                    {membrosFiltrados.map((m: any) => (
                                        <div key={m.id} className="flex items-center justify-between gap-2 border-b px-4 py-3 last:border-0"
                                            style={{ borderColor: 'var(--a-borda)' }}>
                                            <span className="text-[15px] font-semibold truncate">{m.first_name} {m.last_name}</span>
                                            <div className="flex gap-1.5 shrink-0">
                                                <button type="button" onClick={() => selecionarPessoa(m.id, 'LIDER')}
                                                    className="a-foco rounded-lg border px-3 py-1.5 text-[13px] font-semibold"
                                                    style={selecionadosLideres.includes(m.id)
                                                        ? { background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)', borderColor: 'var(--a-destaque)' }
                                                        : { borderColor: 'var(--a-borda)' }}>
                                                    {selecionadosLideres.includes(m.id) ? '✓ Líder' : '+ Líder'}
                                                </button>
                                                <button type="button" onClick={() => selecionarPessoa(m.id, 'MEMBRO')}
                                                    className="a-foco rounded-lg border px-3 py-1.5 text-[13px] font-semibold"
                                                    style={selecionadosMembros.includes(m.id)
                                                        ? { background: 'var(--a-info)', color: '#fff', borderColor: 'var(--a-info)' }
                                                        : { borderColor: 'var(--a-borda)' }}>
                                                    {selecionadosMembros.includes(m.id) ? '✓ Membro' : '+ Membro'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 px-4 pb-4">
                            <div className="space-y-2">
                                <p className="text-[14px] font-semibold a-suave flex items-center gap-2">
                                    <Shield size={14} style={{ color: 'var(--a-destaque)' }} />
                                    Líderes ({selecionadosLideres.length}/2)
                                </p>
                                <div className="min-h-[72px] rounded-[14px] border p-3 flex flex-wrap gap-2 content-start"
                                    style={{ borderColor: 'var(--a-borda)' }}>
                                    {selecionadosLideres.length === 0
                                        ? <p className="text-[14px] a-suave m-auto">Nenhum líder</p>
                                        : selecionadosLideres.map(id => (
                                            <span key={id} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[14px] font-semibold"
                                                style={{ background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' }}>
                                                {getNomeMembro(id)}
                                                <X size={14} className="cursor-pointer opacity-70 hover:opacity-100"
                                                    onClick={() => toggleSelecao(id, selecionadosLideres, setSelecionadosLideres)} />
                                            </span>
                                        ))
                                    }
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[14px] font-semibold a-suave flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Users size={14} style={{ color: 'var(--a-info)' }} />
                                        Membros ({selecionadosMembros.length})
                                    </span>
                                    {selecionadosMembros.length > 0 && (
                                        <button type="button" onClick={() => setSelecionadosMembros([])}
                                            className="text-[13px] font-semibold flex items-center gap-1" style={{ color: 'var(--a-erro)' }}>
                                            <UserX size={12} /> Limpar
                                        </button>
                                    )}
                                </p>
                                <div className="min-h-[72px] max-h-[160px] overflow-y-auto rounded-[14px] border p-3 flex flex-wrap gap-2 content-start"
                                    style={{ borderColor: 'var(--a-borda)' }}>
                                    {selecionadosMembros.length === 0
                                        ? <p className="text-[14px] a-suave m-auto">Nenhum membro</p>
                                        : selecionadosMembros.map(id => (
                                            <span key={id} onClick={() => toggleSelecao(id, selecionadosMembros, setSelecionadosMembros)}
                                                className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[14px] font-semibold"
                                                style={{ borderColor: 'var(--a-borda)' }}>
                                                {getNomeMembro(id)}
                                                <X size={12} className="opacity-40" />
                                            </span>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </SeccaoColapsavel>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 a-card p-4">
                        <label className="flex-1 space-y-1">
                            <span className="text-[13px] font-semibold a-suave flex items-center gap-1.5">
                                <Building2 size={12} /> Ministério
                            </span>
                            <select name="departamento_id" defaultValue={grupoAtual?.departamento_id || ''}
                                className="a-foco min-h-[48px] w-full rounded-[14px] border px-4 text-[16px]"
                                style={{ background: 'var(--a-card)', borderColor: 'var(--a-borda)', color: 'var(--a-texto)' }}>
                                <option value="">Independente</option>
                                {departamentos.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.nome}</option>
                                ))}
                            </select>
                        </label>
                        <button type="submit" disabled={salvando || isPending}
                            className="a-botao a-botao-principal sm:self-end justify-center min-w-[160px]">
                            {salvando || isPending
                                ? <><Loader2 size={16} className="animate-spin" /> A gravar...</>
                                : <><Check size={16} /> {grupoAtual ? 'Atualizar' : 'Criar Grupo'}</>
                            }
                        </button>
                    </div>
                </form>
                </div>
                </div>
            )}
        </div>
    );
}