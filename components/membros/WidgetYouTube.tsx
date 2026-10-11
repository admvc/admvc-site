import { Play } from 'lucide-react'
import type { YouTubeVideo } from '@/lib/youtube-rss'

export default function WidgetYouTube({ videoId, title, thumbnailUrl, publishedAt }: YouTubeVideo) {
    const dataFormatada = publishedAt
        ? new Date(publishedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
        : ''

    return (
        <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-bg2 border border-soft rounded-2xl overflow-hidden block hover:border-figueira/30 transition-all group"
        >
            <div className="relative aspect-video bg-black/20">
                <img
                    src={thumbnailUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                        <Play size={20} className="text-white ml-0.5" fill="white" />
                    </div>
                </div>
            </div>
            <div className="p-4">
                <p className="text-[8px] font-black uppercase tracking-widest text-red-500 mb-1">YouTube</p>
                <h3 className="text-xs font-bold text-fg line-clamp-2 leading-snug">{title}</h3>
                {dataFormatada && (
                    <p className="text-[8px] text-muted mt-1.5">{dataFormatada}</p>
                )}
            </div>
        </a>
    )
}
