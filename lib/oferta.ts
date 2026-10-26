// Oferta por transferência: validar o IBAN, o QR "EPC" (o padrão europeu que as apps de bancos leem para
// preencher uma transferência) e o endereço da página /oferta (IBAN e MB WAY com botão "Copiar").
// MB WAY: não há QR para pagar a um número de telemóvel (só para comerciantes, por contrato); mostra-se o número.

/** Só letras e números, em maiúsculas ("PT50 0002 …" → "PT500002…"). */
export const limparIban = (v: string) => v.replace(/[^a-z0-9]/gi, '').toUpperCase()

/** IBAN com a soma de controlo certa (mod 97), de 15 a 34 caracteres. */
export function ibanValido(v: string): boolean {
    const iban = limparIban(v)
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
    const rodado = iban.slice(4) + iban.slice(0, 4)
    let resto = 0
    for (const ch of rodado) {
        const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55)
        for (const d of n) resto = (resto * 10 + Number(d)) % 97
    }
    return resto === 1
}

/** O IBAN em grupos de 4 ("PT50 0002 0123 …"). */
export const ibanEmGrupos = (v: string) => limparIban(v).replace(/(.{4})/g, '$1 ').trim()

/**
 * Conteúdo do QR de transferência (EPC069-12, versão 002): o banco abre uma transferência SEPA com o nome do
 * titular e o IBAN já preenchidos (o valor fica por escrever, cada pessoa põe o seu). null se faltar algo ou o IBAN for inválido.
 */
export function epcPayload(o: { iban: string; titular: string; descricao?: string }): string | null {
    const iban = limparIban(o.iban)
    const titular = o.titular.replace(/[\r\n]+/g, ' ').trim().slice(0, 70)
    if (!ibanValido(iban) || !titular) return null
    const descricao = (o.descricao ?? 'Oferta').replace(/[\r\n]+/g, ' ').trim().slice(0, 140)
    return ['BCD', '002', '1', 'SCT', '', titular, iban, '', '', '', descricao].join('\n')
}

/** Endereço da página /oferta (os dados vão no endereço: nada fica guardado). null se o IBAN for inválido. */
export function enderecoOferta(origem: string, o: { iban: string; titular?: string; mbway?: string }): string | null {
    const iban = limparIban(o.iban)
    if (!ibanValido(iban)) return null
    const q = new URLSearchParams({ i: iban })
    if (o.titular?.trim()) q.set('t', o.titular.trim().slice(0, 70))
    if (o.mbway?.trim()) q.set('m', o.mbway.trim().slice(0, 20))
    return `${origem}/oferta?${q}`
}
