// app/cantina/tv/page.tsx
// TV Wall — digital signage para TV da cantina com auto-scroll e destaques
import { getDb } from '@/lib/db'
import CantinaTV from '@/components/cantina/CantinaTV'

export const dynamic = 'force-dynamic'

export default async function CantinaVideoWall() {
    const db = await getDb()

    const [produtos, categorias] = await Promise.all([
        db.produtoCantina.findMany({
            where: {
                disponivel: true,
                OR: [{ controla_stock: false }, { stock: { gt: 0 } }],
            },
            include: { categoria: true },
            orderBy: [{ categoria: { ordem: 'asc' } }, { nome: 'asc' }],
        }),
        db.categoriaCantina.findMany({
            where: { ativa: true },
            orderBy: { ordem: 'asc' },
        }),
    ])

    const produtosSerializados = produtos.map(p => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        imagem_url: p.imagem_url,
        promocoes: p.promocoes,
        categoria: p.categoria ? { id: p.categoria.id, nome: p.categoria.nome } : null,
    }))

    const categoriasSerializadas = categorias.map(c => ({
        id: c.id,
        nome: c.nome,
    }))

    return <CantinaTV produtos={produtosSerializados} categorias={categoriasSerializadas} />
}
