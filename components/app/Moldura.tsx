'use client'

// Moldura das paginas do membro: menu lateral (computador), cabecalho e barra de
// baixo (telemovel). Nao aparece nas paginas de entrada nem no modo palco.

import { Fragment } from 'react'
import { usePathname } from 'next/navigation'

const SEM_MOLDURA = ['/membros/login', '/membros/recuperar', '/membros/nova-senha', '/membros/selecionar-congregacao', '/louvor/setlist']

export default function Moldura({ menu, cabecalho, barra, children }: {
    menu: React.ReactNode
    cabecalho: React.ReactNode
    barra: React.ReactNode
    children: React.ReactNode
}) {
    const pathname = usePathname()
    if (SEM_MOLDURA.some((p) => pathname.startsWith(p))) return <>{children}</>
    return (
        <>
            <Fragment key="menu">{menu}</Fragment>
            <Fragment key="cabecalho">{cabecalho}</Fragment>
            <div key="conteudo" className="md:pl-20 lg:pl-64">{children}</div>
            <Fragment key="barra">{barra}</Fragment>
        </>
    )
}
