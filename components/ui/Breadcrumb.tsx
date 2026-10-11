import Link from 'next/link'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import React from 'react'

interface BreadcrumbItem {
    label: string;
    href?: string;
    isBackIcon?: boolean; // Mostra a seta a apontar para trás (<-)
    hideOnMobile?: boolean; // Esconde o item em ecrãs de telemóvel para não quebrar o layout
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
    return (
        <nav className="flex items-center flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-muted mb-6">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <React.Fragment key={index}>
                        {/* Mostra a setinha (>) entre os itens, exceto antes do primeiro */}
                        {index > 0 && (
                            <ChevronRight size={12} className={`opacity-40 ${item.hideOnMobile ? 'hidden sm:block' : ''}`} />
                        )}

                        {isLast ? (
                            // O ÚLTIMO ITEM: Fica sempre em destaque (Azul) e não é clicável
                            <span className={`text-blue-600 bg-blue-50 px-4 py-2.5 rounded-xl border border-blue-100 shadow-sm ${item.hideOnMobile ? 'hidden sm:block' : ''}`}>
                                {item.label}
                            </span>
                        ) : item.href ? (
                            // ITENS COM LINK: São clicáveis e têm hover
                            <Link 
                                href={item.href} 
                                className={`flex items-center gap-2 hover:text-blue-600 transition-colors bg-bg2 px-4 py-2.5 rounded-xl border border-soft shadow-sm hover:border-blue-200 ${item.hideOnMobile ? 'hidden sm:block' : ''}`}
                            >
                                {item.isBackIcon && <ArrowLeft size={14} />}
                                {item.label}
                            </Link>
                        ) : (
                            // ITENS SEM LINK (Intermédios apenas para leitura)
                            <span className={`bg-bg2 px-4 py-2.5 rounded-xl border border-soft shadow-sm ${item.hideOnMobile ? 'hidden sm:block' : ''}`}>
                                {item.isBackIcon && <ArrowLeft size={14} className="inline mr-2" />}
                                {item.label}
                            </span>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}