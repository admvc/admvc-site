// Banners da cantina para o telão e as redes: modelo, texto, foto no centro e pré-visualização ao vivo.
// A imagem vem de /api/cantina/banner (lib/cantina-banners-imagem.tsx). Só a equipa da Cantina e a administração.
import { redirect } from 'next/navigation'
import { getSessionData } from '@/lib/auth-utils'
import { getTenantClient } from '@/lib/prisma'
import { podeFazerBannersCantina } from '@/lib/cantina-acesso'
import DivulgarClient from './DivulgarClient'

export const dynamic = 'force-dynamic'

export default async function CantinaDivulgarPage() {
    const sessao = await getSessionData()
    if (!sessao) redirect('/membros/login')
    if (!(await podeFazerBannersCantina(sessao))) redirect(`/membros/dashboard?error=${encodeURIComponent('Só a equipa da Cantina e a administração fazem os banners.')}`)
    const produtos = await getTenantClient(sessao.tenantId).produtoCantina.findMany({
        where: { disponivel: true },
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, preco: true, imagem_url: true },
        take: 400,
    })
    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-5xl space-y-5 px-4 pt-20 pb-56 md:pt-8">
                <header>
                    <h1 className="text-[24px] font-bold">Divulgar a cantina</h1>
                    <p className="text-[16px] a-suave">Escolha o modelo, escreva o que vende e descarregue o banner para o telão ou para as redes.</p>
                </header>
                <DivulgarClient produtos={produtos.map((p) => ({ id: p.id, nome: p.nome, preco: p.preco, imagem: p.imagem_url }))} />
            </main>
        </div>
    )
}
