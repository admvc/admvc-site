// lib/congregacao-site.ts
// O que o site público (www) mostra de cada congregação: nome, cidade, morada,
// mapa, descrição e horários. Pastor, telefone e email ficam no portal.

export interface HorarioSite { dia: string; hora: string; nome: string }

/** Uma linha por encontro: "Domingo · 10:00 · Culto da Família" (também aceita "|"). */
export function lerHorarios(texto: string | null | undefined): HorarioSite[] {
    return (texto ?? '')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean)
        .slice(0, 20)
        .map(l => {
            const [dia = '', hora = '', ...resto] = l.split(/\s*[·|]\s*/)
            return { dia, hora, nome: resto.join(' · ') }
        })
        .filter(h => h.dia)
}

/** Ligação ao Google Maps: pelo ponto, se houver; senão pela morada. */
export function mapaDe(c: { latitude: number | null; longitude: number | null; endereco: string; cidade: string }) {
    if (c.latitude != null && c.longitude != null) {
        return `https://www.google.com/maps/search/?api=1&query=${c.latitude},${c.longitude}`
    }
    const morada = [c.endereco, c.cidade].filter(Boolean).join(', ')
    return morada ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(morada)}` : null
}
