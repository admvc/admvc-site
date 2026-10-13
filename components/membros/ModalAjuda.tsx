'use client'

// Ajuda da app do membro: perguntas curtas, so sobre o que a pessoa tem no menu
// (os mesmos itens da barra de baixo / menu lateral). Atualizada a 13/10.

import { useState } from 'react'
import {
    BellRing, BookOpen, CalendarCheck2, CalendarClock, CalendarDays, CalendarX2, Car, GraduationCap, HelpCircle,
    Home, KeyRound, ListMusic, Megaphone, Shield, Smartphone, Users, X,
} from 'lucide-react'
import type { ItemMais } from '@/components/app/BarraBaixo'

type Secao = {
    Icone: typeof HelpCircle
    titulo: string
    texto: string[]
    /** So aparece a quem tem este item no menu ('repertorio' = louvor). */
    quando?: ItemMais['chave'] | 'repertorio'
}

const SECOES: Secao[] = [
    {
        Icone: Smartphone, titulo: 'Instalar a app no telemóvel',
        texto: [
            'Android: no Chrome, toque no menu (3 pontos) e em "Adicionar ao ecrã principal".',
            'iPhone: no Safari, toque em Partilhar (quadrado com seta) e em "Adicionar ao ecrã principal".',
            'Depois abra a app pelo ícone, como as outras.',
        ],
    },
    {
        Icone: BellRing, titulo: 'Receber avisos no telemóvel',
        texto: [
            'No Início, no cartão "Receber avisos no telemóvel", toque em "Ligar avisos" e autorize. Recebe um aviso quando for escalado, na véspera e no dia do culto.',
            'No iPhone só funciona com a app instalada no ecrã principal.',
        ],
    },
    {
        Icone: Home, titulo: 'O que aparece no Início',
        texto: [
            'A sua próxima escala, os cultos desta semana, os aniversários do mês e os seus grupos.',
            'Se serve num ministério, vê também os seus ministérios, as escalas seguintes e as datas em que não pode servir.',
            'Puxe o ecrã para baixo para atualizar.',
        ],
    },
    {
        Icone: CalendarCheck2, titulo: 'Responder a uma escala',
        texto: [
            'Quando é escalado, a escala aparece no Início. Toque em "Vou servir" ou em "Não posso" (escolha o motivo com um toque).',
            'Ao abrir a escala vê a equipa, as músicas e pode partilhar ou pôr no Google Agenda.',
        ],
    },
    {
        Icone: CalendarX2, titulo: 'Avisar que vou faltar',
        texto: [
            'No Início, em "Datas em que não posso servir", toque em "Marcar uma data". Para vários dias, preencha também "Até".',
            'O líder vê estas datas antes de fazer a escala.',
        ],
    },
    {
        Icone: CalendarDays, titulo: 'Escalas do ministério',
        texto: [
            'Em "Escalas" vê os cultos de cada ministério com a equipa de cada um, em lista ou calendário.',
            'Se está em mais do que um ministério, troque nos botões do topo.',
        ],
    },
    {
        Icone: ListMusic, titulo: 'Repertório e modo palco', quando: 'repertorio',
        texto: [
            'Em "Repertório" estão as músicas da igreja, com tom, BPM e links (vídeo, letra, cifra, áudio).',
            'Na escala do culto, "Modo palco" mostra a cifra com rolagem automática.',
        ],
    },
    {
        Icone: CalendarDays, titulo: 'Agenda da igreja', quando: 'agenda',
        texto: ['Em Mais > Agenda vê os cultos e eventos das próximas semanas. Toque num para ver a mensagem e quem serve.'],
    },
    {
        Icone: Users, titulo: 'O meu grupo',
        texto: [
            'Se participa num grupo, ele aparece no Início com o dia, a hora, a morada (toque para abrir o mapa) e os líderes.',
            'Se o grupo tem uma zona marcada, ela aparece pintada no mapa.',
            'Os líderes têm ainda "Gerir o grupo", onde também podem desenhar a zona que o grupo abrange.',
        ],
    },
    {
        Icone: Megaphone, titulo: 'Avisos', quando: 'avisos',
        texto: ['Em Mais > Avisos estão as mensagens da igreja e das suas equipas e grupos.'],
    },
    {
        Icone: Car, titulo: 'Boleias', quando: 'boleias',
        texto: ['Em Mais > Boleias pode reservar lugar numa boleia para o culto ou oferecer a sua.'],
    },
    {
        Icone: BookOpen, titulo: 'Pregações', quando: 'pregacao',
        texto: ['Em Mais > Pregações estão as mensagens pregadas na igreja.'],
    },
    {
        Icone: GraduationCap, titulo: 'Cursos', quando: 'cursos',
        texto: ['Em Mais > Cursos estão as turmas e aulas da escola bíblica.'],
    },
    {
        Icone: CalendarClock, titulo: 'Marcar atendimento', quando: 'atendimento',
        texto: ['Em Mais > Marcar atendimento pede uma conversa com o pastor ou a liderança, num dos horários livres.'],
    },
    {
        Icone: KeyRound, titulo: 'Perfil e palavra-passe', quando: 'perfil',
        texto: [
            'Em Mais > O meu perfil altera os seus dados, a foto e a palavra-passe.',
            'Esqueceu-se da palavra-passe? No ecrã de entrada toque em "Esqueci-me da palavra-passe" e receba um link por email.',
        ],
    },
    {
        Icone: Shield, titulo: 'Os meus dados e o Permanecer', quando: 'privacidade',
        texto: [
            'A igreja guarda os seus dados de forma segura, só para a vida da igreja (RGPD). Em Mais > Privacidade pode pedir para ver, corrigir, levar ou apagar os seus dados.',
            'O Permanecer é o compromisso voluntário de fazer parte desta igreja local. Pode aceitá-lo em "Termos", quando o Início o pedir.',
        ],
    },
]

