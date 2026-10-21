import { describe, expect, it } from 'vitest'
import { criarZip } from '@/lib/zip'

describe('criarZip', () => {
    it('junta ficheiros com nomes UTF-8 e diretório central certo', () => {
        const a = new Uint8Array([1, 2, 3]), b = new Uint8Array([9, 9])
        const z = criarZip([{ nome: '01-oração.png', dados: a }, { nome: 'b.png', dados: b }])
        const v = new DataView(z.buffer, z.byteOffset, z.byteLength)
        expect(v.getUint32(0, true)).toBe(0x04034b50)
        expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50)
        expect(v.getUint16(z.length - 22 + 10, true)).toBe(2)               // 2 entradas
        const offCentral = v.getUint32(z.length - 22 + 16, true)
        expect(v.getUint32(offCentral, true)).toBe(0x02014b50)
        expect(v.getUint16(z.length - 22 + 12, true) + offCentral + 22).toBe(z.length) // tamanho do central bate certo
    })
})
