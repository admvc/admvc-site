import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { getSessionData } from '@/lib/auth-utils';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // So quem tem sessao recebe autorizacao para enviar ficheiros.
                // (O aviso de fim de upload vem da Vercel, sem cookie.)
                if (!(await getSessionData())) throw new Error('Sem sessão.');
                return {
                    allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                    maximumSizeInBytes: 10 * 1024 * 1024, // 10MB (sera comprimido no client)
                    addRandomSuffix: true,
                    tokenPayload: JSON.stringify({}),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Upload finalizado no Blob:', blob.url);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
