// app/membros/dashboard/page.tsx
import { Suspense } from 'react'
import { getTenantClient } from '@/lib/prisma'
import CardSaldoLocal from '@/components/cantina/CardSaldoLocal'
import QrCodeMembro from '@/components/cantina/QrCodeMembro'
import CardLimiteFilhos from '@/components/cantina/CardLimiteFilhos'
import ExtratoCantinaLocal from '@/components/cantina/ExtratoCantinaLocal'
import ConsumoFilhos from '@/components/cantina/ConsumoFilhos'
import { headers } from 'next/headers'
import ModuloBloqueado from '@/components/ui/ModuloBloqueado'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin } from '@/lib/auth-utils'

import {
    Coffee, Receipt, FileSignature,
    HeartHandshake, Heart, CalendarDays, Wallet2, ChevronRight,
    Users, Clock, MapPin, MessageSquare, ChevronDown
} from 'lucide-react'

import BotoesEscala from '@/components/membros/BotoesEscala'
import PainelFinanceiroMembro from '@/components/membros/PainelFinanceiroMembro'
import CardDepartamentoMembro from '@/components/membros/CardDepartamentoMembro'
import SessaoExtratoCantina from '@/components/membros/SessaoExtratoCantina'
import FormAcompanhamentoRapido from '@/components/acolhimento/FormAcompanhamentoRapido'
import WidgetAgendaUnificada from '@/components/membros/WidgetAgendaUnificada'
import AvisoEscalaVazia from '@/components/membros/AvisoEscalaVazia'
import ModalExtratoMembro from '@/components/financeiro/ModalExtratoMembro'
import ModalRepertorio from '@/components/louvor/ModalRepertorio'
import ModalHistoricoEscalas from '@/components/louvor/ModalHistoricoEscalas'
import ModalGestaoGrupo from '@/components/membros/ModalGestaoGrupo'
import CardAniversariantesMes from '@/components/membros/CardAniversariantesMes'
import ModalDetalhesEscala from '@/components/membros/ModalDetalhesEscalas'
import BotaoSetlistPalco from '@/components/louvor/BotaoSetlistPalco'
import SaudacaoDia from '@/components/membros/SaudacaoDia'
import PendentesAtencao from '@/components/membros/PendentesAtencao'
import AcoesRapidas from '@/components/membros/AcoesRapidas'
import EstatisticasPessoais from '@/components/membros/EstatisticasPessoais'
import WidgetYouTube from '@/components/membros/WidgetYouTube'
import WidgetInstagram from '@/components/membros/WidgetInstagram'
import MobileDashboard from '@/components/membros/MobileDashboard'
import { fetchLatestYouTubeVideo } from '@/lib/youtube-rss'

