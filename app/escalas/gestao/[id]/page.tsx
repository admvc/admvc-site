// O painel antigo de escalas de um ministerio passou para a lista nova (culto a
// culto, como o LouveApp), igual para todos os ministerios.
import { redirect } from 'next/navigation'

export default async function GestaoEscalaAntiga({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    redirect(`/escalas?equipa=${Number(id) || ''}`)
}
