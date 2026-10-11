import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import MontadorEscalas from '@/components/escalas/MontadorEscalas'
import ListaEscalados from '@/components/escalas/ListaEscalados'
import { ShieldCheck, Calendar, Activity, BarChart2 } from 'lucide-react'
//import RelatorioEscalasDepartamento from '@/components/escalas/RelatorioEscalasDepartamento'
import ModalRelatorioEscalaLider from '@/components/escalas/ModalRelatorioEscalaLider'

export default async function GestaoEscalaLider({ params }: { params: { id: string } }) {
    const db = await getDb()
    const { id } = await params;
    const deptoId = parseInt(id);

    // 1. VERIFICAÇÃO DE SESSÃO E SEGURANÇA
    const session = await getSessionData();
    if (!session) redirect('/membros/login');
    const { membroId, role } = session;

    const depto = await db.departamento.findUnique({
        where: { id: deptoId },
        include: { funcoes: true }
    });

    if (!depto) redirect('/membros/dashboard?error=departamento_nao_encontrado');

    const vinculoLider = await db.integranteDepartamento.findFirst({
        where: {
            membro_id: membroId,
            departamento_id: deptoId,
            OR: [
                { pode_gerir_escalas: true },
                { funcoes: { some: { funcao: { nome: { contains: 'Lider', mode: 'insensitive' } } } } }
            ]
        }
    });

    const eAdmin = isAdmin(role);
    const eLiderModel = depto.lider_id === membroId;

    if (!vinculoLider && !eAdmin && !eLiderModel) {
        redirect('/membros/dashboard?error=Acesso negado');
    }

    // 2. QUERIES PARALELAS — eventos, equipa, historico e permissão diaconia
    const eventoWhere: any = { data: { gte: new Date() } }
    if (depto.congregacaoId) {
        eventoWhere.OR = [
            { congregacao_id: depto.congregacaoId },
            { congregacao_id: null },
        ]
    }

    const [eventos, equipaDoDepartamento, historicoEscalas, vinculoDiaconia, liderDiaconia] = await Promise.all([
        // Eventos com escalas e repertório
        db.evento.findMany({
            where: eventoWhere,
            include: {
                repertorio: {
                    include: { musica: true },
                    orderBy: { ordem: 'asc' }
                },
                escalas: {
                    where: { departamento_id: deptoId },
                    include: {
                        membro: { select: { id: true, first_name: true, last_name: true, avatar_file: true, phone_1: true } },
                        departamento: { select: { nome: true } }
                    }
                }
            },
            orderBy: { data: 'asc' }
        }),
        // Equipa do departamento
        db.integranteDepartamento.findMany({
            where: { departamento_id: deptoId },
            include: {
                membro: { select: { id: true, first_name: true, last_name: true, avatar_file: true, phone_1: true } },
                funcoes: { include: { funcao: true } }
            }
        }),
        // Histórico de escalas (6 meses atrás + 3 meses à frente)
        db.escala.findMany({
            where: {
                departamento_id: deptoId,
                evento: {
                    data: {
                        gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
                        lte: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                    }
                }
            },
            include: {
                membro: { select: { id: true, first_name: true, last_name: true, avatar_file: true } },
                evento: { select: { id: true, nome: true, data: true } }
            },
            orderBy: { evento: { data: 'desc' } }
        }),
        // Permissão diaconia — vínculo
        eAdmin ? Promise.resolve(null) : db.integranteDepartamento.findFirst({
            where: {
                membro_id: membroId,
                departamento: { nome: { contains: 'diaconia', mode: 'insensitive' } },
                OR: [
                    { pode_gerir_escalas: true },
                    { funcoes: { some: { funcao: { nome: { contains: 'Lider', mode: 'insensitive' } } } } }
                ]
            }
        }),
        // Permissão diaconia — líder directo
        eAdmin ? Promise.resolve(null) : db.departamento.findFirst({
            where: {
                nome: { contains: 'diaconia', mode: 'insensitive' },
                lider_id: membroId
            }
        }),
    ]);

    const membrosFormatados = equipaDoDepartamento.map(i => ({
        ...i.membro,
        funcoesHabilitadas: i.funcoes.map(f => f.funcao_id)
    }));

    // 3. IDENTIFICAR SE É LOUVOR
    const isLouvor = depto.nome.toLowerCase().includes('louvor') || depto.nome.toLowerCase().includes('música') || depto.nome.toLowerCase().includes('musica');

    // 4. PERMISSÃO PARA EDITAR MENSAGEM DO CULTO
    const podeEditarMensagem = eAdmin || !!(vinculoDiaconia || liderDiaconia);

    const historicoSerializado = historicoEscalas.map(e => ({
        ...e,
        motivo_recusa: (e as any).motivo_recusa ?? null,
        evento: {
            ...e.evento,
            data: e.evento.data.toISOString()
        }
    }))


    return (
        <main className="max-w-7xl mx-auto pt-4 md:py-10 px-4 sm:px-6 lg:px-8 space-y-5 md:space-y-10 animate-in fade-in duration-700 pb-28 md:pb-32">
            {/* HEADER */}
            <header className="flex justify-between items-center md:items-end gap-3 md:gap-6 pb-4 md:pb-6 border-b border-soft">
                <div className="space-y-1 md:space-y-2 min-w-0">
                    <span className="text-figueira font-black text-[9px] md:text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                        <ShieldCheck size={12} /> Painel do Líder
                    </span>
                    <h1 className="text-xl md:text-5xl font-black italic uppercase tracking-tighter text-fg leading-none truncate">
                        <span className="hidden md:inline">Escalas: </span><span className="text-muted/30 md:text-muted/30">{depto.nome}</span>
                    </h1>
                </div>

                <div className="shrink-0">
                    <ModalRelatorioEscalaLider
                        departamentoId={deptoId}
                        departamentoNome={depto.nome}
                        equipaDoDepartamento={equipaDoDepartamento}
                    />
                </div>
            </header>

            {/* MONTADOR */}
            <section className="bg-bg2 border border-soft rounded-2xl overflow-hidden shadow-sm relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-figueira" />
                <div className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-5 border-b border-soft">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-figueira/10 text-figueira flex items-center justify-center shrink-0">
                        <Calendar size={16} />
                    </div>
                    <div>
                        <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-fg leading-none">Atribuir Escala</h2>
                        <p className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-muted mt-0.5 md:mt-1">
                            Evento, funcao e membro
                        </p>
                    </div>
                </div>
                <div className="p-4 md:p-6">
                    <MontadorEscalas
                        eventos={eventos}
                        funcoesDisponiveis={depto.funcoes}
                        membros={membrosFormatados}
                        departamentoId={deptoId}
                    />
                </div>
            </section>

            {/* QUADRO DE ESCALAS */}
            <section className="space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 md:gap-3 px-1">
                    <Activity size={14} className="text-emerald-500" />
                    <h2 className="text-xs md:text-sm font-black uppercase tracking-widest text-fg">Quadro de Escalas</h2>
                </div>
                <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <ListaEscalados
                        eventos={eventos}
                        isAdmin={eAdmin}
                        membros={membrosFormatados}
                        isLouvor={isLouvor}
                        podeEditarRepertorio={eAdmin || eLiderModel || !!vinculoLider}
                        podeEditarMensagem={podeEditarMensagem}
                    />
                </div>
            </section>
        </main>
    );
}