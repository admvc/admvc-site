// /inscricoes/novo — criar um evento com inscrição (admins e líderes de grupos/departamentos).
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { organizadoresPossiveis } from '@/lib/inscricoes-acesso'
import FormEvento from '../FormEvento'
import { ArrowLeft } from 'lucide-react'

export default async function NovoEventoPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login?volta=/inscricoes/novo')
    const organizadores = await organizadoresPossiveis(sessao)
    if (organizadores.length === 0) notFound()

    return (
        <main className="app-novo max-w-2xl mx-auto px-4 pt-20 md:pt-8 pb-24 space-y-5">
            <Link href="/inscricoes" className="inline-flex items-center gap-1 text-[15px] a-suave"><ArrowLeft size={16} aria-hidden /> Inscrições</Link>
            <h1 className="text-[28px] font-bold">Novo evento com inscrição</h1>
            <p className="text-[15px] a-suave">Fica em rascunho até mudar o estado para "Abertas": antes disso, só a organização vê a página.</p>
            <FormEvento id={null} slug={null} organizadores={organizadores} valores={{
                titulo: '', subtitulo: '', descricao: '', local: '', data: '', hora: '', ate_data: '', ate_hora: '',
                preco: '', pagamento: '', precisa_confirmacao: true, aberto_visitantes: true, campos: '',
                cor_principal: '#3F6B4F', cor_fundo: '#F5F1EA', estado: 'RASCUNHO',
                organizador: organizadores.length === 1 ? organizadores[0].valor : '', imagem_url: null,
            }} />
        </main>
    )
}
