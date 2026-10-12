// ESLint 9 (configuracao plana) com as regras do Next 15.
// Erros param o lint; os avisos sao divida a pagar aos poucos.
import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default [
    {
        ignores: [
            '.next/**', '.next-teste/**', 'node_modules/**', 'public/**',
            'prisma/migracoes-antigas/**', 'scripts/**', 'next-env.d.ts',
        ],
    },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        rules: {
            // Divida antiga (867 `any`): avisos, nao erros
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'no-console': 'off',
            // Aspas e apostrofos em texto portugues no JSX mostram-se bem; a regra so dava falsos alarmes
            'react/no-unescaped-entities': 'off',
        },
    },
]
