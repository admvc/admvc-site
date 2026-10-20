// Textos de divulgação de um culto: legenda para Instagram/Facebook e mensagem de WhatsApp. Por molde (sem IA),
// no tom da igreja: acolhedor, próximo, pt-PT. Mesmas regras da skill divulgacao-admvc (textos.md).
import { quandoDoEvento } from '@/lib/divulgacao-kit'

type Tipo = { emoji: string; chamada: string; convite: string; hashtags: string[]; assinatura: string }

// Pelo nome do evento: cada tipo muda o gancho e as hashtags
const TIPOS: [RegExp, Tipo][] = [
    [/jovens/i, { emoji: '🔥', chamada: 'é dia de estarmos juntos', convite: 'Vem com a tua fome de Deus, com as tuas perguntas e com a vontade de crescer, porque esta noite é para ti.', hashtags: ['#CultoDeJovens', '#JovensADMVC', '#JuventudeCristã', '#JovensComPropósito'], assinatura: 'Jovens & Gerações' }],
    [/mulher|chá/i, { emoji: '🌸', chamada: 'é tempo só para nós', convite: 'Vem partilhar, confraternizar e ser abraçada pela presença de Deus.', hashtags: ['#MulheresADMVC', '#ChaDeMulheres', '#MulheresDeFé'], assinatura: 'Mulheres' }],
    [/fam[ií]lia|domingo|dmg/i, { emoji: '🙏', chamada: 'é dia de adorar em família', convite: 'Traz quem mais amas para um tempo de louvor, Palavra e comunhão.', hashtags: ['#CultoDaFamília', '#FamíliaADMVC', '#Domingo'], assinatura: 'Cultos' }],
    [/profétic|oração|oracao/i, { emoji: '🙌', chamada: 'é noite de Palavra e de oração', convite: 'Uma noite de oração e de Palavra profética. Vem e traz o teu pedido.', hashtags: ['#QuartaProfética', '#Oração', '#PalavraProfética'], assinatura: 'Cultos' }],
    [/ceia/i, { emoji: '🍞', chamada: 'é dia de celebrar a Ceia do Senhor', convite: 'Um tempo de comunhão, memória e gratidão pelo sacrifício de Jesus.', hashtags: ['#CeiaDoSenhor', '#Comunhão'], assinatura: 'Cultos' }],
]
const GERAL: Tipo = { emoji: '🙏', chamada: 'é dia de estar na Casa do Senhor', convite: 'Louvor, Palavra e comunhão, num ambiente onde és bem-vindo.', hashtags: ['#Culto', '#Louvor', '#Adoração'], assinatura: 'Cultos' }
const SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const FIXAS = ['#ADMVC', '#FigueiraDaFoz', '#IgrejaEmPortugal', '#Fé', '#Jesus']

export type DadosTexto = { nome: string; data: Date; preletor: string; local: string; hoje: Date }

/** "Hoje", "Amanhã" ou o dia da semana, para o início da mensagem. Datas em Lisboa "escrita" em UTC. */
function quando(data: Date, hoje: Date) {
    const diff = Math.round((Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()) - Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())) / 86400000)
    const q = quandoDoEvento(data)
    const dia = q.quando.split(',')[0]
    const dd = String(data.getUTCDate()).padStart(2, '0') + '/' + String(data.getUTCMonth() + 1).padStart(2, '0')
    return { rel: diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : dia, dd, curto: q.quando, hora: q.hora, hoje: diff === 0, amanha: diff === 1 }
}

export function textosDoCulto(d: DadosTexto): { legenda: string; whatsapp: string } {
    const t = TIPOS.find(([re]) => re.test(d.nome))?.[1] ?? GERAL
    const q = quando(d.data, d.hoje)
    const nome = d.nome.replace(/\s*\(.*\)\s*$/, '').trim()
    const inicio = q.hoje ? 'Hoje' : q.amanha ? 'Amanhã' : SEMANA[d.data.getUTCDay()]
    const local = d.local ? `ADMVC — ${d.local}` : 'ADMVC'

    const legenda = [
        `${inicio} ${t.chamada}! ${t.emoji}`,
        '',
        `${nome}: ${t.convite}`,
        '',
        `🗓 ${q.hoje || q.amanha ? `${q.rel}, ${q.curto.split(', ')[1]}` : q.curto}`,
        `🕗 ${q.hora}`,
        d.preletor ? `🎙 Preletor: ${d.preletor}` : null,
        `📍 ${local}`,
        '',
        '👉 Marca aqui aquele amigo que precisa de estar lá contigo e partilha nos teus stories. Ninguém fica de fora!',
        '',
        [...t.hashtags, ...FIXAS].join(' '),
    ].filter((l) => l !== null).join('\n')

    const whatsapp = [
        `${t.emoji} *${nome.toUpperCase()}* ${t.emoji}`,
        '',
        `📅 *${q.rel}, ${q.dd}*`,
        `🕗 *${q.hora}*`,
        d.preletor ? `🎙 Preletor: *${d.preletor}*` : null,
        '',
        `${t.convite} 🙌`,
        '',
        '👉 *Traz um amigo!* Reencaminha esta mensagem para quem precisa de estar lá.',
        '',
        'Esperamos por ti! 💛',
        `_${local.split(' — ')[0]} — ${t.assinatura}_`,
    ].filter((l) => l !== null).join('\n')

    return { legenda, whatsapp }
}
