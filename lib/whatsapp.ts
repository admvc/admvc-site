// "Enviar no WhatsApp": abre o WhatsApp (app ou web) com a mensagem já escrita, para escolher o grupo ou a pessoa. Sem
// custos e sem API: é só um endereço wa.me.
export const linkWhatsApp = (texto: string) => `https://wa.me/?text=${encodeURIComponent(texto)}`

/** Mensagem curta de um encontro da equipa/grupo (o que o líder manda no grupo de WhatsApp). */
export function mensagemDoEncontro(e: { titulo: string; inicio: string; local?: string | null; cancelado?: boolean }, tipo: string): string {
    const d = new Date(e.inicio)   // hora de Lisboa "escrita" em UTC: mostra-se SEMPRE em UTC
    const dia = d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    const hora = d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    if (e.cancelado) return `❌ *Cancelado:* ${e.titulo}\n📅 ${dia}, ${hora}`
    return [
        `📌 *${tipo}: ${e.titulo}*`,
        `📅 ${dia}`,
        `🕗 ${hora}`,
        e.local ? `📍 ${e.local}` : null,
        '',
        'Contamos contigo! 🙏',
    ].filter((l) => l !== null).join('\n')
}
