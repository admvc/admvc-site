export interface YouTubeVideo {
    videoId: string
    title: string
    thumbnailUrl: string
    publishedAt: string
}

export async function fetchLatestYouTubeVideo(channelId: string): Promise<YouTubeVideo | null> {
    try {
        const res = await fetch(
            `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
            { next: { revalidate: 3600 } }
        )
        if (!res.ok) return null

        const xml = await res.text()

        // Extrair primeiro <entry> do Atom feed
        const entryMatch = xml.match(/<entry>([\s\S]*?)<\/entry>/)
        if (!entryMatch) return null

        const entry = entryMatch[1]

        const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1]
        const title = entry.match(/<title>(.*?)<\/title>/)?.[1]
        const publishedAt = entry.match(/<published>(.*?)<\/published>/)?.[1]

        if (!videoId || !title) return null

        return {
            videoId,
            title: decodeXmlEntities(title),
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            publishedAt: publishedAt || '',
        }
    } catch {
        return null
    }
}

function decodeXmlEntities(str: string): string {
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
}
