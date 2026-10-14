/** @type {import('next').NextConfig} */
const nextConfig = {
    // npm run dev:teste usa .next-teste, para correr ao lado do dev normal
    distDir: process.env.NEXT_DIST_DIR || '.next',
    transpilePackages: ['@react-pdf/renderer'],
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '*.public.blob.vercel-storage.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
        ],
    },

    async headers() {
        return [
            {
                source: '/api/public/:path*',
                headers: [
                    {
                        key: 'Access-Control-Allow-Origin',
                        value: process.env.NODE_ENV === 'production'
                            ? 'https://www.igrejaadmvc.org'
                            : '*',
                    },
                    { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
                    { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
                ],
            },
            {
                // A obra (números agregados, só leitura) também é lida pelo telão do
                // VOLTA, noutro domínio. Vem depois da regra acima, por isso ganha.
                source: '/api/public/obra',
                headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
            },
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains; preload',
                    },
                ],
            },
        ];
    },
};

export default nextConfig;