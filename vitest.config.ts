import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        // Os de integracao so correm com npm run test:db (base de teste)
        exclude: ['**/node_modules/**', 'tests/integracao/**'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
})
