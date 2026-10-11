import { describe, it, expect } from 'vitest'
import { importarCifraClub, transporCifra, calcularSemitons, parseCifra, notaRaiz } from '../cifra'

describe('calcularSemitons', () => {
  it('retorna 0 para mesma nota', () => {
    expect(calcularSemitons('C', 'C')).toBe(0)
    expect(calcularSemitons('A', 'A')).toBe(0)
  })

  it('calcula semitons entre notas naturais', () => {
    expect(calcularSemitons('C', 'D')).toBe(2)
    expect(calcularSemitons('C', 'E')).toBe(4)
    expect(calcularSemitons('C', 'G')).toBe(7)
  })

  it('calcula semitons com sustenidos e bemois', () => {
    expect(calcularSemitons('C', 'C#')).toBe(1)
    expect(calcularSemitons('A', 'Bb')).toBe(1)
    expect(calcularSemitons('G', 'Ab')).toBe(1)
  })

  it('calcula semitons com acordes (ignora qualidade)', () => {
    expect(calcularSemitons('Am', 'Dm')).toBe(5)
    expect(calcularSemitons('F#m7', 'Am')).toBe(3)
  })

  it('retorna 0 para notas invalidas', () => {
    expect(calcularSemitons('X', 'C')).toBe(0)
    expect(calcularSemitons('C', 'Z')).toBe(0)
  })
})

describe('transporCifra', () => {
  it('retorna a cifra sem alteracao quando semitons = 0', () => {
    const cifra = '[Am] Texto [G] mais texto'
    expect(transporCifra(cifra, 0)).toBe(cifra)
  })

  it('transpoe acordes em brackets', () => {
    const cifra = '[C] Texto [Am] mais [G]'
    const resultado = transporCifra(cifra, 2)
    expect(resultado).toBe('[D] Texto [Bm] mais [A]')
  })

  it('transpoe acordes com sustenido', () => {
    const cifra = '[F#m] Texto [C#]'
    const resultado = transporCifra(cifra, 1)
    expect(resultado).toBe('[Gm] Texto [D]')
  })

  it('transpoe acordes compostos com barra', () => {
    const cifra = '[C/G] Texto [Am/E]'
    const resultado = transporCifra(cifra, 2)
    expect(resultado).toBe('[D/A] Texto [Bm/F#]')
  })

  it('funciona com semitons negativos', () => {
    const cifra = '[D] Texto [Em]'
    const resultado = transporCifra(cifra, -2)
    expect(resultado).toBe('[C] Texto [Dm]')
  })

  it('fallback para texto plano sem brackets', () => {
    const cifra = 'Am G F E'
    const resultado = transporCifra(cifra, 2)
    expect(resultado).toBe('Bm A G F#')
  })
})

describe('importarCifraClub', () => {
  it('retorna texto que ja tem acordes em brackets', () => {
    const texto = '[Am] Letra aqui [G] mais letra'
    expect(importarCifraClub(texto)).toBe(texto.trim())
  })

  it('converte linha de acordes + linha de letra em formato bracket', () => {
    const texto = 'Am       G\nEsta e a letra'
    const resultado = importarCifraClub(texto)
    expect(resultado).toContain('[Am]')
    expect(resultado).toContain('[G]')
    expect(resultado).toContain('Esta e a')
    // Nao deve ter linhas separadas de acordes
    expect(resultado.split('\n').length).toBe(1)
  })

  it('trata linha de acordes sem letra abaixo (intro/solo)', () => {
    const texto = 'Am  G  F  E'
    const resultado = importarCifraClub(texto)
    expect(resultado).toBe('[Am] [G] [F] [E]')
  })

  it('ignora linhas Tom: e Capo:', () => {
    const texto = 'Tom: Am\nCapo: 2\nAm       G\nLetra aqui'
    const resultado = importarCifraClub(texto)
    expect(resultado).not.toContain('Tom:')
    expect(resultado).not.toContain('Capo:')
    expect(resultado).toContain('[Am]')
  })

  it('preserva tags de seccao como [Intro]', () => {
    const texto = '[Intro]\nAm  G  F  E\n\n[Verso]\nAm       G\nLetra aqui'
    const resultado = importarCifraClub(texto)
    expect(resultado).toContain('[Intro]')
    expect(resultado).toContain('[Verso]')
  })
})

describe('parseCifra', () => {
  it('separa texto e acordes correctamente', () => {
    const cifra = '[Am] Texto [G] mais'
    const { linhas } = parseCifra(cifra)
    expect(linhas).toHaveLength(1)
    const segmentos = linhas[0]
    expect(segmentos[0]).toEqual({ tipo: 'acorde', valor: 'Am' })
    expect(segmentos[1]).toEqual({ tipo: 'texto', valor: ' Texto ' })
    expect(segmentos[2]).toEqual({ tipo: 'acorde', valor: 'G' })
    expect(segmentos[3]).toEqual({ tipo: 'texto', valor: ' mais' })
  })

  it('trata multiplas linhas', () => {
    const cifra = '[Am] Linha 1\n[G] Linha 2'
    const { linhas } = parseCifra(cifra)
    expect(linhas).toHaveLength(2)
  })
})

describe('notaRaiz', () => {
  it('extrai nota simples', () => {
    expect(notaRaiz('Am')).toBe('A')
    expect(notaRaiz('C')).toBe('C')
  })

  it('extrai nota com sustenido', () => {
    expect(notaRaiz('F#m7')).toBe('F#')
  })

  it('extrai nota com bemol', () => {
    expect(notaRaiz('Bb7')).toBe('Bb')
  })
})
