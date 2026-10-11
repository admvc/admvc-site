import { describe, it, expect } from 'vitest'
import { hexToRgb, gerarCorDeep, isFundoClaro, gerarBg2, gerarBorder, gerarFg, gerarMuted } from '../branding'

describe('hexToRgb', () => {
  it('converte preto', () => {
    expect(hexToRgb('#000000')).toBe('0, 0, 0')
  })

  it('converte branco', () => {
    expect(hexToRgb('#ffffff')).toBe('255, 255, 255')
  })

  it('converte cor arbitraria', () => {
    expect(hexToRgb('#3F6B4F')).toBe('63, 107, 79')
  })

  it('converte vermelho puro', () => {
    expect(hexToRgb('#ff0000')).toBe('255, 0, 0')
  })
})

describe('gerarCorDeep', () => {
  it('escurece uma cor subtraindo 30 de cada canal', () => {
    // #3F6B4F → r=63-30=33, g=107-30=77, b=79-30=49
    expect(gerarCorDeep('#3F6B4F')).toBe('#214d31')
  })

  it('nao vai abaixo de 0', () => {
    // #101010 → r=16-30=0, g=16-30=0, b=16-30=0
    expect(gerarCorDeep('#101010')).toBe('#000000')
  })

  it('funciona com cor clara', () => {
    // #ffffff → r=255-30=225, g=255-30=225, b=255-30=225
    expect(gerarCorDeep('#ffffff')).toBe('#e1e1e1')
  })
})

describe('isFundoClaro', () => {
  it('detecta branco como claro', () => {
    expect(isFundoClaro('#ffffff')).toBe(true)
  })

  it('detecta preto como escuro', () => {
    expect(isFundoClaro('#000000')).toBe(false)
  })

  it('detecta cinza claro como claro', () => {
    expect(isFundoClaro('#cccccc')).toBe(true)
  })

  it('detecta cor escura do projecto como escuro', () => {
    expect(isFundoClaro('#0b0d0c')).toBe(false)
  })

  it('detecta amarelo como claro', () => {
    expect(isFundoClaro('#ffff00')).toBe(true)
  })
})

describe('gerarBg2', () => {
  it('clareia ligeiramente a cor', () => {
    const resultado = gerarBg2('#0b0d0c')
    // r=11+12=23, g=13+14=27, b=12+12=24
    expect(resultado).toBe('#171b18')
  })

  it('nao ultrapassa 255', () => {
    const resultado = gerarBg2('#fafafa')
    // r=250+12=255, g=250+14=255, b=250+12=255
    expect(resultado).toBe('#ffffff')
  })
})

describe('gerarBorder', () => {
  it('gera cor de border mais clara que fundo', () => {
    const resultado = gerarBorder('#0b0d0c')
    // r=11+20=31, g=13+22=35, b=12+20=32
    expect(resultado).toBe('#1f2320')
  })
})

describe('gerarFg', () => {
  it('retorna texto escuro para fundo claro', () => {
    expect(gerarFg('#ffffff')).toBe('#1a1a1a')
  })

  it('retorna texto claro para fundo escuro', () => {
    expect(gerarFg('#000000')).toBe('#e6efea')
  })
})

describe('gerarMuted', () => {
  it('retorna cinza para fundo claro', () => {
    expect(gerarMuted('#ffffff')).toBe('#6b7280')
  })

  it('retorna verde claro para fundo escuro', () => {
    expect(gerarMuted('#000000')).toBe('#b8cfc4')
  })
})
