// tools/dev-teste.mjs
// O portal em desenvolvimento contra a base de TESTE (schema admvc_teste):
//   npm run dev:teste        → http://localhost:3001
//
// Porta 3001 e pasta de build .next-teste, para poder correr ao lado do
// `npm run dev` normal sem os confundir. Contas: ver tools/base-de-teste.mjs.

import { spawnSync } from 'node:child_process'
import { urlDeTeste } from './url-de-teste.mjs'

const url = urlDeTeste()
console.log(`Base de TESTE (schema admvc_teste) — http://localhost:3001`)
const r = spawnSync('npx', ['next', 'dev', '-p', '3001', ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL: url, NEXT_DIST_DIR: '.next-teste' },
})
process.exit(r.status ?? 1)
