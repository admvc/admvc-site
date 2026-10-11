import { getDb } from '@/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { getObreirosRole, podeGerirObreiros, type ObreirosRole } from '@/lib/obreiros-permissions'
import {
    Users, Calendar, BarChart3, MessageCircle, ChevronRight,
    Shield, ArrowLeft, Phone
} from 'lucide-react'
import SeccaoColapsavel from '@/components/acolhimento/SeccaoColapsavel'

const TERMOS_DIACONIA = ['diaconia', 'diácono', 'diacono', 'obreiro']

export default async function ObreirosDashboard() {
    const db = await getDb()
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const membroLogado = await db.membro.findUnique({
        where: { id: session.membroId },
        include: {
            ministerios: { include: { departamento: true } },
            departamentos_liderados: true,
        },
    })
    if (!membroLogado) redirect('/membros/login')

    const obreirosRole = getObreirosRole(membroLogado, session.role)
    if (obreirosRole === 'NONE') {
        redirect('/membros/dashboard?error=Acesso restrito.')
    }

    const isLiderOuAdmin = podeGerirObreiros(obreirosRole)

    // Encontrar departamento da Diaconia
    const deptos = await db.departamento.findMany({ select: { id: true, nome: true } })
    const depto = deptos.find((d: any) => TERMOS_DIACONIA.some(t => d.nome.toLowerCase().includes(t)))
    if (!depto) {
        return (
            <div className="flex items-center justify-center min-h-screen px-4">
                <div className="text-center space-y-2">
                    <Shield size={32} className="mx-auto text-muted/30" />
                    <p className="text-sm font-black uppercase text-muted">Departamento de Diaconia nao encontrado</p>
                </div>
            </div>
        )
    }

    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1)

    const [integrantes, escalasEsteMes, totalEscalasMes, proximoEvento] = await Promise.all([
        db.integranteDepartamento.findMany({
            where: { departamento_id: depto.id },
            include: {
                membro: {
                    select: { id: true, first_name: true, last_name: true, phone_1: true, avatar_file: true },
                },
                funcoes: {
                    include: { funcao: { select: { id: true, nome: true } } },
                },
            },
        }),
        db.escala.findMany({
            where: {
                departamento_id: depto.id,
                confirmado: true,
                evento: { data: { gte: inicioMes } },
            },
            select: { membro_id: true },
        }),
        db.escala.count({
            where: {
                departamento_id: depto.id,
                evento: { data: { gte: inicioMes } },
            },
        }),
        db.evento.findFirst({
            where: {
                data: { gte: agora },
                tipo: { in: ['CULTO_REGULAR', 'CULTO_ESPECIAL'] },
            },
            orderBy: { data: 'asc' },
            include: {
                escalas: {
                    where: { departamento_id: depto.id },
                    select: { membro_id: true, confirmado: true },
                },
            },
        }),
    ])

    // Contagem de servicos por membro
    const servicosPorMembro: Record<number, number> = {}
    for (const e of escalasEsteMes) {
        servicosPorMembro[e.membro_id] = (servicosPorMembro[e.membro_id] || 0) + 1
    }

    const obreiros = integrantes
        .map((i: any) => ({
            id: i.id,
            membroId: i.membro.id,
            nome: `${i.membro.first_name} ${i.membro.last_name || ''}`.trim(),
            iniciais: `${i.membro.first_name?.[0] || ''}${i.membro.last_name?.[0] || ''}`,
            telefone: i.membro.phone_1 || null,
            avatar: i.membro.avatar_file || null,
            funcoes: i.funcoes.map((f: any) => f.funcao.nome),
            servicosEsteMes: servicosPorMembro[i.membro.id] || 0,
        }))
        .sort((a: any, b: any) => b.servicosEsteMes - a.servicosEsteMes)

    const taxaPresenca = totalEscalasMes > 0
        ? Math.round((escalasEsteMes.length / totalEscalasMes) * 100)
        : 0

    const eventoFormatado = proximoEvento
        ? {
            nome: proximoEvento.nome,
            data: new Date(proximoEvento.data).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'short' }),
            escalados: proximoEvento.escalas.length,
            confirmados: proximoEvento.escalas.filter((e: any) => e.confirmado).length,
        }
        : null

    return (
        <div className="min-h-screen bg-bg pb-28">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-bg2 border-b border-soft px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/membros/dashboard" className="w-9 h-9 flex items-center justify-center bg-soft rounded-xl text-muted hover:text-fg transition-all">
                            <ArrowLeft size={16} />
                        </Link>
                        <div>
                            <h1 className="text-base font-black uppercase italic tracking-tighter text-fg">Obreiros</h1>
                            <p className="text-[7px] font-black uppercase tracking-widest text-figueira">Ministerio de Diaconia</p>
                        </div>
                    </div>
                    {isLiderOuAdmin && (
                        <Link href="/departamentos/obreiros/relatorio" className="w-9 h-9 flex items-center justify-center bg-figueira/10 text-figueira rounded-xl hover:bg-figueira hover:text-white transition-all">
                            <BarChart3 size={16} />
                        </Link>
                    )}
                </div>
            </div>

            <div className="px-4 pt-5 space-y-5">
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-bg2 border border-soft rounded-2xl p-4 flex flex-col items-center gap-1 min-h-[72px]">
                        <Users size={20} className="text-figueira" />
                        <span className="text-xl font-black text-fg">{obreiros.length}</span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted">Obreiros</span>
                    </div>
                    <div className="bg-bg2 border border-soft rounded-2xl p-4 flex flex-col items-center gap-1 min-h-[72px]">
                        <Calendar size={20} className="text-blue-400" />
                        <span className="text-xl font-black text-fg">{escalasEsteMes.length}</span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted">Servicos</span>
                    </div>
                    <div className="bg-bg2 border border-soft rounded-2xl p-4 flex flex-col items-center gap-1 min-h-[72px]">
                        <Shield size={20} className="text-emerald-500" />
                        <span className="text-xl font-black text-fg">{taxaPresenca}%</span>
                        <span className="text-[7px] font-black uppercase tracking-widest text-muted">Presenca</span>
                    </div>
                </div>

                {/* Botoes de acao */}
                {isLiderOuAdmin && (
                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            href={`/escalas/gestao/${depto.id}`}
                            className="h-14 flex items-center justify-center gap-2 bg-figueira text-white rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                            <Calendar size={18} />
                            Escalar
                        </Link>
                        <Link
                            href="/departamentos/obreiros/relatorio"
                            className="h-14 flex items-center justify-center gap-2 bg-bg2 border border-soft text-fg rounded-2xl text-sm font-black uppercase tracking-widest active:scale-95 transition-all hover:border-figueira/30"
                        >
                            <BarChart3 size={18} />
                            Relatorio
                        </Link>
                    </div>
                )}

                {/* Proximo Evento */}
                {eventoFormatado && (
                    <SeccaoColapsavel
                        titulo="Proximo Evento"
                        icon={<Calendar size={16} className="text-blue-400" />}
                        badge={
                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {eventoFormatado.data}
                            </span>
                        }
                        defaultOpen
                    >
                        <div className="px-5 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-black uppercase italic text-fg">{eventoFormatado.nome}</h3>
                                    <p className="text-xs text-muted font-bold mt-0.5">
                                        {eventoFormatado.escalados} escalados · {eventoFormatado.confirmados} confirmados
                                    </p>
                                </div>
                            </div>
                            {/* Barra de progresso */}
                            <div className="space-y-1">
                                <div className="h-2 bg-soft rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-figueira rounded-full transition-all"
                                        style={{ width: `${obreiros.length > 0 ? Math.round((eventoFormatado.escalados / obreiros.length) * 100) : 0}%` }}
                                    />
                                </div>
                                <p className="text-[8px] font-bold text-muted text-right">
                                    {eventoFormatado.escalados}/{obreiros.length} obreiros escalados
                                </p>
                            </div>
                            {isLiderOuAdmin && (
                                <Link
                                    href={`/escalas/gestao/${depto.id}`}
                                    className="flex items-center justify-center gap-2 w-full h-12 bg-figueira/10 text-figueira rounded-xl text-xs font-black uppercase tracking-widest hover:bg-figueira hover:text-white transition-all active:scale-95"
                                >
                                    Gerir Escalas <ChevronRight size={14} />
                                </Link>
                            )}
                        </div>
                    </SeccaoColapsavel>
                )}

                {/* Lista de Obreiros */}
                <SeccaoColapsavel
                    titulo="Obreiros"
                    icon={<Users size={16} className="text-figueira" />}
                    badge={
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-figueira/10 text-figueira">
                            {obreiros.length}
                        </span>
                    }
                    defaultOpen
                >
                    <div className="divide-y divide-soft">
                        {obreiros.length > 0 ? obreiros.map((obr: any) => (
                            <div key={obr.id} className="flex items-center gap-3 px-5 py-3.5">
                                {/* Avatar */}
                                <div className="w-11 h-11 flex items-center justify-center rounded-full bg-figueira text-white text-xs font-black shrink-0">
                                    {obr.iniciais}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black uppercase italic text-fg truncate">{obr.nome}</p>
                                    {obr.funcoes.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {obr.funcoes.map((f: string) => (
                                                <span key={f} className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-soft text-muted">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Servicos badge */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${obr.servicosEsteMes > 0 ? 'bg-figueira/10 text-figueira' : 'bg-soft text-muted'}`}>
                                        {obr.servicosEsteMes}x
                                    </span>

                                    {/* WhatsApp */}
                                    {obr.telefone && (
                                        <a
                                            href={`https://wa.me/${obr.telefone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-11 h-11 flex items-center justify-center bg-green-500/10 text-green-500 rounded-xl hover:bg-green-500 hover:text-white transition-all active:scale-95"
                                        >
                                            <MessageCircle size={18} />
                                        </a>
                                    )}
                                    {obr.telefone && (
                                        <a
                                            href={`tel:${obr.telefone}`}
                                            className="w-11 h-11 flex items-center justify-center bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all active:scale-95"
                                        >
                                            <Phone size={18} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 px-5">
                                <Users size={28} className="mx-auto text-muted/20 mb-2" />
                                <p className="text-xs font-black uppercase tracking-widest text-muted">Nenhum obreiro registado</p>
                            </div>
                        )}
                    </div>
                </SeccaoColapsavel>
            </div>
        </div>
    )
}
