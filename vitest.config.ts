import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        // Os de integracao so correm com npm run test:db (base de teste)
        exclude: ['**/node_modules/**', 'tests/integracao/**'],
    },
    // o tsconfig tem jsx "preserve" (é o Next que compila); para os testes que desenham imagens (.tsx) o esbuild compila o JSX
    oxc: { jsx: { runtime: 'automatic' } },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
})
