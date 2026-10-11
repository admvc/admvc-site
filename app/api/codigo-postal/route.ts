// app/api/codigo-postal/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    const cp = request.nextUrl.searchParams.get('cp')

    console.log(`[API CODIGO POSTAL] Pedido recebido para CP: "${cp}"`)

    if (!cp || cp.length < 7) {
        return NextResponse.json({ erro: 'CP invalido' }, { status: 400 })
    }

    try {
        const url = `https://json.geoapi.pt/cp/${cp}`
        console.log(`[API CODIGO POSTAL] A consultar: ${url}`)

        const res = await fetch(url, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'ADMVC/1.0' },
            next: { revalidate: 86400 }
        })

        console.log(`[API CODIGO POSTAL] Status da resposta: ${res.status}`)

        if (!res.ok) {
            return NextResponse.json({ erro: `CP nao encontrado (status ${res.status})` }, { status: 404 })
        }

        const data = await res.json()
        console.log(`[API CODIGO POSTAL] Dados recebidos:`, JSON.stringify(data))

        return NextResponse.json(data)
    } catch (err: any) {
        console.error(`[API CODIGO POSTAL] ERRO:`, err.message)
        return NextResponse.json({ erro: 'Erro ao consultar API externa' }, { status: 500 })
    }
}