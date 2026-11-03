import { describe, expect, it } from 'vitest'
import {
    avisoDeEspaco, chaveSegura, formatarBytes, LIMITES_FOTOS, nivelDeEspaco, origemLimpa, percentagemUsada, verificarTravoes,
} from '@/lib/fotos-limites'

const MB = 1024 * 1024
const GB = 1024 * MB

describe('travões de custo das fotos', () => {
    it('os valores combinados estão na constante única', () => {
        expect(LIMITES_FOTOS.totalBytes).toBe(8 * GB)
        expect(LIMITES_FOTOS.avisoBytes).toBe(6 * GB)
        expect(LIMITES_FOTOS.fotosPorAlbum).toBe(40)
        expect(LIMITES_FOTOS.bytesPorAlbum).toBe(25 * MB)
    })

    it('aceita uma foto normal', () => {
        expect(verificarTravoes({ fotosNoAlbum: 5, bytesAlbum: 5 * MB, bytesTotal: 1 * GB, novos: 800 * 1024 })).toBeNull()
    })

    it('recusa a foto 41 do álbum, com texto em português e o código do limite', () => {
        const r = verificarTravoes({ fotosNoAlbum: 40, bytesAlbum: 20 * MB, bytesTotal: 1 * GB, novos: 500 * 1024 })
        expect(r?.limite).toBe('fotos_por_album')
        expect(r?.maximo).toBe(40)
        expect(r?.error).toMatch(/40 fotos/)
    })

    it('a 40.ª foto ainda cabe', () => {
        expect(verificarTravoes({ fotosNoAlbum: 39, bytesAlbum: 10 * MB, bytesTotal: 1 * GB, novos: 500 * 1024 })).toBeNull()
    })

    it('recusa quando o álbum passa os 25 MB', () => {
        const r = verificarTravoes({ fotosNoAlbum: 20, bytesAlbum: 24.5 * MB, bytesTotal: 1 * GB, novos: 1 * MB })
        expect(r?.limite).toBe('espaco_do_album')
        expect(r?.error).toMatch(/25 MB/)
    })

    it('aceita exatamente 25 MB', () => {
        expect(verificarTravoes({ fotosNoAlbum: 20, bytesAlbum: 24 * MB, bytesTotal: 1 * GB, novos: 1 * MB })).toBeNull()
    })

    it('recusa quando o total da igreja passa os 8 GB', () => {
        const r = verificarTravoes({ fotosNoAlbum: 3, bytesAlbum: 3 * MB, bytesTotal: 8 * GB - 100 * 1024, novos: 500 * 1024 })
        expect(r?.limite).toBe('total')
        expect(r?.error).toMatch(/8 GB/)
    })

    it('repetir o envio de uma foto (substituir) não conta a mais', () => {
        // álbum cheio de fotos e de espaço: a mesma foto, do mesmo tamanho, volta a caber
        const cheio = { fotosNoAlbum: 40, bytesAlbum: 25 * MB, bytesTotal: 8 * GB, novos: 600 * 1024, substitui: 600 * 1024 }
        expect(verificarTravoes(cheio)).toBeNull()
        // mas uma versão maior que passa o teto já não
        expect(verificarTravoes({ ...cheio, novos: 700 * 1024 })?.limite).toBe('espaco_do_album')
    })

    it('usa os limites que lhe passarem (fácil de mudar)', () => {
        const pequeno = { ...LIMITES_FOTOS, fotosPorAlbum: 2 }
        expect(verificarTravoes({ fotosNoAlbum: 2, bytesAlbum: 0, bytesTotal: 0, novos: 1 }, pequeno)?.limite).toBe('fotos_por_album')
    })
})

describe('espaço usado', () => {
    it('avisa a partir dos 6 GB e fica cheio nos 8 GB', () => {
        expect(avisoDeEspaco(5.9 * GB)).toBeNull()
        expect(avisoDeEspaco(6 * GB)).toMatch(/6 GB de 8 GB/)
        expect(nivelDeEspaco(5 * GB)).toBe('ok')
        expect(nivelDeEspaco(6 * GB)).toBe('aviso')
        expect(nivelDeEspaco(8 * GB)).toBe('cheio')
    })
    it('percentagem entre 0 e 100', () => {
        expect(percentagemUsada(0)).toBe(0)
        expect(percentagemUsada(4 * GB)).toBe(50)
        expect(percentagemUsada(20 * GB)).toBe(100)
    })
    it('formata em pt-PT', () => {
        expect(formatarBytes(512)).toBe('512 B')
        expect(formatarBytes(2048)).toBe('2 KB')
        expect(formatarBytes(1.5 * MB)).toBe('1,5 MB')
        expect(formatarBytes(8 * GB)).toBe('8 GB')
    })
})

describe('nomes e chaves seguros', () => {
    it('tira caminhos e carateres estranhos do nome de origem', () => {
        expect(origemLimpa('..\\..\\etc/passwd')).toBe('.etcpasswd')
        expect(origemLimpa('IMG_0101.jpg')).toBe('IMG_0101.jpg')
        expect(origemLimpa(null)).toBe('')
        expect(origemLimpa('a'.repeat(300))).toHaveLength(180)
    })
    it('só aceita chaves de armazenamento simples, sem ..', () => {
        expect(chaveSegura('2026-11-02-culto/ab12cd34-web.jpg')).toBe(true)
        expect(chaveSegura('../segredo.jpg')).toBe(false)
        expect(chaveSegura('a/../b.jpg')).toBe(false)
        expect(chaveSegura('a\\b.jpg')).toBe(false)
        expect(chaveSegura('https://x.pt/a.jpg')).toBe(false)
        expect(chaveSegura('/etc/passwd')).toBe(false)
        expect(chaveSegura('a/b/c/d.jpg')).toBe(false)
        expect(chaveSegura('')).toBe(false)
    })
})