export default function ModalAjuda({ trigger, itens = [], repertorio = false }: {
    trigger: React.ReactNode
    itens?: ItemMais['chave'][]
    repertorio?: boolean
}) {
    const [aberto, setAberto] = useState(false)
    const visiveis = SECOES.filter((s) => !s.quando || (s.quando === 'repertorio' ? repertorio : itens.includes(s.quando)))

    return (
        <>
            <button type="button" onClick={() => setAberto(true)} className="block w-full text-left">{trigger}</button>

            {aberto && (
                <div className="app-novo fixed inset-0 z-[100] flex items-end justify-center md:items-center md:p-4" role="dialog" aria-modal="true" aria-labelledby="ajuda-titulo">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} />
                    <div className="a-card relative flex max-h-[90vh] w-full max-w-md flex-col !rounded-b-none md:!rounded-b-[16px]"
                        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--a-borda)' }}>
                            <h2 id="ajuda-titulo" className="flex items-center gap-2 text-[22px] font-bold">
                                <HelpCircle size={24} style={{ color: 'var(--a-destaque)' }} aria-hidden /> Ajuda
                            </h2>
                            <button type="button" onClick={() => setAberto(false)} className="a-botao a-botao-secundario !px-3" aria-label="Fechar">
                                <X size={22} aria-hidden />
                            </button>
                        </div>

                        <ul className="space-y-2 overflow-y-auto p-4">
                            {visiveis.map(({ Icone, titulo, texto }) => (
                                <li key={titulo}>
                                    <details className="a-card group">
                                        <summary className="a-foco flex min-h-[56px] cursor-pointer list-none items-center gap-3 px-4 py-3">
                                            <Icone size={22} className="shrink-0" style={{ color: 'var(--a-destaque)' }} aria-hidden />
                                            <span className="flex-1 text-[17px] font-semibold">{titulo}</span>
                                        </summary>
                                        <div className="space-y-2 border-t px-4 py-3 text-[16px] leading-relaxed" style={{ borderColor: 'var(--a-borda)' }}>
                                            {texto.map((t) => <p key={t}>{t}</p>)}
                                        </div>
                                    </details>
                                </li>
                            ))}
                        </ul>
                        <p className="border-t px-4 py-3 text-[15px] a-suave" style={{ borderColor: 'var(--a-borda)' }}>
                            Não encontrou o que procurava? Fale com o líder do seu ministério ou com a equipa de acolhimento.
                        </p>
                    </div>
                </div>
            )}
        </>
    )
}
