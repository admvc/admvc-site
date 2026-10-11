import { getDb } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import Image from 'next/image'
import Link from 'next/link'
import { Phone, Mail, ArrowLeft, UserPlus } from 'lucide-react'

export default async function EquipaDepartamento({ params }: { params: { id: string } }) {
    const db = await getDb()
    const { id } = await params;
    const deptoId = parseInt(id);
    const session = await getSessionData();

    if (!session) redirect('/membros/login');
    const { membroId, role } = session;

    // 1. Busca o Departamento e seus Integrantes
    const depto = await db.departamento.findUnique({
        where: { id: deptoId },
        include: {
            integrantes: {
                include: {
                    membro: {
                        select: {
                            id: true, first_name: true, last_name: true,
                            avatar_file: true, email: true, phone_1: true,
                        }
                    },
                    funcoes: {
                        include: { funcao: true }
                    }
                },
                orderBy: { membro: { first_name: 'asc' } }
            }
        }
    });

    // 2. Segurança: Verifica se é o Líder ou Admin
    const vinculoLider = await db.integranteDepartamento.findFirst({
        where: {
            membro_id: membroId,
            departamento_id: deptoId,
            OR: [
                { pode_gerir_escalas: true },
                {
                    funcoes: {
                        some: {
                            funcao: {
                                nome: { contains: 'Lider', mode: 'insensitive' }
                            }
                        }
                    }
                }
            ]
        }
    });

    const eAdmin = isAdmin(role);
    const eLiderModel = depto?.lider_id === membroId;

    if (!vinculoLider && !eAdmin && !eLiderModel) {
        redirect('/membros/dashboard?error=Acesso negado');
    }

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10">
            {/* HEADER */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <Link href="/membros/dashboard" className="flex items-center gap-2 text-[10px] font-black uppercase text-muted hover:text-figueira transition-all">
                        <ArrowLeft size={12} /> Voltar ao Painel
                    </Link>
                    <h1 className="text-4xl font-black italic uppercase text-fg tracking-tighter leading-none">
                        Equipa: <span className="text-figueira">{depto?.nome}</span>
                    </h1>
                    <p className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                        {depto?.integrantes.length} Membros Ativos no Setor
                    </p>
                </div>

                {/* Botão para o Admin adicionar mais gente (opcional) */}
                {eAdmin && (
                    <Link href={`/admin/departamentos/editar/${deptoId}`} className="bg-soft hover:bg-fg hover:text-bg text-fg px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2">
                        <UserPlus size={14} /> Gerir Integrantes
                    </Link>
                )}
            </header>

            {/* LISTAGEM DE MEMBROS */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {depto?.integrantes.map((item) => (
                    <div key={item.id} className="bg-bg2 border border-soft p-6 rounded-[2.5rem] flex items-center gap-5 group hover:border-figueira/40 transition-all shadow-sm">
                        {/* Avatar */}
                        <div className="relative w-16 h-16 shrink-0">
                            {item.membro.avatar_file ? (
                                <Image
                                    src={item.membro.avatar_file}
                                    alt={item.membro.first_name}
                                    fill
                                    className="rounded-2xl object-cover border-2 border-white shadow-md"
                                />
                            ) : (
                                <div className="w-full h-full rounded-2xl bg-soft text-muted flex items-center justify-center font-black text-xl">
                                    {item.membro.first_name[0]}
                                </div>
                            )}
                        </div>

                        {/* Info do Membro */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black text-sm uppercase text-fg truncate">
                                {item.membro.first_name} {item.membro.last_name}
                            </h4>
                            <span className="text-[9px] font-black text-figueira uppercase tracking-widest block mb-2 italic">
                                {item.funcoes?.map((f: any) => f.funcao?.nome).join(', ') || 'Membro'}
                            </span>

                            {/* Contactos Rápidos */}
                            <div className="flex gap-2">
                                {item.membro.phone_1 && (
                                    <a
                                        href={`https://wa.me/${item.membro.phone_1.replace(/\D/g, '')}`}
                                        target="_blank"
                                        className="p-2 bg-bg border border-soft rounded-lg text-muted hover:text-green-500 hover:border-green-200 transition-all"
                                        title="WhatsApp"
                                    >
                                        <Phone size={12} />
                                    </a>
                                )}
                                <a
                                    href={`mailto:${item.membro.email}`}
                                    className="p-2 bg-bg border border-soft rounded-lg text-muted hover:text-figueira hover:border-figueira/20 transition-all"
                                    title="E-mail"
                                >
                                    <Mail size={12} />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            {depto?.integrantes.length === 0 && (
                <div className="py-20 border-2 border-dashed border-soft rounded-[3rem] text-center">
                    <p className="text-xs font-bold text-muted uppercase tracking-widest italic">Ainda não existem membros vinculados a este departamento.</p>
                </div>
            )}
        </main>
    );
}