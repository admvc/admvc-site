// ZIP mínimo (sem compressão: os PNG já vêm comprimidos), para descarregar o kit de artes de uma vez.
// Só nomes ASCII. Formato: cabeçalho local + dados por ficheiro, diretório central e fim do diretório.

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

export function criarZip(ficheiros: { nome: string; dados: Uint8Array }[]): Buffer {
    const agora = new Date()
    const hora = (agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1)
    const data = ((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate()
    const partes: Buffer[] = []
    const central: Buffer[] = []
    let deslocamento = 0

    for (const f of ficheiros) {
        const nome = Buffer.from(f.nome, 'ascii')
        const crc = crc32(f.dados)
        const local = Buffer.alloc(30)
        local.writeUInt32LE(0x04034b50, 0)
        local.writeUInt16LE(20, 4)          // versão necessária
        local.writeUInt16LE(0, 6)           // flags
        local.writeUInt16LE(0, 8)           // método 0 = sem compressão
        local.writeUInt16LE(hora, 10)
        local.writeUInt16LE(data, 12)
        local.writeUInt32LE(crc, 14)
        local.writeUInt32LE(f.dados.length, 18)
        local.writeUInt32LE(f.dados.length, 22)
        local.writeUInt16LE(nome.length, 26)
        local.writeUInt16LE(0, 28)
        partes.push(local, nome, Buffer.from(f.dados))

        const entrada = Buffer.alloc(46)
        entrada.writeUInt32LE(0x02014b50, 0)
        entrada.writeUInt16LE(20, 4)        // criado por
        entrada.writeUInt16LE(20, 6)        // versão necessária
        entrada.writeUInt16LE(0, 8)
        entrada.writeUInt16LE(0, 10)
        entrada.writeUInt16LE(hora, 12)
        entrada.writeUInt16LE(data, 14)
        entrada.writeUInt32LE(crc, 16)
        entrada.writeUInt32LE(f.dados.length, 20)
        entrada.writeUInt32LE(f.dados.length, 24)
        entrada.writeUInt16LE(nome.length, 28)
        entrada.writeUInt32LE(deslocamento, 42)
        central.push(entrada, nome)
        deslocamento += 30 + nome.length + f.dados.length
    }

    const tamCentral = central.reduce((s, b) => s + b.length, 0)
    const fim = Buffer.alloc(22)
    fim.writeUInt32LE(0x06054b50, 0)
    fim.writeUInt16LE(ficheiros.length, 8)
    fim.writeUInt16LE(ficheiros.length, 10)
    fim.writeUInt32LE(tamCentral, 12)
    fim.writeUInt32LE(deslocamento, 16)
    return Buffer.concat([...partes, ...central, fim])
}
