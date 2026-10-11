import { getDb } from '@/lib/db'
import Link from 'next/link'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import { 
    CalendarDays, Coffee, BookOpen, Users, 
    Utensils, CalendarPlus, ChevronRight, ArrowLeft, 
    Clock, User 
} from 'lucide-react'

import ModalNovaAgenda from '@/components/admin/ModalNovaAgenda'
import ModalEditarAgenda from '@/components/admin/ModalEditarAgenda'
import ModalNovoCompromisso from '@/components/admin/ModalNovoCompromisso'
import BotoesAcaoCompromisso from '@/components/admin/BotoesAcaoCompromisso'
import HorariosEditor from '@/components/admin/HorariosEditor'
import BotaoSyncCalendar from '@/components/admin/BotaoSyncCalendar'

// Função auxiliar para mapear as categorias para Cores e Ícones
function getCategoriaEstilo(categoria: string) {
    switch (categoria) {
        case 'CAFE': return { cor: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icone: Coffee, label: 'Café com Pastor' };
        case 'PERMANECER': return { cor: 'text-figueira', bg: 'bg-figueira/10', border: 'border-figueira/20', icone: BookOpen, label: 'Plano Permanecer' };
        case 'DISCIPULADO': return { cor: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icone: Users, label: 'Discipulado' };
        case 'LIDERANCA': return { cor: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icone: Users, label: 'Liderança' };
        case 'MESA': return { cor: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icone: Utensils, label: 'A Mesa' };
        default: return { cor: 'text-muted', bg: 'bg-soft/30', border: 'border-soft', icone: CalendarDays, label: 'Outros' };
    }
}

