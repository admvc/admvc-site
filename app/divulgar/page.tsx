// /divulgar — página ABERTA (sem login): as artes dos cultos dos próximos dias para qualquer irmão partilhar no telemóvel
// (WhatsApp, Instagram, Facebook). Só mostra o que a Mídia publicou (Divulgação → "Publicar para a igreja"), só as artes das redes.
import type { Metadata } from 'next'
import { cultosPublicados, tenantPublico } from '@/lib/divulgacao-publica'
import DivulgarClient from '@/components/app/DivulgarClient'
import JaPostei from '@/components/midia/JaPostei'
import { getSessionData, isAdmin } from '@/lib/auth-utils'
import { quemPostou, souDestinatario } from '@/lib/rotina-alertas'

// Para quem tem sessão (escalado no telão, líder ou administração): os cultos com artes publicadas que podem marcar como postados
async function paraPostar(cultos: { id: number; nome: string }[]) {
    try {
        const sessao = await getSessionData()
        if (!sessao || cultos.length === 0) return []
        const postou = await quemPostou(sessao.tenantId, cultos.map((c) => c.id))
        const saida: { id: number; nome: string; postadoPor: string | null }[] = []
        for (const c of cultos) {
            if (isAdmin(sessao.role) || (await souDestinatario(sessao.tenantId, c.id, sessao.membroId))) saida.push({ id: c.id, nome: c.nome, postadoPor: postou.get(c.id)?.nome ?? null })
        }
        return saida
    } catch {
        return []
    }
}

export const dynamic = 'force-dynamic'

async function carregar() {
    try {
        const tenant = await tenantPublico()
        return tenant ? (await cultosPublicados(tenant)).map(({ telao: _telao, ...c }) => c) : []
    } catch (err) {
        console.error('[DIVULGAR] Falha a ler as artes publicadas:', err)
        return []
    }
}

// Quando o link vai no WhatsApp, aparece a arte do próximo culto
export async function generateMetadata(): Promise<Metadata> {
    const cultos = await carregar()
    const primeiro = cultos[0]
    const post = primeiro?.artes.find((a) => a.id === 'post') ?? primeiro?.artes[0]
    const titulo = primeiro ? `${primeiro.nome} · Ajuda a divulgar` : 'Ajuda a divulgar · ADMVC'
    const descricao = 'Partilha o convite com a família e os amigos: as artes e as mensagens já estão prontas.'
    return {
        title: titulo,
        description: descricao,
        openGraph: { title: titulo, description: descricao, type: 'website', ...(post ? { images: [{ url: post.url }] } : {}) },
        twitter: { card: post ? 'summary_large_image' : 'summary', title: titulo, description: descricao, ...(post ? { images: [post.url] } : {}) },
    }
}

export default async function Divulgar() {
    const cultos = await carregar()
    const postar = await paraPostar(cultos)
    return (
        <div className="app-novo min-h-screen">
            <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-6">
                <header className="space-y-1">
                    <p className="text-[14px] font-semibold uppercase tracking-wide a-suave">ADMVC · Figueira da Foz</p>
                    <h1 className="text-[26px] font-bold leading-tight">Ajuda a divulgar</h1>
                    <p className="text-[16px] a-suave">Escolhe o culto, toca em <strong>Partilhar</strong> e envia a arte a quem quiseres convidar.</p>
                </header>
                {postar.length > 0 && (
                    <section className="space-y-2" aria-label="Já postei">
                        {postar.map((c) => <JaPostei key={c.id} eventoId={c.id} nome={c.nome} postadoPor={c.postadoPor} />)}
                    </section>
                )}
                <DivulgarClient cultos={cultos} />
            </main>
        </div>
    )
}
