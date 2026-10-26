'use client'

import EcraErro from '@/components/ui/EcraErro'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <EcraErro error={error} reset={reset} />
}
