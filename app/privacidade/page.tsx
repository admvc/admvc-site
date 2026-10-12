import Link from 'next/link'
import { MESES_RETENCAO_PEDIDO_ORACAO, MESES_RETENCAO_VISITANTE } from '@/lib/rgpd'

export const metadata = { title: 'Política de privacidade — ADMVC' }

// Dados do responsavel pelo tratamento. Preencher o que esta "por preencher".
const RESPONSAVEL = {
    nome: 'Igreja Assembleia de Deus Ministério Visão de Conquista (ADMVC)', // confirmar o nome legal
    nipc: '', // por preencher
    morada: '', // por preencher
    email: 'acolhimento@igrejaadmvc.org', // confirmar (idealmente um email só para privacidade)
}
const ATUALIZADA_EM = '11 de outubro de 2026'

function Campo({ valor }: { valor: string }) {
    return valor ? <>{valor}</> : <mark className="bg-amber-200 px-1 text-black">por preencher</mark>
}

export default function PrivacidadePage() {
    return (
        <main className="min-h-screen bg-bg text-fg">
            <article className="mx-auto max-w-2xl px-4 py-12 space-y-8 text-sm leading-relaxed">
                <header className="space-y-2">
                    <h1 className="text-3xl font-black">Política de privacidade</h1>
                    <p className="text-muted">Atualizada a {ATUALIZADA_EM}.</p>
                </header>

                <section className="space-y-2">
                    <h2 className="text-lg font-bold">Quem trata os dados</h2>
                    <p>
                        <strong>{RESPONSAVEL.nome}</strong>, NIPC <Campo valor={RESPONSAVEL.nipc} />, com sede em{' '}
                        <Campo valor={RESPONSAVEL.morada} />. Contacto para assuntos de privacidade:{' '}
                        <a className="underline" href={`mailto:${RESPONSAVEL.email}`}>{RESPONSAVEL.email}</a>.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-lg font-bold">Que dados guardamos e porquê</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>Visitantes</strong> (formulário de boas-vindas e marcações): nome, telefone, email e,
                            se o escrever, o pedido de oração. Servem para o acolher e contactar.
                            Fundamento: o seu <strong>consentimento</strong>, que pode retirar a qualquer momento.
                        </li>
                        <li>
                            <strong>Membros</strong>: identificação, contactos, morada, família, dados da vida da igreja
                            (batismo, ministérios, grupos, escalas) e foto. Servem para organizar a comunidade.
                            Fundamento: a pertença a uma organização religiosa sem fins lucrativos, que pode tratar os
                            dados dos seus membros no âmbito das suas atividades (RGPD, art. 9.º, n.º 2, alínea d), e o
                            consentimento dado no termo de adesão.
                        </li>
                        <li>
                            <strong>Contribuições e recibos</strong>: valores, datas e NIF. Fundamento: obrigação legal
                            (recibos para efeitos fiscais).
                        </li>
                    </ul>
                    <p>Os dados sobre convicções religiosas não são partilhados fora da igreja sem o seu consentimento.</p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-lg font-bold">Quem tem acesso</h2>
                    <p>
                        Apenas as pessoas da igreja que precisam deles para a sua função (por exemplo, a equipa de
                        acolhimento vê os visitantes; a tesouraria vê as contribuições). Usamos serviços externos que
                        tratam dados por nossa conta, sob contrato: alojamento do portal (Vercel), base de dados
                        (Prisma), envio de emails (Resend), proteção contra abusos (Upstash) e, para a cantina, o
                        sistema de caixa (Loyverse). Alguns destes serviços podem guardar dados fora da União
                        Europeia, com as garantias previstas no RGPD.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-lg font-bold">Durante quanto tempo</h2>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Visitantes: até {MESES_RETENCAO_VISITANTE} meses sem visitas nem contactos; depois são anonimizados automaticamente.</li>
                        <li>Pedidos de oração de visitantes: {MESES_RETENCAO_PEDIDO_ORACAO} meses.</li>
                        <li>Membros: enquanto for membro; depois, a pedido, os dados são anonimizados.</li>
                        <li>Recibos e registos contabilísticos: o prazo que a lei fiscal exige.</li>
                    </ul>
                </section>

                <section className="space-y-2">
                    <h2 className="text-lg font-bold">Os seus direitos</h2>
                    <p>
                        Pode pedir para ver, corrigir, levar consigo ou apagar os seus dados, opor-se ao tratamento ou
                        retirar o consentimento. Os membros podem descarregar os seus dados na área de membro
                        (Perfil → Os meus dados). Para os restantes pedidos, escreva para{' '}
                        <a className="underline" href={`mailto:${RESPONSAVEL.email}`}>{RESPONSAVEL.email}</a>;
                        respondemos no prazo de um mês.
                    </p>
                    <p>
                        Se achar que os seus dados não foram bem tratados, pode apresentar queixa à Comissão Nacional
                        de Proteção de Dados (<a className="underline" href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">cnpd.pt</a>).
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-lg font-bold">Segurança</h2>
                    <p>
                        O acesso ao portal é feito com sessão pessoal e palavra-passe, as ligações são cifradas e são
                        feitas cópias de segurança cifradas da base de dados.
                    </p>
                </section>

                <p className="pt-4">
                    <Link href="/membros/login" className="underline text-muted">Voltar</Link>
                </p>
            </article>
        </main>
    )
}
