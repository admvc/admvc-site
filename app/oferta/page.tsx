// /oferta — página aberta (a que o QR do telão abre): IBAN e MB WAY com botão "Copiar". Os dados vêm no endereço
// (já estão no telão) e vêm assinados pelo portal: um link com outro IBAN não abre. Nada é lido da base. Nunca indexada.
import type { Metadata } from 'next'
import { ibanEmGrupos, ibanValido, limparIban } from '@/lib/oferta'
import { ofertaAssinada } from '@/lib/oferta-assinatura'
import CopiarTexto from './CopiarTexto'

export const metadata: Metadata = { title: 'Oferta · ADMVC', robots: { index: false, follow: false } }

export default async function PaginaOferta({ searchParams }: { searchParams: Promise<{ i?: string; t?: string; m?: string; s?: string }> }) {
    const { i, t, m, s } = await searchParams
    const valido = typeof i === 'string' && ofertaAssinada(i, typeof t === 'string' ? t : '', typeof m === 'string' ? m : '', typeof s === 'string' ? s : undefined)
    const iban = limparIban(String(i ?? '').slice(0, 40))
    const titular = String(t ?? '').slice(0, 70).trim()
    const mbway = String(m ?? '').replace(/[^\d+ ]/g, '').slice(0, 20).trim()

    return (
        <main className="app-novo mx-auto max-w-md space-y-5 px-4 py-10">
            <header className="space-y-1 text-center">
                <p className="text-[14px] font-semibold uppercase tracking-widest a-suave">Igreja ADMVC</p>
                <h1 className="text-[28px] font-bold">Oferta</h1>
                <p className="text-[16px] a-suave">“Deus ama ao que dá com alegria.” 2 Coríntios 9:7</p>
            </header>
            {!valido || !ibanValido(iban) ? (
                <p className="a-card p-5 text-center text-[16px]">Este endereço não está completo. Peça o link outra vez à igreja.</p>
            ) : (
                <section className="space-y-4">
                    {titular && <p className="text-center text-[16px]">Titular: <strong>{titular}</strong></p>}
                    <CopiarTexto rotulo="IBAN" valor={iban} mostrar={ibanEmGrupos(iban)} />
                    {mbway && <CopiarTexto rotulo="MB WAY" valor={mbway.replace(/\s/g, '')} mostrar={mbway} />}
                    <p className="text-center text-[14px] a-suave">Abra a app do seu banco, escolha “Transferência” e cole o IBAN.</p>
                </section>
            )}
        </main>
    )
}
