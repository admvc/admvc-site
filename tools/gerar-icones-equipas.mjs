// Ícones dos departamentos e grupos, no desenho dos logótipos ADMVC (círculo preto, símbolo branco, "ADMVC" com as letras do
// logótipo do Music e o nome em baixo, espaçado). Saem em PNG transparente, 512 px (app) e 2048 px (publicações), mais uma
// folha de amostras.   node tools/gerar-icones-equipas.mjs [pasta de saída]
// As letras "ADMVC" são as do logótipo do Music redesenhadas em vetor (public/images/marca/admvc-letras.svg): nítidas em qualquer tamanho.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import puppeteer from 'file:///C:/Users/vagne/Documents/repos/aragaohub/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js'

const RAIZ = 'C:/Users/vagne/Documents/repos/admvc'
const SAIDA = process.argv[2] || `${RAIZ}/tmp/MKT/saida/icones`
const LETRAS = fs.readFileSync(`${RAIZ}/public/images/marca/admvc-letras.svg`).toString('base64')
const FONTE = fs.readFileSync(`${RAIZ}/public/fonts/divulgacao/Montserrat-500.ttf`).toString('base64')

async function lucide(nome) {
    const m = await import(`file:///${RAIZ}/node_modules/lucide-react/dist/esm/icons/${nome}.js`)
    return m.__iconNode.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('')
}
// símbolos próprios: as barras do Music e duas alianças
const BARRAS = '<rect x="4.2" y="9" width="2.2" height="6" rx="1.1"/><rect x="7.9" y="5.5" width="2.2" height="13" rx="1.1"/><rect x="11.6" y="2.5" width="2.2" height="19" rx="1.1"/><rect x="15.3" y="5.5" width="2.2" height="13" rx="1.1"/><rect x="19" y="9" width="2.2" height="6" rx="1.1"/>'
const ALIANCAS = '<circle cx="9" cy="13" r="5.5"/><circle cx="15" cy="13" r="5.5"/><path d="M14.2 4.2l0.8 1.6 0.8-1.6"/>'

// tipo, id na base (produção), nome curto, símbolo
const EQUIPAS = [
    ['departamento', 5, 'Acolhimento e Integração', 'ACOLHIMENTO', { lucide: 'heart-handshake' }],
    ['departamento', 2, 'Ministério de Louvor', 'LOUVOR', { svg: BARRAS, cheio: true }],
    ['departamento', 8, 'Ministério de Mídia e Comunicação', 'MÍDIA', { lucide: 'camera' }],
    ['departamento', 1, 'Ministério dos Obreiros', 'OBREIROS', { lucide: 'key-round' }],
    ['grupo', 13, 'Assistência Social', 'ASSISTÊNCIA SOCIAL', { lucide: 'hand-heart' }],
    ['grupo', 11, 'Cantina', 'CANTINA', { lucide: 'coffee' }],
    ['grupo', 10, 'Departamento de Casais', 'CASAIS', { svg: ALIANCAS }],
    ['grupo', 9, 'Departamento de Dança e Artes', 'DANÇA E ARTES', { lucide: 'palette' }],
    ['grupo', 1, 'Departamento de Homens', 'HOMENS', { lucide: 'shield' }],
    ['grupo', 4, 'Departamento de Jovens e Adolescentes', 'JOVENS', { lucide: 'flame' }],
    ['grupo', 2, 'Departamento de Mulheres', 'MULHERES', { lucide: 'flower-2' }],
    ['grupo', 12, 'Evangelismo e Missões', 'MISSÕES', { lucide: 'globe' }],
    ['grupo', 6, 'PG Buarcos', 'PG BUARCOS', { lucide: 'house' }],
]

const slug = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function pagina(simbolo, cheio, rotulo) {
    const S = 2048
    const traco = cheio ? 'fill="#fff" stroke="none"' : 'fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"'
    const tamRotulo = rotulo.length > 14 ? 62 : rotulo.length > 10 ? 72 : 84
    return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: M; src: url(data:font/ttf;base64,${FONTE}); font-weight: 500; }
html,body { margin:0; background: transparent; }
.c { width:${S}px; height:${S}px; border-radius:50%; background:#000; position:relative; overflow:hidden; }
.s { position:absolute; left:50%; top:16%; width:35%; height:35%; transform:translateX(-50%); }
.l { position:absolute; left:50%; top:58%; width:62%; transform:translateX(-50%); }
.r { position:absolute; left:0; right:0; top:74.5%; text-align:center; color:#fff; font-family:M; font-weight:500; font-size:${tamRotulo}px; letter-spacing:${Math.round(tamRotulo * 0.62)}px; padding-left:${Math.round(tamRotulo * 0.62)}px; white-space:nowrap; }
</style></head><body><div class="c">
<svg class="s" viewBox="0 0 24 24" ${traco}>${simbolo}</svg>
<img class="l" src="data:image/svg+xml;base64,${LETRAS}">
<div class="r">${rotulo}</div>
</div></body></html>`
}

const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const feitos = []
try {
    const p = await b.newPage()
    await p.setViewport({ width: 2048, height: 2048 })
    for (const [tipo, id, nome, rotulo, simb] of EQUIPAS) {
        const svg = simb.svg ?? await lucide(simb.lucide)
        await p.setContent(pagina(svg, !!simb.cheio, rotulo), { waitUntil: 'load' })
        await p.evaluate(() => document.fonts.ready)
        const png = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: 2048, height: 2048 } })
        const base = `${tipo}-${id}-${slug(nome)}`
        await sharp(png).png({ compressionLevel: 9 }).toFile(path.join(SAIDA, `${base}-2048.png`))
        await sharp(png).resize(512, 512).png({ compressionLevel: 9 }).toFile(path.join(SAIDA, `${base}-512.png`))
        feitos.push({ base, nome: rotulo })
        console.log('feito', base)
    }
} finally { await b.close() }

// folha de amostras (5 por linha, com o nome por baixo)
const lado = 300, margem = 30, porLinha = 5, linhas = Math.ceil(feitos.length / porLinha)
const W = porLinha * (lado + margem) + margem, H = linhas * (lado + 90) + margem
const pecas = await Promise.all(feitos.map(async (f, i) => ({
    input: await sharp(path.join(SAIDA, `${f.base}-512.png`)).resize(lado, lado).toBuffer(),
    left: margem + (i % porLinha) * (lado + margem), top: margem + Math.floor(i / porLinha) * (lado + 90),
})))
const textos = feitos.map((f, i) => `<text x="${margem + (i % porLinha) * (lado + margem) + lado / 2}" y="${margem + Math.floor(i / porLinha) * (lado + 90) + lado + 40}" font-family="Arial" font-size="22" fill="#333" text-anchor="middle">${f.nome.replace(/&/g, '&amp;')}</text>`).join('')
await sharp({ create: { width: W, height: H, channels: 4, background: '#f2f2f2' } })
    .composite([...pecas, { input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${textos}</svg>`), left: 0, top: 0 }])
    .png().toFile(path.join(SAIDA, '_folha-de-amostras.png'))
console.log('folha de amostras feita')
