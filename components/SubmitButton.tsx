// components/SubmitButton.tsx
"use client"
import { useFormStatus } from 'react-dom'
import { useEffect } from 'react'

export default function SubmitButton({ label }: { label: string }) {
    const { pending, data } = useFormStatus();

    // Opcional: Você pode disparar um alert aqui quando o status mudar de pending para pronto
    // Mas o uso do status no botão já resolve 90% da experiência profissional.

    return (
        <button
            type="submit"
            disabled={pending}
            className="..."
        >
            {pending ? "A GUARDAR DADOS..." : label}
        </button>
    )
}