export default async function AgendasDashboard() {
    const db = await getDb()
    const session = await getSessionData();
    if (!session) redirect('/login'); // Se não tiver logado, manda para o login

    // NOVA SEGURANÇA: Verifica se este membro é dono ou gestor de alguma agenda
    const isGestor = await db.agenda.findFirst({
        where: {
            OR: [
                { dono_id: session.membroId },
                { gestores: { some: { id: session.membroId } } }
            ]
        }
    });

    // Se NÃO for ADMIN e também NÃO for dono/gestor, bloqueia o acesso!
    if (session.role !== 'ADMIN' && !isGestor) {
        redirect('/membros/dashboard'); 
    }

    // 1. Vai buscar as Agendas (Se for ADMIN vê todas, se for Líder vê só a dele)
    const agendas = await db.agenda.findMany({
        where: isAdmin(session.role) ? {} : { 
            OR: [
                { dono_id: session.membroId },
                { gestores: { some: { id: session.membroId } } }
            ]
        },
        include: {
            dono: true,
            gestores: true,
            compromissos: {
                where: { 
                    data_inicio: { gte: new Date() }, 
                    status: { in: ['AGENDADO', 'PENDENTE'] } 
                },
                orderBy: { data_inicio: 'asc' },
                // Mantivemos as celulas aqui também para garantir!
                include: { membros: true, visitantes: true, departamentos: true, grupos: true }
            }
        }
    });

    // Buscar listas para o Modal de Marcação
    const membros = await db.membro.findMany({
        where: { status: 'ATIVO' },
        orderBy: { first_name: 'asc' }
    });
    
    const visitantes = await db.visitante.findMany({
        orderBy: { nome: 'asc' }
    });

    const departamentos = await db.departamento.findMany({
        orderBy: { nome: 'asc' }
    });

    const grupos = await db.grupo.findMany({ 
        orderBy: { nome: 'asc' } 
    });

    return (
        <main className="max-w-6xl mx-auto py-10 px-6 space-y-10 animate-in fade-in duration-700 pb-32">
            
            {/* --- BREADCRUMBS --- */}
            <nav className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                <Link href="/admin/dashboard" className="hover:text-figueira transition-colors flex items-center gap-2">
                    <ArrowLeft size={12} strokeWidth={3} /> Dashboard Admin
                </Link>
                <ChevronRight size={10} className="opacity-30" />
                <span className="text-fg italic">Gabinete Pastoral</span>
            </nav>

            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
                <div className="space-y-2">
                    <span className="text-figueira font-black text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                        <CalendarDays size={14} /> Gabinete & Atendimento
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Gestão de <span className="text-muted/30">Agendas.</span>
                    </h1>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest pt-2">
                        Controle os compromissos, aconselhamentos e reuniões pastorais.
                    </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-3">
                    <div className="flex items-center gap-3">
                        <ModalNovoCompromisso agendas={agendas} membros={membros} visitantes={visitantes} departamentos={departamentos} grupos={grupos} />
                        <ModalNovaAgenda membros={membros} />
                    </div>
                    <BotaoSyncCalendar credenciaisConfiguradas={!!process.env.GOOGLE_CALENDAR_CREDENTIALS} />
                </div>
            </header>

            {/* --- LISTAGEM DE AGENDAS --- */}
            {agendas.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-soft rounded-[3rem] bg-bg2/50">
                    <CalendarDays size={32} className="mx-auto text-muted/30 mb-4" />
                    <h3 className="text-lg font-black uppercase italic tracking-tighter text-fg mb-2">Nenhuma Agenda Criada</h3>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-widest max-w-sm mx-auto">
                        Crie a primeira agenda pastoral para começar a receber marcações.
                    </p>
                </div>
            ) : (
                <div className="space-y-12">
                    {agendas.map(agenda => (
                        <section key={agenda.id} className="bg-bg2 border border-soft rounded-[3.5rem] shadow-sm overflow-hidden">
                            
                            {/* CABEÇALHO DA AGENDA */}
                            <div className="p-8 md:p-10 border-b border-soft flex items-center justify-between bg-bg/50">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-figueira/10 border border-figueira/20 flex items-center justify-center overflow-hidden">
                                        {agenda.dono.avatar_file ? (
                                            <img src={agenda.dono.avatar_file} alt="Foto" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={24} className="text-figueira" />
                                        )}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg">
                                            {agenda.nome}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted bg-soft/30 px-2 py-0.5 rounded-md">
                                                {agenda.is_publica ? '🌍 Agenda Pública' : '🔒 Agenda Privada'}
                                            </span>
                                            <span className="text-[9px] font-black text-figueira uppercase tracking-widest">
                                                {agenda.compromissos.length} Próximos
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Corrigido: Removido o <button> que envolvia o Modal! */}
                                <div>
                                    <ModalEditarAgenda agenda={agenda} membros={membros} />
                                </div>
                            </div>

                            {/* LISTA DE COMPROMISSOS */}
                            <div className="p-8 md:p-10 space-y-4">
                                {agenda.compromissos.length === 0 ? (
                                    <p className="text-[10px] text-center font-bold text-muted uppercase tracking-widest italic py-6">
                                        Agenda livre. Nenhum compromisso marcado.
                                    </p>
                                ) : (
                                    agenda.compromissos.map(comp => {
                                        const estilo = getCategoriaEstilo(comp.categoria);
                                        const Icone = estilo.icone;
                                        const data = new Date(comp.data_inicio);
                                        
                                        // MÁGICA DOS NOMES (Junta quem quer que esteja marcado)
                                        let listaNomes: string[] = [];
                                        if (comp.membros?.length) listaNomes.push(...comp.membros.map(m => m.first_name));
                                        if (comp.visitantes?.length) listaNomes.push(...comp.visitantes.map(v => v.nome.split(' ')[0])); // Apenas o 1º nome do visitante
                                        if (comp.departamentos?.length) listaNomes.push(...comp.departamentos.map(d => d.nome));
                                        if (comp.grupos?.length) listaNomes.push(...comp.grupos.map(g => g.nome));
                                        if (comp.externos) listaNomes.push(comp.externos);

                                        // Se houver mais de 3 entidades, abrevia (Ex: "João, Maria, Pedro +2")
                                        const pessoaNome = listaNomes.length > 0 
                                            ? (listaNomes.length > 3 ? `${listaNomes.slice(0, 3).join(', ')} +${listaNomes.length - 3}` : listaNomes.join(', '))
                                            : 'Bloqueio de Agenda';

const isPendente = comp.status === 'PENDENTE';

                                        return (
                                            <div key={comp.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border rounded-2xl transition-all shadow-sm group ${isPendente ? 'bg-orange-500/5 border-orange-500/30' : 'bg-bg border-soft hover:border-figueira/30'}`}>
                                                
                                                <div className="flex items-center gap-5">
                                                    {/* DATA E HORA */}
                                                    <div className="flex flex-col items-center justify-center min-w-[60px] border-r border-soft pr-5">
                                                        <span className="text-[10px] font-black uppercase text-muted tracking-widest mb-1">
                                                            {data.toLocaleDateString('pt-PT', { weekday: 'short' })}
                                                        </span>
                                                        <span className="text-xl font-black italic text-fg leading-none">
                                                            {data.getDate()}
                                                        </span>
                                                        <span className={`text-[9px] font-bold flex items-center gap-1 mt-1.5 px-2 rounded-md ${isPendente ? 'text-orange-500 bg-orange-500/10' : 'text-figueira bg-figueira/10'}`}>
                                                            <Clock size={8} /> {data.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

{/* DETALHES */}
                                                    <div className="flex-1 min-w-0"> {/* O flex-1 min-w-0 dá espaço para respirar */}
                                                        <h4 className="text-sm font-black uppercase tracking-tight text-fg group-hover:text-figueira transition-colors flex items-center gap-2 truncate">
                                                            <span className="truncate">{comp.titulo}</span>
                                                            {isPendente && (
                                                                <span className="bg-orange-500 text-white text-[8px] px-2 py-0.5 rounded-md tracking-widest animate-pulse shrink-0">
                                                                    Aguardar
                                                                </span>
                                                            )}
                                                        </h4>
                                                        
                                                        {/* Mudei para flex-wrap e reduzi os gaps */}
                                                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                            
                                                            {/* TAG CATEGORIA */}
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border flex items-center gap-1 shrink-0 ${estilo.bg} ${estilo.cor} ${estilo.border}`}>
                                                                <Icone size={10} /> {estilo.label}
                                                            </span>
                                                            
                                                            {/* TAG PESSOA (Ícone User reduzido para size={8}) */}
                                                            <span className="text-[9px] font-bold text-muted uppercase tracking-widest flex items-center gap-1 max-w-xs truncate">
                                                                <User size={8} className="shrink-0 text-muted/60" /> 
                                                                <span className="truncate">{pessoaNome}</span>
                                                            </span>
                                                            
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* OS BOTÕES AQUI NO CANTO DIREITO */}
                                                <div className="shrink-0 flex items-center self-end sm:self-center">
                                                    <BotoesAcaoCompromisso comp={comp} />
                                                </div>

                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* HORÁRIOS DISPONÍVEIS */}
                            <div className="px-8 md:px-10 pb-8 md:pb-10">
                                <details className="group">
                                    <summary className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-muted hover:text-figueira transition-colors flex items-center gap-2 select-none py-2">
                                        <Clock size={10} />
                                        Horários Disponíveis
                                        <span className="text-[8px] text-muted/40 group-open:rotate-90 transition-transform">▶</span>
                                    </summary>
                                    <div className="pt-3">
                                        <HorariosEditor
                                            agendaId={agenda.id}
                                            horariosIniciais={(agenda.horarios_disponiveis as any[]) || []}
                                        />
                                    </div>
                                </details>
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </main>
    )
}