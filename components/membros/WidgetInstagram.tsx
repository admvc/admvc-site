import { ChevronRight } from 'lucide-react'

export default function WidgetInstagram({ handle }: { handle: string }) {
    return (
        <a
            href={`https://www.instagram.com/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-bg2 border border-soft rounded-2xl p-5 flex items-center gap-4 hover:border-figueira/30 transition-all group"
        >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shrink-0 shadow-lg">
                <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black uppercase tracking-widest text-pink-500 mb-0.5">Instagram</p>
                <p className="text-sm font-bold text-fg">@{handle}</p>
                <p className="text-[9px] text-muted mt-0.5">Segue-nos no Instagram</p>
            </div>
            <ChevronRight size={16} className="text-muted group-hover:text-figueira transition-colors shrink-0" />
        </a>
    )
}
