// Datas em portugues, como se diz: "Domingo, 19 de outubro" · "10:00" · "hoje", "amanha".

function capitalizar(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export function diaPorExtenso(iso: string) {
    const d = new Date(iso)
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const dia = new Date(d); dia.setHours(0, 0, 0, 0)
    const diff = Math.round((dia.getTime() - hoje.getTime()) / 86400000)
    const base = d.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })
    if (diff === 0) return `Hoje, ${base.split(',').slice(1).join(',').trim()}`
    if (diff === 1) return `Amanhã, ${base.split(',').slice(1).join(',').trim()}`
    return capitalizar(base)
}

export function hora(iso: string) {
    return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
}

export function diaCurto(iso: string) {
    return capitalizar(new Date(iso).toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, ''))
}

/** "ha 3 semanas", "ha 2 meses" (para a ultima vez que serviu). */
export function haQuanto(iso: string | null) {
    if (!iso) return 'Ainda não serviu'
    const dias = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000))
    if (dias < 7) return 'Serviu esta semana'
    if (dias < 14) return 'Serviu há 1 semana'
    if (dias < 60) return `Serviu há ${Math.round(dias / 7)} semanas`
    return `Serviu há ${Math.round(dias / 30)} meses`
}

function diasAte(iso: string) {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const dia = new Date(iso); dia.setHours(0, 0, 0, 0)
    return Math.round((dia.getTime() - hoje.getTime()) / 86400000)
}

/** "hoje", "amanhã", "daqui a 6 dias", "daqui a 2 semanas", "ontem", "há 3 dias". */
export function daquiA(iso: string) {
    const n = diasAte(iso)
    if (n === 0) return 'hoje'
    if (n === 1) return 'amanhã'
    if (n === -1) return 'ontem'
    if (n > 1) return n < 14 ? `daqui a ${n} dias` : `daqui a ${Math.round(n / 7)} semanas`
    return -n < 14 ? `há ${-n} dias` : `há ${Math.round(-n / 7)} semanas`
}

/** "Domingo" */
export function diaDaSemana(iso: string) {
    return capitalizar(new Date(iso).toLocaleDateString('pt-PT', { weekday: 'long' }))
}

/** { dia: '18', mes: 'out' } */
export function diaEMes(iso: string) {
    const d = new Date(iso)
    return { dia: String(d.getDate()), mes: d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '') }
}

/** Chave do dia (para agrupar cultos do mesmo dia). */
export function chaveDoDia(iso: string) {
    const d = new Date(iso)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
