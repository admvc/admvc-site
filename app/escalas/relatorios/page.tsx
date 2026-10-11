import { getDb } from '@/lib/db'
import { startOfWeek, endOfWeek, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Printer, CalendarDays } from 'lucide-react'
import BotaoImprimir from '@/components/BotaoImprimir' // Importando o componente que criaremos abaixo

export const dynamic = 'force-dynamic'

export default async function RelatorioEscalasPage({
    searchParams,
}: {
    searchParams: { inicio?: string; fim?: string }
}) {
    const db = await getDb()

    // 1. Período ajustado
    const dataInicio = searchParams.inicio ? new Date(searchParams.inicio) : startOfWeek(new Date(), { weekStartsOn: 0 });
    const dataFim = searchParams.fim ? new Date(searchParams.fim) : endOfWeek(new Date(), { weekStartsOn: 6 });

    // 2. Busca no Servidor (Prisma)
    const escalas = await db.escala.findMany({
        where: {
            evento: {
                data: {
                    gte: dataInicio,
                    lte: dataFim,
                },
            },
        },
        include: {
            membro: true,
            evento: true,
            departamento: true,
        },
        orderBy: [
            { evento: { data: 'asc' } },
            { departamento: { nome: 'asc' } }
        ],
    });

    // 3. Agrupamento Duplo: Evento -> Departamento
    const relatorioData = escalas.reduce((acc: any, curr) => {
        const evId = curr.evento_id;
        const deptoNome = curr.departamento.nome;

        if (!acc[evId]) {
            acc[evId] = {
                info: curr.evento,
                deptos: {}
            };
        }

        if (!acc[evId].deptos[deptoNome]) {
            acc[evId].deptos[deptoNome] = [];
        }

        acc[evId].deptos[deptoNome].push(curr);
        return acc;
    }, {});

    return (
        <main className="max-w-6xl mx-auto p-8 space-y-10 pb-32">

            {/* HEADER - OCULTO NA IMPRESSÃO */}
            <header className="flex flex-col md:flex-row justify-between items-end gap-6 print:hidden border-b border-soft pb-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-figueira">
                        <CalendarDays size={16} />
                        <span className="font-black text-[10px] uppercase tracking-[0.3em]">Relatórios Oficiais</span>
                    </div>
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter text-fg leading-none">
                        Escalas <span className="text-muted/20">Semanais.</span>
                    </h1>
                    <p className="text-muted text-xs font-bold uppercase tracking-widest">
                        Período: {format(dataInicio, "dd/MM")} até {format(dataFim, "dd/MM")}
                    </p>
                </div>

                {/* Chamando o componente cliente para interatividade */}
                <BotaoImprimirInterno />
            </header>

            {/* CABEÇALHO DE IMPRESSÃO */}
            <div className="hidden print:flex flex-col items-center border-b-4 border-fg pb-6 mb-10 text-center">
                <h1 className="text-4xl font-black uppercase tracking-tighter italic">ADMVC • GESTÃO DE ESCALAS</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mt-2 text-muted">Relatório Geral de Atividades Ministerial</p>
                <div className="mt-4 px-6 py-1 bg-fg text-bg rounded-full text-[10px] font-black uppercase">
                    {format(dataInicio, "dd/MM/yyyy")} — {format(dataFim, "dd/MM/yyyy")}
                </div>
            </div>

            {/* CONTEÚDO */}
            <div className="space-y-16">
                {Object.values(relatorioData).length > 0 ? (
                    Object.values(relatorioData).map((item: any) => (
                        <section key={item.info.id} className="break-inside-avoid">
                            <div className="flex items-baseline gap-4 border-b-2 border-soft pb-2 mb-6">
                                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-fg">{item.info.nome}</h2>
                                <span className="text-xs font-bold text-figueira uppercase">
                                    {format(new Date(item.info.data), "EEEE, dd 'de' MMMM", { locale: pt })}
                                </span>
                            </div>

                            <div className="space-y-8">
                                {Object.entries(item.deptos).map(([depto, pessoas]: [string, any]) => (
                                    <div key={depto} className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted flex items-center gap-2">
                                            <span className="w-2 h-2 bg-figueira rounded-full" /> {depto}
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {pessoas.map((esc: any) => (
                                                <div key={esc.id} className="p-4 bg-bg2 border border-soft rounded-2xl flex justify-between items-center print:border-soft print:bg-white transition-all hover:border-figueira/30">
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase text-fg leading-none">
                                                            {esc.membro.first_name} {esc.membro.last_name}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-figueira uppercase mt-1 italic">
                                                            {esc.funcao}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                ) : (
                    <div className="py-32 text-center border-4 border-dashed border-soft rounded-[4rem]">
                        <p className="text-sm font-black uppercase text-muted tracking-widest">Nenhuma atividade registrada.</p>
                    </div>
                )}
            </div>

            <footer className="pt-10 border-t border-soft text-center hidden print:block mt-20">
                <p className="text-[9px] font-black uppercase text-muted tracking-widest">
                    Documento Interno • Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                </p>
            </footer>
        </main>
    )
}

/**
 * COMPONENTE CLIENTE
 * Para evitar erros de "Event Handlers", o componente que usa `onClick` 
 * deve ser importado ou definido com interatividade de cliente.
 * * NOTA: No Next.js, se você definir um componente "use client" em um arquivo 
 * separado, ele funciona melhor. Se o erro persistir, mova este BotaoImprimir 
 * para @/components/BotaoImprimir.tsx e adicione "use client" no topo dele.
 */
import BotaoImprimirInterno from '@/components/BotaoImprimir'; // Veja a instrução abaixo