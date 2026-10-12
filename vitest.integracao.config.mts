// Testes de integracao (npm run test:db): correm contra a base de TESTE
// (schema admvc_teste, ver tools/url-de-teste.mjs). Antes: npm run test:db:preparar
import { defineConfig } from 'vitest/config'
import path from 'path'
import { urlDeTeste } from './tools/url-de-teste.mjs'

const url = urlDeTeste()

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['tests/integracao/**/*.test.ts'],
        setupFiles: ['tests/integracao/setup.ts'],
        fileParallelism: false,
        testTimeout: 60000,
        hookTimeout: 120000,
        env: {
            DATABASE_URL: url,
            SESSION_SECRET: 'segredo-so-dos-testes-de-integracao-0123456789',
            NODE_ENV: 'test',
        },
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, '.') },
    },
})
