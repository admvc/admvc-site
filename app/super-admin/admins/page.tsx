import prismaGlobal from '@/lib/prisma'
import { requireSAAuth } from '@/lib/sa-auth'
import FormNovoSA from '@/components/superadmin/FormNovoSA'
import BotaoToggleSA from '@/components/superadmin/BotaoToggleSA'
import AdminRoleSelect from '@/components/superadmin/AdminRoleSelect'
import BotaoEliminarSA from '@/components/superadmin/BotaoEliminarSA'
import { ShieldCheck } from 'lucide-react'

export default async function AdminsPage() {
    const session = await requireSAAuth()

    const admins = await prismaGlobal.superAdmin.findMany({
        orderBy: { criado_em: 'desc' },
        include: {
            _count: { select: { logs: true } }
        }
    })

    const roleBadge = (role: string) => {
        const colors: Record<string, string> = {
            ADMIN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            VIEWER: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
            SUPPORT: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        }
        return colors[role] || colors.VIEWER
    }

    return (
        <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="border-b border-[#222] pb-6">
                <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-white flex items-center gap-3">
                    <ShieldCheck size={32} className="text-blue-500" /> Gestao de Administradores
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                    Gerir contas de Super Admin da plataforma.
                </p>
            </div>

            {/* Tabela */}
            <div className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#222]">
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Nome</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Email</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Role</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Estado</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Actividade</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Acoes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {admins.map((sa) => (
                                <tr key={sa.id} className="border-b border-[#1A1A1A] hover:bg-[#1A1A1A] transition">
                                    <td className="px-6 py-4 text-white font-bold">{sa.nome}</td>
                                    <td className="px-6 py-4 text-gray-400 text-xs">{sa.email}</td>
                                    <td className="px-6 py-4">
                                        <AdminRoleSelect saId={sa.id} currentRole={sa.role} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                                            sa.is_active
                                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                : 'bg-red-500/20 text-red-400 border-red-500/30'
                                        }`}>
                                            {sa.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] text-zinc-400">{sa._count.logs} acoes</p>
                                            <p className="text-[9px] text-zinc-600">
                                                Criado {new Date(sa.criado_em).toLocaleDateString('pt-PT')}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <BotaoToggleSA saId={sa.id} isActive={sa.is_active} />
                                            {sa.id !== session.saId && (
                                                <BotaoEliminarSA saId={sa.id} nome={sa.nome} />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {admins.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-600 text-sm">
                                        Nenhum administrador encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Form Novo SA */}
            <FormNovoSA />
        </main>
    )
}