export default async function DashboardMembro({
    searchParams
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const { tab } = await searchParams;
    const currentTab = tab || 'geral';

    // 1. DADOS BASE DA SESSÃO E TENANT
    const session = await getSessionData();
    if (!session) redirect('/membros/login');
    const { membroId, role } = session;

    const headersList = await headers();
    const tenantIdStr = headersList.get('x-tenant-id');

    if (!tenantIdStr) {
        return redirect('/membros/login?error=Igreja não identificada na sessão.');
    }

    const db = getTenantClient(Number(tenantIdStr));

    // 2. BUSCA O MEMBRO — com grupos e encontros incluídos
    let membro: any;
    try {
        membro = await db.membro.findUnique({
            where: { id: membroId },
            include: {
                // ✅ Grupos como MEMBRO — com membros, líderes e encontros
                grupos: {
                    include: {
                        membros: {
                            select: { id: true, first_name: true, last_name: true, avatar_file: true }
                        },
                        lideres: {
                            select: { id: true, first_name: true, last_name: true }
                        },
                        encontros: {
                            include: {
                                presentes: {
                                    select: { id: true, first_name: true, last_name: true }
                                }
                            },
                            orderBy: { data: 'desc' },
                            take: 10
                        }
                    }
                },
                // ✅ Grupos como LÍDER — mesma estrutura
                lider_de_grupo: {
                    include: {
                        membros: {
                            select: { id: true, first_name: true, last_name: true, avatar_file: true }
                        },
                        lideres: {
                            select: { id: true, first_name: true, last_name: true }
                        },
                        encontros: {
                            include: {
                                presentes: {
                                    select: { id: true, first_name: true, last_name: true }
                                }
                            },
                            orderBy: { data: 'desc' },
                            take: 10
                        }
                    }
                },
                departamentos_liderados: true,
                ministerios: {
                    include: { departamento: true, funcoes: { include: { funcao: true } } }
                },
                familia: true,
                congregacao: { select: { nome: true, cidade: true } },
                escalas: {
                    where: { evento: { data: { gte: new Date() } } },
                    orderBy: { evento: { data: 'asc' } },
                    include: {
                        departamento: true,
                        evento: {
                            include: {
                                repertorio: {
                                    include: { musica: true },
                                    orderBy: { ordem: 'asc' }
                                }
                            }
                        }
                    }
                },
                objetivos_financeiros: {
                    include: { lancamentos: { orderBy: { data_recebimento: 'desc' } } }
                }
            }
        });
    } catch (e) {
        console.error('[DASHBOARD] Falha na query do membro:', e)
        return redirect('/membros/login?error=Erro ao carregar dados. Tente novamente.')
    }

    if (!membro) {
        // Membro nao encontrado neste tenant — pode ser cookie de impersonacao
        // Limpar cookie e forcar re-login
        const { cookies } = await import('next/headers')
        const cookieStore = await cookies()
        cookieStore.delete('admvc_session')
        return redirect('/membros/login?error=Sessao invalida. Faca login novamente.')
    }

    // 3. LÓGICA DE PERMISSÕES
    const checkDepto = (termos: string[]) => {
        const isInMinisterio = membro.ministerios.some((v: any) =>
            termos.some(termo => v.departamento?.nome.toLowerCase().includes(termo))
        );
        const isLiderando = membro.departamentos_liderados.some((d: any) =>
            termos.some(termo => d.nome.toLowerCase().includes(termo))
        );
        return isInMinisterio || isLiderando;
    };

    const permissoes = {
        isMidia: checkDepto(['mídia', 'midia', 'multimédia']),
        isAcolhimento: checkDepto(['acolhimento', 'integração']),
        isCantina: checkDepto(['cantina']),
        isSocial: checkDepto(['social', 'despensa', 'assistência']),
        isLouvor: checkDepto(['louvor', 'música', 'musica', 'banda']),
        isLider: membro.departamentos_liderados?.length > 0 || membro.lider_de_grupo?.length > 0,
        isAdminOrFinance: isAdmin(role) || role === 'FINANCE'
    };

    const mostraFerramentasExtra = permissoes.isAdminOrFinance || permissoes.isAcolhimento || permissoes.isCantina || permissoes.isSocial || permissoes.isMidia || permissoes.isLouvor;

    const deptIds = membro.ministerios?.map((m: any) => m.departamento?.id).filter(Boolean) || [];
    const grupoIds = membro.grupos?.map((g: any) => g.id).filter(Boolean) || [];

    let departamentoLouvorId = membro.ministerios.find((v: any) =>
        ['louvor', 'música', 'musica'].some(t => v.departamento?.nome.toLowerCase().includes(t))
    )?.departamento?.id || membro.departamentos_liderados.find((d: any) =>
        ['louvor', 'música', 'musica'].some(t => d.nome.toLowerCase().includes(t))
    )?.id;

    if (!departamentoLouvorId && isAdmin(role)) {
        const depto = await db.departamento.findFirst({
            where: { nome: { contains: 'Louvor', mode: 'insensitive' } }
        });
        departamentoLouvorId = depto?.id;
    }

    // 4. DADOS PARALELOS
    const fetchSaldoLocal = async () => {
        try {
            const saldo = await db.saldoCantina.findUnique({ where: { membro_id: membroId } })
            return saldo?.saldo || 0
        } catch { return 0 }
    };

    const safe = async <T,>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
        try { return await fn() } catch (e) {
            console.error(`[DASHBOARD] Falha em "${label}":`, e)
            return fallback
        }
    }

    const [
        proximosEventos, visitantesPendentesCount, ultimosAvisos,
        minhasRifas, minhasContribuicoes, carregamentosHistorico,
        meusAcompanhamentos, saldoCantina, visitantesAtualizados,
        escolaridades, aniversariantesMes, tenantSocial,
        cursosAtivosRaw, meusInteressesRaw
    ] = await Promise.all([
        safe('proximosEventos', () => db.evento.findMany({
            where: { data: { gte: new Date() } },
            orderBy: { data: 'asc' },
            take: 10
        }), []),
        safe('visitantesPendentesCount', () =>
            (isAdmin(role) || permissoes.isAcolhimento)
                ? db.visitante.count({ where: { status: 'NOVO' } })
                : Promise.resolve(0)
        , 0),
        safe('ultimosAvisos', () => db.avisoMural.findMany({
            where: {
                OR: [
                    { departamento_id: { in: deptIds.length > 0 ? deptIds : [-1] } },
                    { grupo_id: { in: grupoIds.length > 0 ? grupoIds : [-1] } }
                ]
            },
            include: {
                autor: { select: { first_name: true, last_name: true, avatar_file: true } },
                departamento: { select: { nome: true } },
                grupo: { select: { nome: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        }), []),
        safe('minhasRifas', () => db.rifaNumero.findMany({
            where: { membro_id: membroId },
            include: { rifa: true },
            orderBy: { createdAt: 'desc' }
        }), []),
        safe('minhasContribuicoes', () => db.contribuicao.findMany({
            where: { membro_id: membroId },
            orderBy: { data: 'desc' }
        }), []),
        safe('carregamentosHistorico', () => db.pedidoSaldoCantina.findMany({
            where: { membro_id: membroId },
            orderBy: { createdAt: 'desc' }
        }), []),

        // INDEX 6 - meusAcompanhamentos (expandido: vários status + responsavel)
        safe('meusAcompanhamentos', () => permissoes.isAcolhimento ? db.visitante.findMany({
            where: {
                tenant_id: Number(tenantIdStr),
                status: { in: ['NOVO', 'EM_CONTACTO', 'REUNIAO_PASTOR'] },
                OR: [
                    { acompanhamentos: { some: { membro_id: membroId } } },
                    { responsavel_id: membroId }
                ]
            },
            select: {
                id: true,
                nome: true,
                telefone: true,
                status: true,
                data_ultima_visita: true,
                proximo_contacto: true,
                responsavel_id: true,
                acompanhamentos: {
                    select: {
                        id: true,
                        data_contacto: true,
                        tipo_contacto: true,
                        observacoes: true,
                        membro_id: true,
                    },
                    orderBy: { data_contacto: 'desc' as const },
                }
            },
            orderBy: { data_ultima_visita: 'desc' },
            take: 8
        }) : Promise.resolve([]), []),

        // INDEX 7 - saldoCantina
        fetchSaldoLocal(),

        // INDEX 8 - visitantesAtualizados
        safe('visitantesAtualizados', () => permissoes.isAcolhimento ? db.visitante.findMany({
            where: { status: { in: ['NOVO', 'EM_CONTACTO'] } },
            select: {
                id: true,
                nome: true,
                data_ultima_visita: true,
                status: true
            },
            orderBy: { data_ultima_visita: 'desc' },
            take: 5
        }) : Promise.resolve([]), []),

        // INDEX 9 - escolaridades para o drawer de perfil
        safe('escolaridades', () => db.escolaridade.findMany({ orderBy: { id: 'asc' } }), []),

        // INDEX 10 - aniversariantes do mês atual (filtrado por mês em JS)
        safe('aniversariantesMes', () => db.membro.findMany({
            where: {
                is_active: true,
                birthdate: { not: null },
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                avatar_file: true,
                birthdate: true,
            }
        }), []),

        // INDEX 11 - redes sociais do tenant
        safe('tenantSocial', () => db.tenant.findUnique({
            where: { id: Number(tenantIdStr) },
            select: { youtube_channel_id: true, instagram_handle: true }
        }), null),

        // INDEX 12 - cursos ativos
        safe('cursosAtivos', () => db.cursoEBD.findMany({
            where: { status: 'EM_CURSO', aprovado: true },
            include: {
                turmas: { include: { _count: { select: { matriculas: true } } } },
                _count: { select: { turmas: true } },
            },
            orderBy: { data_inicio: 'asc' },
        }), []),

        // INDEX 13 - interesses do membro em cursos
        safe('meusInteresses', () => db.interesseCurso.findMany({
            where: { membro_id: membroId },
            select: { curso_id: true },
        }), [])
    ]);

    // 4b. YOUTUBE — buscar último vídeo (cache 1h)
    const youtubeVideo = tenantSocial?.youtube_channel_id
        ? await safe('youtubeRSS', () => fetchLatestYouTubeVideo(tenantSocial.youtube_channel_id!), null)
        : null

    // 4c. AGRUPAR AVISOS POR CANAL (mostrar apenas a última mensagem de cada)
    let muralPorCanal: { canal: string; totalMensagens: number; ultima: { id: string; texto: string; dataFormatada: string; autorNome: string | null } }[] = []
    try {
        const porCanal = new Map<string, { total: number; ultima: any }>()
        for (const aviso of (ultimosAvisos || [])) {
            const canal = aviso.departamento?.nome || aviso.grupo?.nome || 'Geral'
            const existente = porCanal.get(canal)
            if (!existente) {
                porCanal.set(canal, {
                    total: 1,
                    ultima: aviso
                })
            } else {
                existente.total++
            }
        }
        muralPorCanal = Array.from(porCanal.entries()).map(([canal, { total, ultima }]) => ({
            canal,
            totalMensagens: total,
            ultima: {
                id: String(ultima.id),
                texto: String(ultima.texto || ''),
                dataFormatada: ultima.createdAt
                    ? new Date(ultima.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
                    : '',
                autorNome: ultima.autor
                    ? `${ultima.autor.first_name} ${ultima.autor.last_name}`
                    : null
            }
        }))
    } catch (e) {
        console.error('[DASHBOARD] Falha ao processar avisos do mural:', e)
        muralPorCanal = []
    }

    // 5. PROCESSAMENTO DE DADOS UI
    const hoje = new Date();
    const gdprPendente = !membro.gdpr_aceite || (membro.gdpr_validade && membro.gdpr_validade < hoje);

    // ✅ Filtra aniversariantes pelo mês actual comparando apenas mês/dia
    const mesAtual = hoje.getMonth() // 0-11
    const aniversariantesMesFiltrados = aniversariantesMes
        .filter((m: any) => m.birthdate && new Date(m.birthdate).getMonth() === mesAtual)
        .sort((a: any, b: any) => new Date(a.birthdate).getDate() - new Date(b.birthdate).getDate())

    const escalasAgrupadas = new Map();
    membro.escalas.forEach((esc: any) => {
        if (!esc.evento || !esc.departamento) return
        const key = `${esc.evento.id}-${esc.departamento.id}`;
        if (escalasAgrupadas.has(key)) {
            const existente = escalasAgrupadas.get(key);
            existente.ids.push(esc.id);
            if (!existente.funcoes.includes(esc.funcao)) existente.funcoes.push(esc.funcao);
            if (!esc.confirmado) existente.confirmado = false;
            // ✅ mantém motivo_recusa se existir em qualquer escala do grupo
            if (esc.motivo_recusa) existente.motivo_recusa = esc.motivo_recusa;
        } else {
            escalasAgrupadas.set(key, {
                ...esc,
                ids: [esc.id],
                funcoes: [esc.funcao],
                motivo_recusa: esc.motivo_recusa ?? null
            });
        }
    });
    // Ordenar: confirmadas primeiro, depois por data mais próxima
    const listaEscalas = Array.from(escalasAgrupadas.values())
        .sort((a: any, b: any) => {
            // Confirmadas primeiro
            if (a.confirmado && !b.confirmado) return -1
            if (!a.confirmado && b.confirmado) return 1
            // Depois por data mais próxima
            return new Date(a.evento.data).getTime() - new Date(b.evento.data).getTime()
        })
        .slice(0, 6);

    // DEPARTAMENTOS
    const departamentosAgrupados = new Map();
    membro.ministerios?.forEach((v: any) => {
        if (!v.departamento) return;
        departamentosAgrupados.set(`depto-${v.departamento.id}`, {
            id: v.departamento.id,
            nome: v.departamento.nome,
            tipo: 'DEPARTAMENTO',
            lider_id: v.departamento.lider_id,
            funcoes: v.funcoes?.map((f: any) => f.funcao.nome) || [],
            pode_gerir_escalas: v.pode_gerir_escalas
        });
    });
    membro.departamentos_liderados?.forEach((d: any) => {
        if (departamentosAgrupados.has(`depto-${d.id}`)) {
            departamentosAgrupados.get(`depto-${d.id}`).funcoes.push('Líder');
        } else {
            departamentosAgrupados.set(`depto-${d.id}`, {
                id: d.id,
                nome: d.nome,
                tipo: 'DEPARTAMENTO',
                lider_id: d.lider_id,
                funcoes: ['Líder'],
                pode_gerir_escalas: false
            });
        }
    });

    // GRUPOS — com todos os dados para o ModalGestaoGrupo
    const gruposAgrupados = new Map();

    // Grupos onde é MEMBRO
    membro.grupos?.forEach((g: any) => {
        gruposAgrupados.set(`grupo-${g.id}`, {
            id: g.id,
            nome: g.nome,
            tipo: 'GRUPO',
            categoria: g.categoria ?? null,
            descricao: g.descricao ?? null,
            dia_semana: g.dia_semana,
            horario: g.horario,
            bairro: g.bairro,
            cidade: g.cidade,
            funcoes: ['Membro'],
            pode_gerir_escalas: false,
            // ✅ Dados completos para o modal
            membros: g.membros ?? [],
            lideres: g.lideres ?? [],
            encontros: g.encontros ?? [],
            isLider: false
        });
    });

    // Grupos onde é LÍDER
    membro.lider_de_grupo?.forEach((g: any) => {
        if (gruposAgrupados.has(`grupo-${g.id}`)) {
            const existente = gruposAgrupados.get(`grupo-${g.id}`);
            existente.funcoes = ['Líder'];
            existente.isLider = true;
            // Garante que os dados completos são atualizados
            existente.membros = g.membros ?? existente.membros;
            existente.lideres = g.lideres ?? existente.lideres;
            existente.encontros = g.encontros ?? existente.encontros;
        } else {
            gruposAgrupados.set(`grupo-${g.id}`, {
                id: g.id,
                nome: g.nome,
                tipo: 'GRUPO',
                categoria: g.categoria ?? null,
                descricao: g.descricao ?? null,
                dia_semana: g.dia_semana,
                horario: g.horario,
                bairro: g.bairro,
                cidade: g.cidade,
                funcoes: ['Líder'],
                pode_gerir_escalas: false,
                // ✅ Dados completos para o modal
                membros: g.membros ?? [],
                lideres: g.lideres ?? [],
                encontros: g.encontros ?? [],
                isLider: true
            });
        }
    });

    // Saudacao data
    const hojeInicio = new Date()
    hojeInicio.setHours(0, 0, 0, 0)
    const amanha = new Date(hojeInicio.getTime() + 24 * 60 * 60 * 1000)

    const escalaHoje = listaEscalas.find((e: any) => {
        const dataEvento = new Date(e.evento.data)
        return dataEvento >= hojeInicio && dataEvento < amanha
    })

    const proximoEvento = proximosEventos[0] || null

    // Pendentes
    const pendentes: any[] = []
    const escalasPendentes = listaEscalas.filter((e: any) => !e.confirmado && !e.motivo_recusa)
    if (escalasPendentes.length > 0) {
        pendentes.push({ tipo: 'escala', titulo: `${escalasPendentes.length} escala(s) pendente(s)`, descricao: 'Confirma ou recusa a tua participacao', cor: 'text-orange-500' })
    }
    if (!membro.gdpr_aceite) {
        pendentes.push({ tipo: 'gdpr', titulo: 'GDPR por aceitar', descricao: 'Aceita os termos de protecao de dados', link: '/membros/termos', cor: 'text-red-400' })
    }

    // Estatisticas
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const inicioAno = new Date(hoje.getFullYear(), 0, 1)
    const escalasEsteMes = listaEscalas.filter((e: any) => new Date(e.evento.data) >= inicioMes).length
    const contribuicaoAno = (minhasContribuicoes || []).filter((c: any) => new Date(c.data) >= inicioAno).reduce((s: number, c: any) => s + c.valor, 0)

    // Serializa dados para o componente mobile (client component precisa de dados plain)
    const escalasParaMobile = listaEscalas.map((esc: any) => ({
        id: esc.id,
        ids: esc.ids,
        funcoes: esc.funcoes,
        confirmado: esc.confirmado,
        motivo_recusa: esc.motivo_recusa ?? null,
        horario: esc.horario ?? null,
        evento: { id: esc.evento.id, nome: esc.evento.nome, data: esc.evento.data.toISOString() },
        departamento: { id: esc.departamento.id, nome: esc.departamento.nome },
    }))

    const membroParaMobile = {
        id: membro.id,
        first_name: membro.first_name,
        last_name: membro.last_name,
        avatar_file: membro.avatar_file,
        qr_code: membro.qr_code || null,
        congregacao: membro.congregacao ? { nome: membro.congregacao.nome } : null,
    }

    const departamentosParaMobile = Array.from(departamentosAgrupados.values())

    return (
        <>
        {/* MOBILE DASHBOARD */}
        <div className="md:hidden">
            <MobileDashboard
                membro={membroParaMobile}
                escalas={escalasParaMobile}
                departamentos={departamentosParaMobile}
                membroId={membro.id}
                role={role}
                proximosEventos={(proximosEventos || []).map((e: any) => ({ id: e.id, nome: e.nome, data: e.data.toISOString() }))}
                temEscalaCantina={listaEscalas.some((e: any) => {
                    const dataEvento = new Date(e.evento.data)
                    return dataEvento >= hojeInicio && dataEvento < amanha &&
                        e.departamento.nome.toLowerCase().includes('cantina')
                })}
                cursosAtivos={(cursosAtivosRaw || []).map((c: any) => ({
                    id: c.id,
                    titulo: c.titulo,
                    descricao: c.descricao,
                    categoria: c.categoria,
                    status: c.status,
                    data_inicio: c.data_inicio.toISOString(),
                    data_fim: c.data_fim.toISOString(),
                    vagas_maximas: c.vagas_maximas,
                    turmas: c.turmas?.map((t: any) => ({ _count: { matriculas: t._count?.matriculas || 0 } })),
                    _count: c._count,
                }))}
                meusInteresseIds={(meusInteressesRaw || []).map((i: any) => i.curso_id)}
                redesSociais={{
                    instagram: tenantSocial?.instagram_handle ? `https://instagram.com/${tenantSocial.instagram_handle}` : undefined,
                    youtube: tenantSocial?.youtube_channel_id ? `https://youtube.com/channel/${tenantSocial.youtube_channel_id}` : undefined,
                }}
            />
        </div>

        {/* DESKTOP DASHBOARD */}
        <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-6 pb-20 animate-in fade-in duration-700">

            {/* MODAL DE MÓDULO BLOQUEADO */}
            <Suspense fallback={null}>
                <ModuloBloqueado />
            </Suspense>

            {/* AVISOS CRÍTICOS */}
            {gdprPendente && (
                <section className="bg-bg2 border-2 border-orange-500/20 p-5 rounded-3xl flex justify-between items-center gap-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <FileSignature className="text-orange-500" size={24} />
                        <div>
                            <h3 className="text-sm font-black uppercase italic tracking-tighter text-fg">Assinaturas Pendentes</h3>
                            <p className="text-xs text-muted">Renova os teus termos obrigatórios.</p>
                        </div>
                    </div>
                    <Link href="/membros/termos" className="bg-orange-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600">
                        Assinar
                    </Link>
                </section>
            )}

            {/* CONTEÚDO DAS ABAS */}
            <div className="relative z-10">

                {/* ── ABA: GERAL ───────────────────────────────────────────── */}
                {currentTab === 'geral' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

                        {/* SAUDACAO + RESUMO */}
                        <SaudacaoDia
                            nome={membro.first_name}
                            proximoEvento={proximoEvento ? { nome: proximoEvento.nome, data: proximoEvento.data } : null}
                            escalaHoje={escalaHoje ? { departamento: escalaHoje.departamento.nome, funcao: '', hora_chegada: escalaHoje.horario } : null}
                        />

                        {/* ACOES RAPIDAS */}
                        <AcoesRapidas />

                        {/* PENDENTES */}
                        {/* PendentesAtencao removido — info ja visivel no banner GDPR e nos cards de escala */}

                        {/* GRID: Escalas + Agenda + Aniversarios lado a lado */}
                        <div className="grid lg:grid-cols-3 gap-6">

                        {/* ESCALAS — 2 colunas */}
                        <section className="lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-sm font-black uppercase tracking-widest text-fg flex items-center gap-2">
                                    <CalendarDays size={14} className="text-figueira" /> Minhas Escalas
                                </h2>
                                {(isAdmin(role) || membro.departamentos_liderados?.length > 0) && departamentoLouvorId && (
                                    <ModalHistoricoEscalas departamentoId={departamentoLouvorId} />
                                )}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                                {listaEscalas.length > 0 ? (
                                    listaEscalas.map((esc: any) => {
                                        const statusBadge = esc.motivo_recusa
                                            ? { label: 'Indisponivel', cor: 'bg-red-500/10 text-red-500 border-red-500/20' }
                                            : esc.confirmado
                                                ? { label: 'Confirmado', cor: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' }
                                                : { label: 'Pendente', cor: 'bg-orange-500/10 text-orange-600 border-orange-500/20' }

                                        return (
                                            <details key={esc.id} className={`bg-bg2 border rounded-2xl shadow-sm transition-all group/esc
                                                ${esc.confirmado ? 'border-emerald-500/20' : 'border-soft hover:border-figueira/30'}`}>

                                                {/* RESUMO COLAPSADO */}
                                                <summary className="flex items-center gap-3 p-4 cursor-pointer list-none select-none">
                                                    <div className={`p-2 rounded-xl text-center shrink-0 min-w-[44px] ${esc.confirmado ? 'bg-emerald-500 text-white' : 'bg-fg text-bg'}`}>
                                                        <span className="block text-[6px] font-black uppercase opacity-70">
                                                            {new Date(esc.evento.data).toLocaleDateString('pt-PT', { month: 'short' })}
                                                        </span>
                                                        <span className="text-lg block font-black italic leading-tight">
                                                            {new Date(esc.evento.data).toLocaleDateString('pt-PT', { day: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className="font-black uppercase italic text-fg text-[11px] truncate">{esc.evento.nome}</h5>
                                                        <span className="text-[8px] font-bold text-figueira uppercase tracking-widest">{esc.departamento.nome}</span>
                                                    </div>
                                                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border shrink-0 ${statusBadge.cor}`}>
                                                        {statusBadge.label}
                                                    </span>
                                                </summary>

                                                {/* CONTEÚDO EXPANDIDO */}
                                                <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-200 border-t border-soft mt-0 pt-3">
                                                    {/* FUNÇÃO E HORÁRIO */}
                                                    <div className="space-y-1.5">
                                                        {esc.funcoes?.filter(Boolean).length > 0 && (
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-figueira shrink-0" />
                                                                {esc.funcoes.join(' · ')}
                                                            </p>
                                                        )}
                                                        {esc.horario && (
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-muted flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                                                Chegar às {esc.horario}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* REPERTÓRIO (louvor) — líder vê tudo, membro só modo palco */}
                                                    {(esc.departamento.nome.toLowerCase().includes('louvor') || esc.departamento.nome.toLowerCase().includes('música')) && (
                                                        <>
                                                            {(isAdmin(role) || membro.departamentos_liderados?.some((d: any) => d.id === esc.departamento.id)) && (
                                                                <ModalRepertorio eventoId={esc.evento.id} repertorioInical={esc.evento.repertorio || []} podeEditar={true} />
                                                            )}
                                                            <BotaoSetlistPalco eventoId={esc.evento.id} totalMusicas={esc.evento.repertorio?.length || 0} />
                                                        </>
                                                    )}

                                                    {/* BOTÃO DETALHES */}
                                                    <ModalDetalhesEscala escala={esc} />

                                                    {/* BOTÕES DE CONFIRMAÇÃO */}
                                                    <BotoesEscala
                                                        escalaIds={esc.ids}
                                                        confirmado={esc.confirmado}
                                                        motivoRecusa={esc.motivo_recusa ?? null}
                                                    />
                                                </div>
                                            </details>
                                        )
                                    })
                                ) : (
                                    <AvisoEscalaVazia />
                                )}
                            </div>
                        </section>

                        {/* SIDEBAR: Agenda + Aniversarios — 1 coluna */}
                        <aside className="lg:col-span-1 space-y-4">
                            <details className="bg-bg2 border border-soft rounded-2xl shadow-sm">
                                <summary className="p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
                                    <h2 className="text-[10px] font-black uppercase tracking-widest text-fg flex items-center gap-2">
                                        <CalendarDays size={12} className="text-figueira" /> Agenda
                                    </h2>
                                    <span className="text-[8px] font-black text-muted">{proximosEventos.length}</span>
                                </summary>
                                <div className="px-4 pb-4">
                                    <WidgetAgendaUnificada
                                        eventosIgreja={proximosEventos}
                                        gruposMembro={membro.grupos || []}
                                        isAdmin={isAdmin(role)}
                                    />
                                </div>
                            </details>

                            <details className="bg-bg2 border border-soft rounded-2xl shadow-sm">
                                <summary className="p-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center justify-between">
                                    <h2 className="text-[10px] font-black uppercase tracking-widest text-fg flex items-center gap-2">
                                        <CalendarDays size={12} className="text-figueira" /> Aniversarios
                                    </h2>
                                    <span className="text-[8px] font-black text-muted">{aniversariantesMesFiltrados.length}</span>
                                </summary>
                                <div className="px-4 pb-4">
                                    <CardAniversariantesMes aniversariantes={aniversariantesMesFiltrados} />
                                    {aniversariantesMesFiltrados.length === 0 && (
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted text-center py-4">
                                            Sem aniversarios este mes
                                        </p>
                                    )}
                                </div>
                            </details>

                            <EstatisticasPessoais
                                escalasEsteMes={escalasEsteMes}
                                contribuicaoAno={contribuicaoAno}
                                membroDesde={membro.data_admissao || membro.created_at}
                                presencaGrupos={null}
                            />
                        </aside>

                        </div>{/* fecha grid 3 colunas */}

                        {/* MURAL — agrupado por canal, última mensagem de cada */}
                        {muralPorCanal.length > 0 && (
                            <section className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[10px] font-black uppercase tracking-widest text-fg flex items-center gap-2">
                                        <MessageSquare size={12} className="text-figueira" /> Mural
                                    </h2>
                                    <Link href="/membros/mural" className="text-[9px] font-black uppercase tracking-widest text-figueira hover:text-fg transition-colors flex items-center gap-1">
                                        Ver Tudo <ChevronRight size={10} />
                                    </Link>
                                </div>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {muralPorCanal.map((grupo) => (
                                        <Link key={grupo.canal} href="/membros/mural" className="bg-bg2 border border-soft rounded-2xl p-4 space-y-2 hover:border-figueira/30 transition-all group/mural">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-figueira">
                                                    {grupo.canal}
                                                </span>
                                                <span className="text-[8px] font-bold text-muted bg-soft px-2 py-0.5 rounded-lg">
                                                    {grupo.totalMensagens}
                                                </span>
                                            </div>
                                            <p className="text-xs text-fg font-bold leading-snug line-clamp-2">{grupo.ultima.texto}</p>
                                            <div className="flex items-center justify-between">
                                                {grupo.ultima.autorNome && (
                                                    <p className="text-[9px] text-muted">— {grupo.ultima.autorNome}</p>
                                                )}
                                                <span className="text-[8px] text-muted">{grupo.ultima.dataFormatada}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* REDES SOCIAIS — YouTube + Instagram */}
                        {(youtubeVideo || tenantSocial?.instagram_handle) && (
                            <div className={`grid gap-4 ${youtubeVideo && tenantSocial?.instagram_handle ? 'sm:grid-cols-2' : ''}`}>
                                {youtubeVideo && <WidgetYouTube {...youtubeVideo} />}
                                {tenantSocial?.instagram_handle && (
                                    <WidgetInstagram handle={tenantSocial.instagram_handle} />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── ABA: DEPARTAMENTOS ───────────────────────────────────── */}
                {currentTab === 'departamentos' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">

                        {/* DEPARTAMENTOS */}
                        <section className="space-y-6">
                            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg flex items-center gap-3">
                                <Users className="text-figueira" /> Onde Eu Sirvo
                            </h2>
                            {departamentosAgrupados.size > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Array.from(departamentosAgrupados.values()).map((depto: any) => (
                                        <CardDepartamentoMembro
                                            key={depto.id}
                                            depto={depto}
                                            membroId={membro?.id}
                                            role={role}
                                            podeGerirEscalas={depto.pode_gerir_escalas}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 border-2 border-dashed border-soft rounded-[2.5rem] text-center">
                                    <p className="text-xs font-black text-muted uppercase tracking-widest italic">
                                        Não pertences a departamentos no momento.
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* GRUPOS ✅ com ModalGestaoGrupo integrado */}
                        {gruposAgrupados.size > 0 && (
                            <section className="space-y-6">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg flex items-center gap-3">
                                    <Users className="text-blue-500" /> Meus Grupos
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {Array.from(gruposAgrupados.values()).map((grupo: any) => (
                                        <div key={grupo.id} className="bg-bg2 border border-soft p-6 rounded-2xl shadow-sm hover:border-blue-500/40 transition-all space-y-4">

                                            {/* CABEÇALHO */}
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                                    <Users size={20} className="text-blue-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-black uppercase italic tracking-tight text-fg leading-none truncate">
                                                        {grupo.nome}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {grupo.funcoes.map((f: string) => (
                                                            <span key={f} className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${f === 'Líder'
                                                                ? 'bg-figueira/10 text-figueira border-figueira/20'
                                                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                                                }`}>
                                                                {f}
                                                            </span>
                                                        ))}
                                                        {grupo.categoria && (
                                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border bg-soft text-muted border-soft">
                                                                {grupo.categoria}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DESCRIÇÃO */}
                                            {grupo.descricao && (
                                                <p className="text-[11px] text-muted leading-relaxed line-clamp-2 border-t border-soft pt-3">
                                                    {grupo.descricao}
                                                </p>
                                            )}

                                            {/* DETALHES */}
                                            <div className="grid grid-cols-2 gap-2 border-t border-soft pt-3">
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays size={12} className="text-blue-500 shrink-0" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted truncate">
                                                        {grupo.dia_semana}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} className="text-blue-500 shrink-0" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted truncate">
                                                        {grupo.horario}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 flex items-center gap-2">
                                                    <MapPin size={12} className="text-blue-500 shrink-0" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted truncate">
                                                        {grupo.bairro}, {grupo.cidade}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* ✅ MODAL DE GESTÃO DO GRUPO */}
                                            <div className="border-t border-soft pt-4">
                                                <ModalGestaoGrupo
                                                    grupo={{
                                                        id: grupo.id,
                                                        nome: grupo.nome,
                                                        dia_semana: grupo.dia_semana,
                                                        horario: grupo.horario,
                                                        bairro: grupo.bairro,
                                                        cidade: grupo.cidade,
                                                        categoria: grupo.categoria,
                                                        descricao: grupo.descricao,
                                                        membros: grupo.membros ?? [],
                                                        lideres: grupo.lideres ?? [],
                                                        encontros: grupo.encontros ?? [],
                                                    }}
                                                    membroId={membroId}
                                                    isLider={grupo.isLider || isAdmin(role)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* ACOMPANHAMENTOS */}
                        {permissoes.isAcolhimento && meusAcompanhamentos.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg flex items-center gap-3">
                                        <HeartHandshake className="text-emerald-500" /> Meus Acompanhamentos
                                    </h2>
                                    <Link href="/departamentos/acolhimento/dashboard"
                                        className="text-[10px] font-black uppercase bg-fg text-bg px-5 py-3 rounded-xl hover:bg-figueira transition-colors flex items-center justify-center gap-2 shadow-md w-full sm:w-auto">
                                        Painel Completo <ChevronRight size={14} />
                                    </Link>
                                </div>

                                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {meusAcompanhamentos.map((visitante: any) => {
                                        const ultimaData = visitante.acompanhamentos?.[0]?.data_contacto || visitante.data_ultima_visita
                                        const isAtrasado = ultimaData && new Date(ultimaData) < new Date(Date.now() - 24 * 60 * 60 * 1000)
                                        const statusCores: Record<string, string> = {
                                            NOVO: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                                            EM_CONTACTO: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                                            REUNIAO_PASTOR: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                        }
                                        const statusLabels: Record<string, string> = {
                                            NOVO: 'Novo', EM_CONTACTO: 'Contacto', REUNIAO_PASTOR: 'Pastor',
                                        }
                                        return (
                                        <div key={visitante.id} className={`bg-bg2 border rounded-2xl p-5 transition-all space-y-3 ${isAtrasado ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-soft hover:border-emerald-500/30'}`}>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isAtrasado ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                                                        <span className={`text-xs font-black uppercase ${isAtrasado ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {visitante.nome?.[0]}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xs font-black text-fg uppercase italic tracking-tight leading-none">
                                                            {visitante.nome}
                                                        </h3>
                                                        <a href={`tel:${visitante.telefone}`} className="text-[9px] text-muted font-bold uppercase tracking-widest mt-0.5 hover:text-fg transition-colors">
                                                            {visitante.telefone}
                                                        </a>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${statusCores[visitante.status] || 'bg-soft text-muted border-soft'}`}>
                                                        {statusLabels[visitante.status] || visitante.status}
                                                    </span>
                                                    {isAtrasado && (
                                                        <span className="text-[7px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse">+24h</span>
                                                    )}
                                                    {visitante.proximo_contacto && !isAtrasado && (
                                                        <span className="text-[7px] font-bold text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                            {new Date(visitante.proximo_contacto).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <FormAcompanhamentoRapido visitante={visitante} />
                                        </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {/* ── ABA: FINANCEIRO ──────────────────────────────────────── */}
                {currentTab === 'financeiro' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        <section className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-fg flex items-center gap-3">
                                    <Wallet2 className="text-figueira" /> Contribuições
                                </h2>
                                <ModalExtratoMembro membro={membro} />
                            </div>
                            <PainelFinanceiroMembro
                                objetivos={membro.objetivos_financeiros || []}
                                numerosRifa={minhasRifas}
                                contribuicoes={minhasContribuicoes}
                            />
                        </section>

                        <section className="bg-bg2 border border-soft p-8 rounded-[2.5rem] shadow-sm">
                            <h2 className="text-xl font-black uppercase italic tracking-tighter text-fg mb-6 flex items-center gap-3">
                                <Coffee className="text-orange-500" /> Cantina e Consumos
                            </h2>
                            <div className="grid lg:grid-cols-12 gap-8 items-start">
                                <div className="lg:col-span-4 flex flex-col gap-6">
                                    <CardSaldoLocal membroId={membro.id} />
                                    <QrCodeMembro membroId={membro.id} qrCode={membro.qr_code || null} />
                                    <CardLimiteFilhos />
                                </div>
                                <div className="lg:col-span-8 bg-bg border border-soft rounded-2xl p-6 shadow-inner relative overflow-hidden space-y-4">
                                    <ExtratoCantinaLocal membroId={membro.id} />
                                    <ConsumoFilhos />
                                </div>
                            </div>
                        </section>
                    </div>
                )}
            </div>

        </div>{/* fecha desktop dashboard */}
        </>
    )
}