// lib/indisponibilidade.ts
// "Esta pessoa disse que nao pode nesta data/hora?" — funcao pura, usada para
// um membro (verificarIndisponibilidade) ou para a equipa inteira de uma vez
// (ecra do lider a montar a escala).

export interface Indisponibilidade {
    tipo: string // DIA_SEMANA | DATA_ESPECIFICA | INTERVALO
    dia_semana?: number | null
    data_inicio?: Date | string | null
    data_fim?: Date | string | null
    hora_inicio?: string | null
    hora_fim?: string | null
    motivo?: string | null
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function mesmoDia(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function fmtData(d: Date) {
    return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
}

function dentroDaHora(hora: string, ind: Indisponibilidade) {
    if (!ind.hora_inicio || !ind.hora_fim) return true
    return hora >= ind.hora_inicio && hora <= ind.hora_fim
}

/** Devolve o motivo se a pessoa nao pode nessa data; senao null. */
export function motivoIndisponivel(lista: Indisponibilidade[], data: Date): string | null {
    const diaSemana = data.getDay()
    const hora = data.toTimeString().slice(0, 5)

    for (const ind of lista) {
        if (ind.tipo === 'DIA_SEMANA' && ind.dia_semana === diaSemana && dentroDaHora(hora, ind)) {
            return ind.motivo || (ind.hora_inicio ? `Indisponível às ${DIAS[diaSemana]}s entre ${ind.hora_inicio} e ${ind.hora_fim}` : `Indisponível às ${DIAS[diaSemana]}s`)
        }
        if (ind.tipo === 'DATA_ESPECIFICA' && ind.data_inicio && mesmoDia(data, new Date(ind.data_inicio)) && dentroDaHora(hora, ind)) {
            return ind.motivo || 'Indisponível neste dia'
        }
        if (ind.tipo === 'INTERVALO' && ind.data_inicio && ind.data_fim) {
            const inicio = new Date(ind.data_inicio); inicio.setHours(0, 0, 0, 0)
            const fim = new Date(ind.data_fim); fim.setHours(23, 59, 59, 999)
            if (data >= inicio && data <= fim) return ind.motivo || `Indisponível de ${fmtData(inicio)} a ${fmtData(fim)}`
        }
    }
    return null
}
