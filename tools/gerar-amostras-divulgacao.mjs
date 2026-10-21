// Gera as miniaturas dos estilos × cores da Divulgação (public/images/divulgacao/amostras/<estilo>-<paleta>.jpg).
// Precisa do portal de TESTE a correr (porta por omissão 3017) e da conta admin@a.teste. Voltar a correr se mudarem
// PALETAS ou ESTILOS em lib/divulgacao.ts.   node tools/gerar-amostras-divulgacao.mjs [porta]
import fs from 'node:fs'
import puppeteer from 'file:///C:/Users/vagne/Documents/repos/aragaohub/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'
import sharp from 'sharp'

const BASE = `http://localhost:${process.argv[2] || 3017}`
const src = fs.readFileSync(new URL('../lib/divulgacao.ts', import.meta.url), 'utf8')
const paletas = [...src.slice(src.indexOf('export const PALETAS'), src.indexOf('export const FUNDOS')).matchAll(/\{ id: '([^']+)', nome:/g)].map((m) => m[1])
const estilos = [...src.slice(src.indexOf('export const ESTILOS'), src.indexOf('export type EstiloId')).matchAll(/\{ id: '([^']+)'/g)].map((m) => m[1])
console.log(`${estilos.length} estilos × ${paletas.length} cores`)
const OUT = new URL('../public/images/divulgacao/amostras/', import.meta.url)
fs.mkdirSync(OUT, { recursive: true })

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
    const p = await b.newPage()
    await p.goto(`${BASE}/membros/login`, { waitUntil: 'networkidle2', timeout: 240000 })
    await p.type('input[type=email]', 'admin@a.teste'); await p.type('input[type=password]', 'senha-de-teste-123')
    await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 }).catch(() => {}), p.keyboard.press('Enter')])
    for (const e of estilos) for (const c of paletas) {
        const q = `peca=oracao&estilo=${e}&paleta=${c}&dia=2026-10-25&previa=1`
        const dados = await p.evaluate(async (u) => { const r = await fetch(u); return r.ok ? Array.from(new Uint8Array(await r.arrayBuffer())) : null }, `${BASE}/api/divulgacao/imagem?${q}`)
        if (!dados) { console.log('  ! falhou', e, c); continue }
        const jpg = await sharp(Buffer.from(dados)).resize({ width: 320 }).jpeg({ quality: 68, mozjpeg: true }).toBuffer()
        fs.writeFileSync(new URL(`${e}-${c}.jpg`, OUT), jpg)
    }
    console.log('feito')
} finally { await b.close() }
