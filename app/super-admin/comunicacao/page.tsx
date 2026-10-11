import prismaGlobal from '@/lib/prisma'
import { requireSAAuth } from '@/lib/sa-auth'
import FormEnviarAviso from '@/components/superadmin/FormEnviarAviso'
import { Megaphone } from 'lucide-react'

export default async function ComunicacaoPage() {
    await requireSAAuth()

    const igrejas = await prismaGlobal.tenant.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true },
    })

    const avisos = await prismaGlobal.avisoPlataforma.findMany({
        orderBy: { criado_em: 'desc' },
        take: 20,
    })

    const tipoBadge = (tipo: string) => {
        const colors: Record<string, string> = {
            INFO: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            ALERTA: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            MANUTENCAO: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            NOVIDADE: 'bg-green-500/20 text-green-400 border-green-500/30',
        }
        return colors[tipo] || colors.INFO
    }

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="border-b border-[#222] pb-6">
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                    <Megaphone size={32} className="text-blue-500" /> Comunicacao
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                    Enviar avisos para todas as igrejas ou para uma igreja especifica.
                </p>
            </div>

            {/* Form */}
            <FormEnviarAviso igrejas={igrejas} />

            {/* History */}
            <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#222]">
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-300">Historico de Avisos</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#222]">
                                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Titulo</th>
                                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Tipo</th>
                                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Destinatario</th>
                                <th className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {avisos.map((aviso) => (
                                <tr key={aviso.id} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition">
                                    <td className="px-6 py-4">
                                        <p className="text-white font-bold">{aviso.titulo}</p>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{aviso.mensagem}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${tipoBadge(aviso.tipo)}`}>
                                            {aviso.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">
                                        {aviso.tenant_id ? `Igreja #${aviso.tenant_id}` : 'Todas'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {new Date(aviso.criado_em).toLocaleDateString('pt-PT')}
                                    </td>
                                </tr>
                            ))}
                            {avisos.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-600 text-sm">
                                        Nenhum aviso enviado ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
    )
}
