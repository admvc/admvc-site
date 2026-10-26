'use client'

// Quando falha o próprio layout: sem o layout da app, por isso com html/body e o CSS global.
import './globals.css'
import EcraErro from '@/components/ui/EcraErro'

export default function ErroDaRaiz({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <html lang="pt">
            <body className="bg-bg text-fg">
                <EcraErro error={error} reset={reset} />
            </body>
        </html>
    )
}
