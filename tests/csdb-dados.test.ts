import { describe, expect, it } from 'vitest'
import {
    compositoresDaFaixa, dadosDaFaixa, escolherArtista, formatarDuracao, lerFaixa, mapearLinks,
    nomeIdioma, normalizarTitulo, tomDoCsdb, urlSegura,
} from '@/lib/csdb-dados'

// Forma real da resposta do CSDB (cortada ao que interessa)
const perfil = (name: string, alias = '') => ({ id: 1, name, alias })
const BRUTO = {
    id: 9226281, title: 'Bondade de Deus', year: 2022, language: 'por', isrc: 'BCII12200001',
    bpm: '68', key: 'D', time_sig: '4/4', duration: 375,
    references: [{ type: 'artist', profile: perfil('Isaias Carlos Junior', 'Isaias Saad') }],
    works: [{
        id: 8947355, title: 'Bondade de Deus', year: 2022, language: 'por',
        derived_from: { id: 7269270, title: 'Goodness Of God', year: null, language: 'eng' },
        references: [
            { type: 'author', profile: perfil('Jason David Ingram', 'Jason Ingram') },
            { type: 'author', profile: perfil('Ben Fielding') },
            { type: 'author', profile: perfil('Jason David Ingram', 'Jason Ingram') },
            { type: 'publisher', profile: perfil('Editora X') },
        ],
    }],
    external_links: [
        { type: 'youtube_video', id: 'a', url: 'https://www.youtube.com/watch?v=a' },
        { type: 'spotify', id: 'b', url: 'https://open.spotify.com/track/b' },
        { type: 'youtube', id: 'c', url: 'https://music.youtube.com/watch?v=c' },
        { type: 'letras_mus', id: 'd', url: 'https://www.letras.mus.br/isaias-saad/bondade-de-deus' },
        { type: 'cifra_club', id: 'e', url: 'https://www.cifraclub.com.br/isaias-saad/bondade-de-deus' },
        { type: 'youtube_bt', id: 'f', url: 'https://www.youtube.com/watch?v=f' },
        { type: 'spotify_bt', id: 'g', url: 'https://open.spotify.com/track/g' },
    ],
}

describe('normalizarTitulo', () => {
    it('tira acentos, maiúsculas e pontuação', () => {
        expect(normalizarTitulo('Glória!')).toBe('gloria')
        expect(normalizarTitulo('Gloria')).toBe('gloria')
        expect(normalizarTitulo('  Grande é o  Senhor – B ')).toBe('grande e o senhor b')
        expect(normalizarTitulo('Ação, Coração')).toBe('acao coracao')
    })
    it('aguenta vazio e nulo', () => {
        expect(normalizarTitulo('')).toBe('')
        expect(normalizarTitulo(null)).toBe('')
        expect(normalizarTitulo(undefined)).toBe('')
    })
})

describe('artista e compositores', () => {
    it('usa o nome artístico (alias) do artista principal', () => {
        expect(escolherArtista(BRUTO)).toBe('Isaias Saad')
    })
    it('sem alias usa o nome; sem artistas devolve null', () => {
        expect(escolherArtista({ references: [{ type: 'artist', profile: perfil('Ana Silva') }] })).toBe('Ana Silva')
        expect(escolherArtista({ references: [] })).toBeNull()
        expect(escolherArtista({})).toBeNull()
    })
    it('com vários artistas junta os dois primeiros', () => {
        const f = { references: ['A', 'B', 'C'].map((n) => ({ type: 'artist', profile: perfil(n) })) }
        expect(escolherArtista(f)).toBe('A, B')
    })
    it('compositores: só autores, sem repetidos', () => {
        expect(compositoresDaFaixa(BRUTO)).toEqual(['Jason Ingram', 'Ben Fielding'])
    })
})

describe('ligações → campos', () => {
    const l = mapearLinks(lerFaixa(BRUTO)!.ligacoes)
    it('cifra, letra e vídeo certos', () => {
        expect(l.link_cifra).toBe('https://www.cifraclub.com.br/isaias-saad/bondade-de-deus')
        expect(l.link_letra).toBe('https://www.letras.mus.br/isaias-saad/bondade-de-deus')
        expect(l.link_video).toBe('https://www.youtube.com/watch?v=a')
    })
    it('áudio prefere Spotify; playback prefere YouTube', () => {
        expect(l.link_audio).toBe('https://open.spotify.com/track/b')
        expect(l.link_playback).toBe('https://www.youtube.com/watch?v=f')
    })
    it('guarda todas as ligações por tipo', () => {
        expect(Object.keys(l.links)).toContain('spotify_bt')
    })
    it('sem ligações devolve tudo vazio', () => {
        const v = mapearLinks([])
        expect(v.link_cifra).toBeNull()
        expect(v.link_playback).toBeNull()
        expect(v.links).toEqual({})
    })
    it('só playback do Spotify quando é o único', () => {
        expect(mapearLinks([{ tipo: 'spotify_bt', url: 'https://x.test/p' }]).link_playback).toBe('https://x.test/p')
    })
})

describe('lerFaixa', () => {
    it('converte os campos (bpm string → número)', () => {
        const f = lerFaixa(BRUTO)!
        expect(f).toMatchObject({
            id: 9226281, titulo: 'Bondade de Deus', artista: 'Isaias Saad', ano: 2022, bpm: 68, tom: 'D',
            compasso: '4/4', duracao_seg: 375, idioma: 'por', isrc: 'BCII12200001',
            obra: { id: 8947355 }, original: { id: 7269270, titulo: 'Goodness Of God', idioma: 'eng' },
        })
    })
    it('descarta o que está incompleto ou fora de limites', () => {
        expect(lerFaixa(null)).toBeNull()
        expect(lerFaixa({ id: 1 })).toBeNull()
        expect(lerFaixa({ id: 1, title: 'X', bpm: '0', duration: 0, key: '?' })).toMatchObject({ bpm: null, duracao_seg: null, tom: null })
    })
    it('dadosDaFaixa junta tudo para gravar', () => {
        const d = dadosDaFaixa(lerFaixa(BRUTO)!)
        expect(d.csdb_track_id).toBe(9226281)
        expect(d.csdb_work_id).toBe(8947355)
        expect(d.link_cifra).toContain('cifraclub')
        expect(d.compositores).toHaveLength(2)
    })
})

describe('pequenos ajudantes', () => {
    it('duração em minutos:segundos', () => {
        expect(formatarDuracao(375)).toBe('6:15')
        expect(formatarDuracao(65)).toBe('1:05')
        expect(formatarDuracao(0)).toBeNull()
        expect(formatarDuracao(null)).toBeNull()
    })
    it('tom no formato do portal', () => {
        expect(tomDoCsdb('Bb')).toBe('Bb')
        expect(tomDoCsdb('F#m')).toBe('F#m')
        expect(tomDoCsdb('D minor')).toBe('Dm')
        expect(tomDoCsdb('H')).toBeNull()
        expect(tomDoCsdb(5)).toBeNull()
    })
    it('só aceita endereços http(s)', () => {
        expect(urlSegura('https://a.test/x')).toBe('https://a.test/x')
        expect(urlSegura('javascript:alert(1)')).toBeNull()
        expect(urlSegura('data:text/html,x')).toBeNull()
        expect(urlSegura('não é url')).toBeNull()
    })
    it('nome do idioma', () => {
        expect(nomeIdioma('eng')).toBe('Inglês')
        expect(nomeIdioma('xyz')).toBe('XYZ')
        expect(nomeIdioma(null)).toBeNull()
    })
})
