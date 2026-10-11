// lib/whatsapp-templates.ts
// Mensagens padrao para WhatsApp — usadas em varios contextos

export interface WhatsAppTemplate {
    id: string
    label: string
    categoria: 'geral' | 'acolhimento' | 'escalas' | 'aniversario' | 'grupo'
    buildMessage: (vars: Record<string, string>) => string
}

export const WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
    {
        id: 'boas_vindas',
        label: 'Boas-vindas ao Visitante',
        categoria: 'acolhimento',
        buildMessage: ({ nome }) =>
            `Ola, *${nome}*! 👋\n\n` +
            `Foi uma alegria ter-te connosco no culto! Esperamos que te tenhas sentido acolhido(a).\n\n` +
            `Se tiveres alguma duvida ou precisares de algo, estamos aqui para ajudar.\n\n` +
            `Ate breve! 🙏`,
    },
    {
        id: 'convite_grupo',
        label: 'Convite para Grupo/PG',
        categoria: 'grupo',
        buildMessage: ({ nome, nomeGrupo, dia, horario, local }) =>
            `Ola, *${nome}*! 👋\n\n` +
            `Gostavamos de te convidar para o nosso grupo *${nomeGrupo}*.\n\n` +
            `📅 *${dia}*\n` +
            `⏰ *${horario}*\n` +
            `📍 *${local}*\n\n` +
            `Seria otimo contar contigo! Confirmas? 😊`,
    },
    {
        id: 'lembrete_escala',
        label: 'Lembrete de Escala',
        categoria: 'escalas',
        buildMessage: ({ nome, evento, data, hora, departamento, funcao }) =>
            `Ola, *${nome}*! 👋\n\n` +
            `Lembrete que estas escalado(a) para servir:\n\n` +
            `📅 *${data}*\n` +
            `⏰ *${hora}*\n` +
            `🎸 *${departamento}*\n` +
            `💪 *${funcao}*\n\n` +
            `Podes confirmar a tua presenca no portal? 🙏`,
    },
    {
        id: 'aniversario',
        label: 'Parabens de Aniversario',
        categoria: 'aniversario',
        buildMessage: ({ nome }) =>
            `Feliz aniversario, *${nome}*! 🎂🎉\n\n` +
            `Que Deus te abencoe ricamente neste novo ano de vida! Que seja repleto de saude, paz e muitas conquistas.\n\n` +
            `A tua familia ADMVC te ama! ❤️`,
    },
    {
        id: 'acompanhamento',
        label: 'Follow-up de Visitante',
        categoria: 'acolhimento',
        buildMessage: ({ nome }) =>
            `Ola, *${nome}*! 😊\n\n` +
            `Estamos a fazer um acompanhamento da tua visita a nossa igreja.\n\n` +
            `Gostavamos de saber como estas e se tens alguma necessidade em que possamos ajudar.\n\n` +
            `Estamos aqui para ti! 🙏`,
    },
    {
        id: 'permanecer',
        label: 'Convite Permanecer',
        categoria: 'geral',
        buildMessage: ({ nome, data, hora }) =>
            `Ola, *${nome}*! 👋\n\n` +
            `Temos o prazer de te convidar para a proxima sessao do *Permanecer*, onde vais conhecer melhor a nossa visao e valores.\n\n` +
            `📅 *${data}*\n` +
            `⏰ *${hora}*\n\n` +
            `Confirmas a tua presenca? 😊`,
    },
]

export function buildWhatsAppUrl(phone: string, message: string): string {
    const cleanPhone = phone.replace(/\D/g, '')
    const encoded = encodeURIComponent(message)
    return `https://wa.me/${cleanPhone}?text=${encoded}`
}

export function getTemplatesByCategoria(categoria?: string): WhatsAppTemplate[] {
    if (!categoria) return WHATSAPP_TEMPLATES
    return WHATSAPP_TEMPLATES.filter(t => t.categoria === categoria)
}
