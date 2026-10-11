// app/admin/membros/cadastro/confirmacao/page.tsx
import { getDb } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import BotaoImprimir from "@/components/BotaoImprimir";
import QrCodeMembro from "@/components/cantina/QrCodeMembro";

interface ConfirmacaoPageProps {
    searchParams: { id?: string }
}

export default async function PaginaConfirmacao({ searchParams }: ConfirmacaoPageProps) {
    const db = await getDb()
    const idParam = searchParams.id
    const membroId = idParam ? parseInt(idParam) : null

    if (!membroId) return notFound()

    const membro = await db.membro.findUnique({
        where: { id: membroId },
    })

    if (!membro) return notFound()

    return (
        <main className="max-w-4xl mx-auto py-16 px-6 space-y-12 animate-in fade-in duration-700">

            {/* 1. HEADER DE SUCESSO ESTILIZADO */}
            <header className="relative overflow-hidden bg-fg text-bg rounded-[3rem] p-12 shadow-2xl border border-white/10">
                {/* Detalhe Decorativo de Fundo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-figueira/20 blur-[100px] -mr-32 -mt-32 rounded-full" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                    <div className="w-24 h-24 rounded-full bg-figueira flex items-center justify-center shadow-lg border-4 border-white/20">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <span className="text-figueira font-black text-[10px] uppercase tracking-[0.4em]">Processo Concluído</span>
                        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mt-2">
                            Cadastro <br /> Confirmado
                        </h1>
                        <p className="text-white/60 mt-4 font-medium max-w-md">
                            O registro de <span className="text-white font-bold">{membro.first_name} {membro.last_name}</span> foi processado e indexado com sucesso.
                        </p>
                    </div>
                </div>
            </header>

            {/* QR CODE DO MEMBRO */}
            <div className="flex justify-center">
                <div className="w-64">
                    <QrCodeMembro membroId={membro.id} qrCode={membro.qr_code || null} />
                </div>
            </div>

            {/* 2. RELATÓRIO TÉCNICO (GRID) */}
            <section className="space-y-6">
                <div className="flex justify-between items-end border-b border-soft pb-4">
                    <h2 className="text-sm font-black uppercase italic tracking-widest text-fg">Detalhes do Registro</h2>
                    <span className="text-[10px] font-bold text-muted uppercase tracking-tighter">ID INTERNO: #{membro.id}</span>
                </div>

                <div className="grid md:grid-cols-3 gap-8 bg-bg2 border border-soft rounded-[3rem] p-10 shadow-sm relative">

                    {/* INFO FOTO (SE HOUVER) */}
                    <div className="flex flex-col items-center justify-start space-y-4 border-r border-soft/50 pr-4">
                        <div className="w-32 h-32 rounded-full bg-soft overflow-hidden border-4 border-white shadow-md">
                            {membro.avatar_file ? (
                                <img src={membro.avatar_file} alt="Foto" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">👤</div>
                            )}
                        </div>
                        <div className="text-center">
                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${membro.status === 'ATIVO' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {membro.status}
                            </span>
                        </div>
                    </div>

                    {/* DADOS PESSOAIS */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-x-8 gap-y-6">
                        <DataInfo label="Nome Completo" value={`${membro.first_name} ${membro.last_name}`} />
                        <DataInfo label="E-mail de Acesso" value={membro.email} />
                        <DataInfo label="Contacto" value={membro.phone_1} />
                        <DataInfo label="Género" value={membro.gender} />
                        <DataInfo label="Morada / Cidade" value={`${membro.address_1 || ''}, ${membro.id_city || ''}`} />
                        <DataInfo label="Data do Sistema" value={new Date(membro.created_at).toLocaleDateString('pt-PT')} />
                    </div>
                </div>
            </section>

            {/* 3. RODAPÉ DE AÇÕES */}
            <footer className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Link
                    href="/admin/membros"
                    className="flex items-center justify-center gap-3 px-8 py-5 bg-fg text-bg rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] transition-all shadow-xl"
                >
                    📁 Aceder à Listagem Geral
                </Link>
                <Link
                    href="/admin/membros/cadastro"
                    className="flex items-center justify-center gap-3 px-8 py-5 bg-soft text-fg rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-soft/80 transition-all"
                >
                    ➕ Realizar Novo Cadastro
                </Link>

                <BotaoImprimir />

            </footer>
        </main>
    )
}

// Sub-componente para exibição limpa
function DataInfo({ label, value }: { label: string, value: string | null | undefined }) {
    return (
        <div className="space-y-1">
            <p className="text-[9px] font-black text-muted uppercase tracking-[0.15em]">{label}</p>
            <p className="text-sm font-bold text-fg tracking-tight">{value || 'Não informado'}</p>
        </div>
    )
}