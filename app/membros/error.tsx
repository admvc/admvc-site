'use client'

import EcraErro from '@/components/ui/EcraErro'

export default function MembrosError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <EcraErro error={error} reset={reset} voltar={{ href: '/membros/dashboard', texto: 'Painel' }} />
}
