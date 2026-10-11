'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
    ChevronRight, Users, Save, Loader2,
    Check, MapPin, Clock, CalendarDays, Edit3, User,
    CheckSquare, FileText, History, Image as ImageIcon,
    Globe, Home, UserMinus, Camera, ArrowLeft
} from 'lucide-react'
import { registrarEncontroAction, atualizarDadosGrupoAction } from '@/actions/grupo-actions'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { useToast } from '@/components/ui/ConfirmDialog'

export default function GestaoGrupoClient({ grupo, ehLider }: { grupo: any, ehLider: boolean }) {
    const toast = useToast()
    // Se não for líder, a aba padrão para interagir pode ser a 1 na mesma (para ver os dados)
    const [abaAtiva, setAbaAtiva] = useState(1);
    const [loading, setLoading] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    // Estado para os campos de localização e horários
    const [dadosForm, setDadosForm] = useState({
        dia_semana: grupo.dia_semana || '',
        horario: grupo.horario || '',
        endereco: grupo.endereco || '',
        numero: grupo.numero || '',
        bairro: grupo.bairro || '',
        cidade: grupo.cidade || '',
        distrito: grupo.distrito || '',
        pais: grupo.pais || 'Portugal'
    });

    // Estados para o Registro de Encontro
    const [presentes, setPresentes] = useState<number[]>([]);
    const [previewFoto, setPreviewFoto] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Mapeamento de participantes para destacar líderes
    const participantesMap = new Map();
    if (grupo.lideres) {
        grupo.lideres.forEach((l: any) => participantesMap.set(l.id, { ...l, isLider: true }));
    }
    if (grupo.membros) {
        grupo.membros.forEach((m: any) => {
            if (!participantesMap.has(m.id)) participantesMap.set(m.id, { ...m, isLider: false });
        });
    }
    const todosParticipantes = Array.from(participantesMap.values());

    const handleInputChange = (e: any) => {
        // Só permite alterar se for líder (segurança extra no front-end)
        if (!ehLider) return; 
        setDadosForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const togglePresenca = (membroId: number) => {
        setPresentes(prev => prev.includes(membroId) ? prev.filter(id => id !== membroId) : [...prev, membroId]);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreviewFoto(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    async function handleSalvarConfig() {
        if (!ehLider) return;
        setLoading(true);
        const formData = new FormData();
        formData.append('grupo_id', grupo.id.toString());
        Object.entries(dadosForm).forEach(([key, value]) => formData.append(key, value));
        
        const res = await atualizarDadosGrupoAction(formData);
        setLoading(false);
        if (res.sucesso) {
            setSucesso(true);
            setTimeout(() => setSucesso(false), 3000);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            toast(res.erro, 'erro');
        }
    }

    async function handleRegistrarEncontro(formData: FormData) {
        if (!ehLider) return;
        if (!formData.get('data') || !formData.get('tema')) {
            toast("A data e o resumo do encontro são obrigatórios.", 'aviso');
            return;
        }

        setLoading(true);
        formData.append('grupo_id', grupo.id.toString());
        
        const res = await registrarEncontroAction(formData, presentes);
        
        setLoading(false);
        if (res.sucesso) {
            setSucesso(true);
            setPresentes([]);
            setPreviewFoto(null);
            setTimeout(() => setSucesso(false), 4000);
            setAbaAtiva(3); // Vai para o histórico após salvar
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            toast(res.erro, 'erro');
        }
    }

    return (
        <main className="max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 pb-24 animate-in fade-in duration-700">
            {/* BREADCRUMB REUTILIZÁVEL */}
            <Breadcrumb items={[
                { label: 'Minha Dashboard', href: '/membros/dashboard', isBackIcon: true },
                { label: grupo.categoria || 'Grupos', hideOnMobile: true },
                { label: ehLider ? 'Gestão do Grupo' : 'Meu Grupo' }
            ]} />
            {/* HEADER */}
            <header className="bg-blue-600 text-white p-8 md:p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30 shrink-0">
                        <Users size={40} />
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">{grupo.nome}</h1>
                        <p className="text-blue-100 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{grupo.categoria || 'Grupo Familiar'}</p>
                    </div>
                </div>
            </header>

            {/* NAVEGAÇÃO DE ABAS */}
            <nav className="flex gap-2 p-1 bg-bg2 border border-soft rounded-2xl sticky top-4 z-40 backdrop-blur-md shadow-sm overflow-x-auto custom-scrollbar">
                <TabButton active={abaAtiva === 1} onClick={() => setAbaAtiva(1)} icon={<Users size={14} />} label="Gestão do Grupo" />
                
                {/* Apenas líderes podem ver a aba de registar encontro */}
                {ehLider && (
                    <TabButton active={abaAtiva === 2} onClick={() => setAbaAtiva(2)} icon={<CalendarDays size={14} />} label="Registrar Encontro" />
                )}
                
                <TabButton active={abaAtiva === 3} onClick={() => setAbaAtiva(3)} icon={<History size={14} />} label="Histórico" />
            </nav>

            {/* MENSAGEM DE SUCESSO GLOBAL */}
            {sucesso && (
                <div className="bg-green-50 border border-green-200 text-green-600 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 shadow-sm">
                    <Check size={18} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Ação concluída com sucesso!</span>
                </div>
            )}

            <div className="min-h-[500px]">
                
                {/* ========================================================= */}
                {/* ABA 1: GESTÃO DO GRUPO                                    */}
                {/* ========================================================= */}
                {abaAtiva === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                        
                        {/* 1.1 - LISTA DE MEMBROS */}
                        <section className="bg-bg2 border border-soft rounded-[2.5rem] p-6 md:p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-6 border-b border-soft pb-4">
                                <h4 className="text-sm font-black uppercase italic text-fg flex items-center gap-2">
                                    <Users size={18} className="text-blue-500" /> Membros da Equipa
                                </h4>
                                <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black">{todosParticipantes.length} Pessoas</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {todosParticipantes.length > 0 ? todosParticipantes.map((membro: any) => (
                                    <div key={membro.id} className={`bg-bg border p-4 rounded-2xl flex items-center justify-between group relative overflow-hidden transition-all hover:border-blue-300 ${membro.isLider ? 'border-blue-400/50 shadow-sm' : 'border-soft'}`}>
                                        {membro.isLider && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>}
                                        <div className="flex items-center gap-3 pl-1">
                                            <div className="w-10 h-10 rounded-xl bg-soft flex items-center justify-center overflow-hidden text-muted shrink-0">
                                                {membro.avatar_file ? <img src={membro.avatar_file} className="object-cover w-full h-full" alt="Avatar" /> : <User size={20} />}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-xs font-black text-fg uppercase truncate">{membro.first_name} {membro.last_name}</span>
                                                {membro.isLider && <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-0.5">Líder do Grupo</span>}
                                            </div>
                                        </div>
                                        {/* Apenas líderes podem remover, e não podem remover outros líderes por aqui 
                                        {ehLider && !membro.isLider && (
                                            <button 
                                                onClick={() => {
                                                    if(confirm("Remover este membro do grupo?")) {
                                                        alert("Funcionalidade de remover membro (requer integração com a action)");
                                                    }
                                                }} 
                                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                                                title="Remover Membro"
                                            >
                                                <UserMinus size={14} />




                                            </button>
                                        )}*/}
                                    </div>
                                )) : (
                                    <div className="col-span-full py-8 text-center text-muted">
                                        <p className="text-[10px] font-black uppercase tracking-widest">Nenhum membro encontrado.</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 1.2 - INFORMAÇÕES GERAIS E LOCALIZAÇÃO */}
                        <section className="bg-bg2 border border-soft rounded-[2.5rem] p-6 md:p-8 space-y-8 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h4 className="text-sm font-black uppercase italic text-fg flex items-center gap-2">
                                    <Edit3 size={18} className="text-blue-500" /> Informações do Grupo
                                </h4>
                                {ehLider && (
                                    <button onClick={handleSalvarConfig} disabled={loading} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-md active:scale-95">
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar Dados
                                    </button>
                                )}
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-muted ml-2 tracking-widest flex items-center gap-2">
                                        <CalendarDays size={12} className="text-blue-500" /> Dia da Reunião
                                    </label>
                                    <select 
                                        name="dia_semana" 
                                        value={dadosForm.dia_semana} 
                                        onChange={handleInputChange}
                                        disabled={!ehLider}
                                        className={`w-full bg-bg border border-soft rounded-xl p-4 text-[11px] font-bold text-fg outline-none transition-all shadow-sm ${!ehLider ? 'opacity-70 cursor-not-allowed' : 'focus:border-blue-500 cursor-pointer'}`}
                                    >
                                        <option value="">Selecione o dia...</option>
                                        <option value="Segunda-feira">Segunda-feira</option>
                                        <option value="Terça-feira">Terça-feira</option>
                                        <option value="Quarta-feira">Quarta-feira</option>
                                        <option value="Quinta-feira">Quinta-feira</option>
                                        <option value="Sexta-feira">Sexta-feira</option>
                                        <option value="Sábado">Sábado</option>
                                        <option value="Domingo">Domingo</option>
                                    </select>
                                </div>
                                <InputBox label="Horário" name="horario" type="time" value={dadosForm.horario} onChange={handleInputChange} icon={<Clock size={12} />} readOnly={!ehLider} />
                            </div>

                            <div className="pt-8 border-t border-soft">
                                <h5 className="text-[10px] font-black uppercase text-muted tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <MapPin size={16} className="text-blue-500" /> Localização do Encontro
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2"><InputBox label="Morada (Rua)" name="endereco" value={dadosForm.endereco} onChange={handleInputChange} icon={<Home size={12} />} readOnly={!ehLider} /></div>
                                    <InputBox label="Número" name="numero" value={dadosForm.numero} onChange={handleInputChange} readOnly={!ehLider} />
                                    <InputBox label="Bairro / Freguesia" name="bairro" value={dadosForm.bairro} onChange={handleInputChange} readOnly={!ehLider} />
                                    <InputBox label="Cidade" name="cidade" value={dadosForm.cidade} onChange={handleInputChange} readOnly={!ehLider} />
                                    <InputBox label="Distrito / Estado" name="distrito" value={dadosForm.distrito} onChange={handleInputChange} readOnly={!ehLider} />
                                    
                                    {/* DROPDOWN DE PAÍSES */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase text-muted ml-2 tracking-widest flex items-center gap-2">
                                            <Globe size={12} className="text-blue-500" /> País
                                        </label>
                                        <select 
                                            name="pais" 
                                            value={dadosForm.pais} 
                                            onChange={handleInputChange} 
                                            disabled={!ehLider}
                                            className={`w-full bg-bg border border-soft rounded-xl p-4 text-[11px] font-bold text-fg outline-none transition-all shadow-sm ${!ehLider ? 'opacity-70 cursor-not-allowed' : 'focus:border-blue-500 cursor-pointer'}`}
                                        >
                                            <option value="">Selecione o País...</option>
                                            <option value="Portugal">Portugal</option>
                                            <option value="Brasil">Brasil</option>
                                            <option value="Angola">Angola</option>
                                            <option value="Moçambique">Moçambique</option>
                                            <option value="Cabo Verde">Cabo Verde</option>
                                            <option value="São Tomé e Príncipe">São Tomé e Príncipe</option>
                                            <option value="Guiné-Bissau">Guiné-Bissau</option>
                                            <option value="Espanha">Espanha</option>
                                            <option value="França">França</option>
                                            <option value="Reino Unido">Reino Unido</option>
                                            <option value="Estados Unidos">Estados Unidos</option>
                                            <option value="Canadá">Canadá</option>
                                            <option value="Suíça">Suíça</option>
                                            <option value="Luxemburgo">Luxemburgo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {/* ========================================================= */}
                {/* ABA 2: REGISTRAR ENCONTRO (Apenas Líderes veem)           */}
                {/* ========================================================= */}
                {abaAtiva === 2 && ehLider && (
                    <form action={handleRegistrarEncontro} className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-bg2 border border-soft p-6 md:p-8 rounded-[2.5rem] shadow-sm">
                            <h4 className="text-xl font-black uppercase italic text-fg">Relatório do Encontro</h4>
                            <button type="submit" disabled={loading} className="w-full md:w-auto bg-fg text-bg px-8 py-4 rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-50">
                                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Relatório
                            </button>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-8">
                            {/* COLUNA ESQUERDA: DADOS DO ENCONTRO */}
                            <div className="space-y-6">
                                <InputBox label="Data do Encontro" name="data" type="date" required defaultValue={new Date().toISOString().split('T')[0]} icon={<CalendarDays size={12}/>} />
                                
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-muted ml-2 tracking-widest flex items-center gap-2">
                                        <FileText size={12} className="text-blue-500" /> Tema / Resumo
                                    </label>
                                    <textarea name="tema" required rows={4} placeholder="O que foi falado hoje?" className="w-full bg-bg border border-soft rounded-[1.5rem] p-5 text-xs font-bold text-fg focus:border-blue-500 outline-none resize-none shadow-sm" />
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-muted ml-2 tracking-widest flex items-center gap-2">
                                        <Camera size={12} className="text-blue-500" /> Fotografia do Encontro (Opcional)
                                    </label>
                                    <div onClick={() => fileInputRef.current?.click()} className={`w-full h-48 rounded-[1.5rem] border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden relative group ${previewFoto ? 'border-blue-500' : 'border-soft bg-bg hover:bg-soft/30'}`}>
                                        {previewFoto ? (
                                            <>
                                                <img src={previewFoto} className="w-full h-full object-cover" alt="Preview do Encontro" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-white text-[10px] font-black uppercase bg-blue-600 px-4 py-2 rounded-xl">Trocar Foto</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center text-muted">
                                                <Camera size={32} className="mx-auto mb-2 opacity-50" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Clique para carregar foto</span>
                                            </div>
                                        )}
                                        <input type="file" name="foto" ref={fileInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </div>
                                </div>
                            </div>

                            {/* COLUNA DIREITA: PRESENÇAS */}
                            <div className="bg-bg2 border border-soft rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col h-full">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-soft">
                                    <h4 className="text-sm font-black uppercase italic text-fg flex items-center gap-2">
                                        <CheckSquare size={16} className="text-blue-500" /> Presenças
                                    </h4>
                                    <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black">
                                        {presentes.length} marcados
                                    </span>
                                </div>

                                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
                                    {todosParticipantes.length > 0 ? todosParticipantes.map((membro: any) => {
                                        const isPresente = presentes.includes(membro.id);
                                        return (
                                            <button 
                                                key={membro.id} 
                                                type="button" 
                                                onClick={() => togglePresenca(membro.id)} 
                                                className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${
                                                    isPresente ? 'bg-green-50 border-green-500/30 shadow-sm' : 'bg-bg border-soft hover:border-blue-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                                        isPresente ? 'bg-green-500 text-white shadow-md' : 'bg-soft text-muted'
                                                    }`}>
                                                        {isPresente ? <Check size={16} strokeWidth={3} /> : <User size={16} />}
                                                    </div>
                                                    <div className="text-left flex flex-col justify-center">
                                                        <span className={`text-[11px] font-black uppercase leading-tight ${isPresente ? 'text-green-700' : 'text-fg'}`}>
                                                            {membro.first_name} {membro.last_name}
                                                        </span>
                                                        {membro.isLider && <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Líder</span>}
                                                    </div>
                                                </div>
                                            </button>
                                        )
                                    }) : (
                                        <p className="text-[10px] text-center text-muted pt-10">Não há membros neste grupo.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </form>
                )}

                {/* ========================================================= */}
                {/* ABA 3: HISTÓRICO COLAPSADO                                */}
                {/* ========================================================= */}
                {abaAtiva === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                        {grupo.encontros && grupo.encontros.length > 0 ? (
                            grupo.encontros.map((encontro: any) => (
                                <details key={encontro.id} className="group bg-bg2 border border-soft rounded-3xl overflow-hidden transition-all hover:border-blue-300 shadow-sm">
                                    <summary className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer list-none select-none gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
                                                <CalendarDays size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-muted tracking-widest">Encontro</p>
                                                <p className="text-sm font-black text-fg italic uppercase tracking-tighter">
                                                    {new Date(encontro.data).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                                            <span className="text-[9px] font-black bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg uppercase text-blue-700 tracking-widest">
                                                {encontro.presentes?.length || 0} Presentes
                                            </span>
                                            <div className="p-2 bg-bg border border-soft rounded-full group-open:bg-blue-50 group-open:text-blue-600 transition-colors">
                                                <ChevronRight size={16} className="text-muted group-open:rotate-90 transition-transform" />
                                            </div>
                                        </div>
                                    </summary>
                                    
                                    <div className="px-6 pb-6 pt-2 border-t border-soft/50 animate-in slide-in-from-top-2">
                                        <div className="grid md:grid-cols-2 gap-8 mt-4">
                                            <div className="space-y-4">
                                                <div className="aspect-video bg-soft rounded-2xl overflow-hidden border border-soft">
                                                    {encontro.foto_url ? (
                                                        <img src={encontro.foto_url} className="w-full h-full object-cover" alt="Foto do Encontro" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-muted/30">
                                                            <ImageIcon size={40} className="mb-2"/>
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Sem registo fotográfico</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black uppercase text-muted tracking-widest block mb-1.5 ml-1">Resumo da Ministração:</span>
                                                    <p className="text-xs text-fg leading-relaxed bg-bg p-5 rounded-2xl border border-soft/50 font-medium shadow-sm">
                                                        "{encontro.tema}"
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <span className="text-[9px] font-black uppercase text-muted tracking-widest block mb-3 ml-1">Estiveram Presentes:</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {encontro.presentes && encontro.presentes.length > 0 ? encontro.presentes.map((p: any) => (
                                                        <span key={p.id} className="text-[9px] font-black bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-lg uppercase">
                                                            {p.first_name} {p.last_name}
                                                        </span>
                                                    )) : (
                                                        <span className="text-[10px] text-muted italic p-2">Nenhum participante marcado.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </details>
                            ))
                        ) : (
                            <div className="py-20 text-center bg-bg2 border border-soft rounded-[2.5rem]">
                                <History size={48} className="mx-auto text-muted/30 mb-4" />
                                <h4 className="text-sm font-black text-fg uppercase italic tracking-tighter">Nenhum encontro registado</h4>
                                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Os relatórios aparecerão aqui.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

// COMPONENTES AUXILIARES (UI)
function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button 
            onClick={onClick} 
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-2 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${
                active ? "bg-blue-600 text-white shadow-md" : "text-muted hover:text-fg hover:bg-soft"
            }`}
        >
            {icon} <span className="hidden sm:inline">{label}</span>
        </button>
    );
}

function InputBox({ label, name, value, onChange, type = "text", icon, readOnly, defaultValue, required }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-muted ml-2 tracking-widest flex items-center gap-2">
                {icon && <span className="text-blue-500">{icon}</span>} {label}
            </label>
            <input 
                type={type} 
                name={name} 
                value={value} 
                defaultValue={defaultValue} 
                onChange={onChange} 
                readOnly={readOnly} 
                required={required}
                className={`w-full bg-bg border border-soft rounded-xl p-4 text-[11px] font-bold text-fg outline-none transition-all shadow-sm ${
                    readOnly ? 'cursor-not-allowed opacity-70' : 'focus:border-blue-500'
                }`} 
            />
        </div>
    )
}