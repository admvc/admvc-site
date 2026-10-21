// ZIP mínimo (sem compressão: os PNG já vêm comprimidos), para descarregar o kit de artes de uma vez.
// Serve no servidor e no navegador (só Uint8Array/DataView). Formato: cabeçalho local + dados por ficheiro,
// diretório central e fim do diretório. Nomes em UTF-8 (flag 0x0800).

const TABELA = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
        let c = n
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        t[n] = c >>> 0
    }
    return t
})()

function crc32(buf: Uint8Array): number {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = TABELA[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

export function criarZip(ficheiros: { nome: string; dados: Uint8Array }[]): Uint8Array {
    const agora = new Date()
    const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1)
    const data = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate()
    const enc = new TextEncoder()
    const nomes = ficheiros.map((f) => enc.encode(f.nome))
    const tamDados = ficheiros.reduce((s, f, i) => s + 30 + nomes[i].length + f.dados.length, 0)
    const tamCentral = nomes.reduce((s, n) => s + 46 + n.length, 0)
    const saida = new Uint8Array(tamDados + tamCentral + 22)
    const v = new DataView(saida.buffer)
    let p = 0
    let c = tamDados            // o diretório central começa depois de todos os ficheiros
    let deslocamento = 0

    ficheiros.forEach((f, i) => {
        const nome = nomes[i]
        const crc = crc32(f.dados)
        v.setUint32(p, 0x04034b50, true)
        v.setUint16(p + 4, 20, true)         // versão necessária
        v.setUint16(p + 6, 0x0800, true)     // flags: nome em UTF-8
        v.setUint16(p + 8, 0, true)          // método 0 = sem compressão
        v.setUint16(p + 10, hora, true)
        v.setUint16(p + 12, data, true)
        v.setUint32(p + 14, crc, true)
        v.setUint32(p + 18, f.dados.length, true)
        v.setUint32(p + 22, f.dados.length, true)
        v.setUint16(p + 26, nome.length, true)
        v.setUint16(p + 28, 0, true)
        saida.set(nome, p + 30)
        saida.set(f.dados, p + 30 + nome.length)

        v.setUint32(c, 0x02014b50, true)
        v.setUint16(c + 4, 20, true)         // criado por
        v.setUint16(c + 6, 20, true)         // versão necessária
        v.setUint16(c + 8, 0x0800, true)
        v.setUint16(c + 10, 0, true)
        v.setUint16(c + 12, hora, true)
        v.setUint16(c + 14, data, true)
        v.setUint32(c + 16, crc, true)
        v.setUint32(c + 20, f.dados.length, true)
        v.setUint32(c + 24, f.dados.length, true)
        v.setUint16(c + 28, nome.length, true)
        v.setUint32(c + 42, deslocamento, true)
        saida.set(nome, c + 46)

        const tam = 30 + nome.length + f.dados.length
        p += tam; deslocamento += tam; c += 46 + nome.length
    })

    const f = tamDados + tamCentral
    v.setUint32(f, 0x06054b50, true)
    v.setUint16(f + 8, ficheiros.length, true)
    v.setUint16(f + 10, ficheiros.length, true)
    v.setUint32(f + 12, tamCentral, true)
    v.setUint32(f + 16, tamDados, true)
    return saida
}
