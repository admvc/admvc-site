import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { ShieldCheck, Anchor, Fingerprint, CheckCircle2, FileText, Download, CalendarCheck } from 'lucide-react'
import { BotaoAssinarDocumento } from '@/components/membros/BotaoAssinar'

export default async function TermosPage() {
    const db = await getDb()
    const session = await getSessionData();
    if (!session) redirect('/membros/login');

    const membroId = session.membroId;

    // 1. Busca os novos campos de validade da Base de Dados
    const membro = await db.membro.findUnique({
        where: { id: membroId },
        select: {
            first_name: true,
            last_name: true,
            gdpr_aceite: true,
            gdpr_validade: true,
            permanecer_aceite: true,
            permanecer_validade: true
        }
    });

    if (!membro) redirect('/membros/login');

    // 2. Lógica para saber se os documentos estão pendentes ou expirados
    const hoje = new Date();
    const gdprPendente = !membro.gdpr_aceite || (membro.gdpr_validade && membro.gdpr_validade < hoje);
    const permanecerPendente = !membro.permanecer_aceite || (membro.permanecer_validade && membro.permanecer_validade < hoje);

    // Se ambos estiverem válidos, manda de volta para o Dashboard!
    if (!gdprPendente && !permanecerPendente) {
        redirect('/membros/dashboard');
    }

    return (
        <main className="max-w-4xl mx-auto py-16 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">

            <header className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-figueira/10 rounded-full text-figueira">
                    <ShieldCheck size={16} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Central de Assinaturas</span>
                </div>
                <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-fg leading-none">
                    Aceite <span className="text-muted">&</span> Compromisso
                </h1>
                <p className="text-xs font-bold text-muted uppercase tracking-widest max-w-lg mx-auto">
                    Analise e assine os documentos pendentes para regularizar o seu registo na igreja.
                </p>
            </header>

            <div className="grid gap-8 pb-20">

                {/* ========================================================= */}
                {/* BLOCO 1: DOCUMENTO PERMANECER                             */}
                {/* ========================================================= */}
                <section className={`border rounded-[3rem] p-8 md:p-12 shadow-sm relative overflow-hidden group transition-all ${permanecerPendente ? 'bg-bg border-soft' : 'bg-green-50/50 border-green-500/20'}`}>
                    <Anchor className={`absolute -right-6 -top-6 w-32 h-32 -rotate-12 transition-transform group-hover:rotate-0 duration-700 ${permanecerPendente ? 'text-figueira/5' : 'text-green-500/5'}`} />

                    <div className="relative space-y-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-soft pb-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${permanecerPendente ? 'bg-figueira text-white shadow-lg shadow-figueira/20' : 'bg-green-500 text-white shadow-lg shadow-green-500/20'}`}>
                                    {permanecerPendente ? <Anchor size={24} /> : <CheckCircle2 size={24} />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase italic text-fg leading-none tracking-tight">Termo Permanecer</h2>
                                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em] mt-1">Compromisso de Membresia</p>
                                </div>
                            </div>

                            {/* 👇 BOTÃO DE DOWNLOAD DO PDF AQUI */}
                            <a
                                href="/documentos/termo_permanecer.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-bg2 border border-soft text-muted hover:text-figueira hover:border-figueira rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shrink-0"
                            >
                                <FileText size={14} />
                                Ler Documento Completo
                                <Download size={12} className="ml-1 opacity-50" />
                            </a>
                        </div>

                        <div className="prose prose-sm text-muted font-medium leading-relaxed">
                            <p>O compromisso <strong>Permanecer</strong> representa a minha decisão voluntária de estar plantado nesta comunidade local. Ao aceitar, declaro que:</p>
                            <ul className="space-y-3 mt-4">
                                {[
                                    'Compreendo e partilho da visão e valores da igreja.',
                                    'Comprometo-me a servir conforme os dons e escalas estabelecidas.',
                                    'Submeto-me à mentoria e ao cuidado da liderança espiritual.',
                                    'Zelarei pela unidade e paz do corpo de membros.'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-[10px] font-bold uppercase text-fg leading-tight">
                                        <CheckCircle2 size={14} className={permanecerPendente ? 'text-figueira shrink-0' : 'text-green-500 shrink-0'} /> {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* ÁREA DE ASSINATURA */}
                        <div className="pt-6 border-t border-soft">
                            {permanecerPendente ? (
                                <BotaoAssinarDocumento membroId={membroId} tipo="PERMANECER" nomeDocumento="Termo Permanecer" />
                            ) : (
                                <div className="flex items-center justify-between bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                                    <div className="flex items-center gap-3">
                                        <CalendarCheck size={18} className="text-green-600" />
                                        <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Documento Válido e Assinado</span>
                                    </div>
                                    {membro.permanecer_validade && (
                                        <span className="text-[9px] font-bold text-green-600/70 uppercase tracking-widest">
                                            Válido até: {membro.permanecer_validade.toLocaleDateString('pt-PT')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ========================================================= */}
                {/* BLOCO 2: GDPR (DADOS PESSOAIS)                            */}
                {/* ========================================================= */}
                <section className={`border rounded-[3rem] p-8 md:p-12 shadow-sm relative overflow-hidden group transition-all ${gdprPendente ? 'bg-bg2 border-soft' : 'bg-green-50/50 border-green-500/20'}`}>
                    <Fingerprint className={`absolute -right-6 -top-6 w-32 h-32 rotate-12 transition-all ${gdprPendente ? 'text-muted/5' : 'text-green-500/5'}`} />

                    <div className="relative space-y-8">
                        <div className="flex items-center gap-4 border-b border-soft pb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${gdprPendente ? 'bg-fg text-bg shadow-lg' : 'bg-green-500 text-white shadow-lg shadow-green-500/20'}`}>
                                {gdprPendente ? <Fingerprint size={24} /> : <CheckCircle2 size={24} />}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic text-fg leading-none tracking-tight">Privacidade GDPR</h2>
                                <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em] mt-1">Tratamento de Dados</p>
                            </div>
                        </div>

                        <div className="prose prose-sm text-muted font-medium leading-relaxed">
                            <p>De acordo com o Regulamento Geral sobre a Proteção de Dados (GDPR), autorizo o tratamento dos meus dados para:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div className="p-4 bg-bg rounded-2xl border border-soft text-[9px] font-black uppercase tracking-widest text-muted">
                                    <span className="text-fg block mb-1">Gestão Interna</span>
                                    Cadastro, escalas e aniversários.
                                </div>
                                <div className="p-4 bg-bg rounded-2xl border border-soft text-[9px] font-black uppercase tracking-widest text-muted">
                                    <span className="text-fg block mb-1">Comunicação</span>
                                    Envio de avisos via WhatsApp e E-mail.
                                </div>
                            </div>
                        </div>

                        {/* ÁREA DE ASSINATURA */}
                        <div className="pt-6 border-t border-soft">
                            {gdprPendente ? (
                                <BotaoAssinarDocumento membroId={membroId} tipo="GDPR" nomeDocumento="Acordo GDPR" />
                            ) : (
                                <div className="flex items-center justify-between bg-green-500/10 p-4 rounded-2xl border border-green-500/20">
                                    <div className="flex items-center gap-3">
                                        <CalendarCheck size={18} className="text-green-600" />
                                        <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Documento Válido e Assinado</span>
                                    </div>
                                    {membro.gdpr_validade && (
                                        <span className="text-[9px] font-bold text-green-600/70 uppercase tracking-widest">
                                            Válido até: {membro.gdpr_validade.toLocaleDateString('pt-PT')}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <p className="text-[8px] text-center text-muted uppercase font-black tracking-[0.3em]">
                    Identificador Digital Único: MEMB_AUTH_{membroId}
                </p>
            </div>
        </main>
    )
}