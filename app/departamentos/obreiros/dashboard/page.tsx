import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { getObreirosRole, podeGerirObreiros } from '@/lib/obreiros-permissions'
import {
    Users, Calendar, BarChart3, MessageCircle, ChevronRight,
    Shield, ArrowLeft, Phone,
} from 'lucide-react'
import SeccaoColapsavel from '@/components/acolhimento/SeccaoColapsavel'

const TERMOS_DIACONIA = ['diaconia', 'diácono', 'diacono', 'obreiro']

export const dynamic = 'force-dynamic'

export default async function ObreirosDashboard() {
    const session = await getSessionData()
    if (!session) redirect('/membros/login')

    const db = getTenantClient(session.tenantId)

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
        redirect(`/membros/dashboard?error=${encodeURIComponent('Acesso restrito.')}`)
    }

    const isLiderOuAdmin = podeGerirObreiros(obreirosRole)

    const deptos = await db.departamento.findMany({ select: { id: true, nome: true } })
    const depto = deptos.find((d: any) => TERMOS_DIACONIA.some(t => d.nome.toLowerCase().includes(t)))
    if (!depto) {
        return (
            <div className="app-novo min-h-screen flex items-center justify-center px-4">
                <div className="text-center space-y-2">
                    <Shield size={32} className="mx-auto a-suave" />
                    <p className="text-[15px] font-semibold a-suave">Ministério de Diaconia não encontrado</p>
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
        <div className="app-novo min-h-screen pb-28">
            <main className="mx-auto max-w-3xl px-4 pt-20 pb-28 md:pt-8 space-y-5">
                <Link href="/membros/dashboard" className="a-foco inline-flex min-h-[44px] items-center gap-2 text-[16px] font-semibold" style={{ color: 'var(--a-destaque)' }}>
                    <ArrowLeft size={20} aria-hidden /> Início
                </Link>

                <header>
                    <h1 className="text-[24px] font-bold leading-tight">Obreiros</h1>
                    <p className="text-[16px] a-suave">Ministério de Diaconia</p>
                </header>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { icone: Users, valor: obreiros.length, label: 'Obreiros', cor: 'var(--a-destaque)' },
                        { icone: Calendar, valor: escalasEsteMes.length, label: 'Serviços', cor: 'var(--a-info)' },
                        { icone: Shield, valor: `${taxaPresenca}%`, label: 'Presença', cor: 'var(--a-ok)' },
                    ].map(({ icone: Ic, valor, label, cor }) => (
                        <div key={label} className="a-card flex flex-col items-center gap-1 p-4 text-center">
                            <Ic size={20} style={{ color: cor }} />
                            <span className="text-[22px] font-bold">{valor}</span>
                            <span className="text-[13px] font-semibold a-suave">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Ações */}
                {isLiderOuAdmin && (
                    <div className="grid grid-cols-2 gap-3">
                        <Link href={`/escalas?equipa=${depto.id}`}
                            className="a-botao a-botao-principal justify-center gap-2">
                            <Calendar size={18} /> Escalar
                        </Link>
                        <Link href="/departamentos/obreiros/relatorio"
                            className="a-botao a-botao-secundario justify-center gap-2">
                            <BarChart3 size={18} /> Relatório
                        </Link>
                    </div>
                )}

                {/* Próximo Evento */}
                {eventoFormatado && (
                    <SeccaoColapsavel
                        titulo="Próximo Evento"
                        icon={<Calendar size={16} style={{ color: 'var(--a-info)' }} />}
                        badge={
                            <span className="rounded-lg px-2 py-0.5 text-[13px] font-semibold"
                                style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                                {eventoFormatado.data}
                            </span>
                        }
                        defaultOpen
                    >
                        <div className="px-5 py-4 space-y-3">
                            <div>
                                <h3 className="text-[15px] font-bold">{eventoFormatado.nome}</h3>
                                <p className="text-[14px] a-suave mt-0.5">
                                    {eventoFormatado.escalados} escalados · {eventoFormatado.confirmados} confirmados
                                </p>
                            </div>
                            <div className="space-y-1">
                                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--a-borda)' }}>
                                    <div className="h-full rounded-full" style={{
                                        background: 'var(--a-destaque)',
                                        width: `${obreiros.length > 0 ? Math.round((eventoFormatado.escalados / obreiros.length) * 100) : 0}%`,
                                    }} />
                                </div>
                                <p className="text-[13px] font-semibold a-suave text-right">
                                    {eventoFormatado.escalados}/{obreiros.length} obreiros escalados
                                </p>
                            </div>
                            {isLiderOuAdmin && (
                                <Link href={`/escalas?equipa=${depto.id}`}
                                    className="a-foco flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] text-[15px] font-semibold"
                                    style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                                    Gerir Escalas <ChevronRight size={14} />
                                </Link>
                            )}
                        </div>
                    </SeccaoColapsavel>
                )}

                {/* Lista de Obreiros */}
                <SeccaoColapsavel
                    titulo="Obreiros"
                    icon={<Users size={16} style={{ color: 'var(--a-destaque)' }} />}
                    badge={
                        <span className="rounded-lg px-2 py-0.5 text-[13px] font-semibold"
                            style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                            {obreiros.length}
                        </span>
                    }
                    defaultOpen
                >
                    <div className="a-divide">
                        {obreiros.length > 0 ? obreiros.map((obr: any) => (
                            <div key={obr.id} className="flex items-center gap-3 px-5 py-3.5">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
                                    style={{ background: 'var(--a-destaque)', color: 'var(--a-sobre-destaque)' }}>
                                    {obr.iniciais}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-semibold">{obr.nome}</p>
                                    {obr.funcoes.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {obr.funcoes.map((f: string) => (
                                                <span key={f} className="rounded-md px-1.5 py-0.5 text-[13px] font-semibold a-suave"
                                                    style={{ background: 'var(--a-borda)' }}>
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`rounded-lg px-2 py-1 text-[13px] font-semibold ${obr.servicosEsteMes > 0 ? '' : 'a-suave'}`}
                                        style={obr.servicosEsteMes > 0
                                            ? { background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }
                                            : { background: 'var(--a-borda)' }}>
                                        {obr.servicosEsteMes}x
                                    </span>

                                    {obr.telefone && (
                                        <a href={`https://wa.me/${obr.telefone.replace(/\D/g, '')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="a-foco flex h-10 w-10 items-center justify-center rounded-[12px]"
                                            style={{ background: 'rgba(34,197,94,.1)', color: 'rgb(34,197,94)' }}>
                                            <MessageCircle size={18} />
                                        </a>
                                    )}
                                    {obr.telefone && (
                                        <a href={`tel:${obr.telefone}`}
                                            className="a-foco flex h-10 w-10 items-center justify-center rounded-[12px]"
                                            style={{ background: 'var(--a-destaque-suave)', color: 'var(--a-destaque)' }}>
                                            <Phone size={18} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-8 px-5">
                                <Users size={28} className="mx-auto a-suave mb-2" style={{ opacity: .3 }} />
                                <p className="text-[15px] font-semibold a-suave">Nenhum obreiro registado</p>
                            </div>
                        )}
                    </div>
                </SeccaoColapsavel>
            </main>
        </div>
    )
}
