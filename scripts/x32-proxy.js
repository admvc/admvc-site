#!/usr/bin/env node
/**
 * ADMVC X32 Proxy — Ponte WebSocket ↔ OSC para Behringer X32
 *
 * Uso:
 *   node x32-proxy.js [porta_ws]
 *   npx admvc-x32-proxy
 *
 * O que faz:
 *   1. Abre um servidor WebSocket na porta especificada (default: 8080)
 *   2. Recebe comandos JSON do browser (Cloud ADMVC)
 *   3. Converte para OSC e envia ao X32 via UDP
 *   4. Recebe respostas OSC do X32 e envia de volta ao browser
 *
 * Requisitos:
 *   - Node.js 18+
 *   - Estar na mesma rede que o X32
 *   - npm install ws (ou já incluido)
 */

const dgram = require('dgram')
const http = require('http')

const WS_PORT = parseInt(process.argv[2] || '8080')

// Tentar importar ws, se não existir, instruir instalação
let WebSocket, WebSocketServer
try {
    const ws = require('ws')
    WebSocketServer = ws.WebSocketServer || ws.Server
} catch {
    console.error('❌ Módulo "ws" não encontrado.')
    console.error('   Execute: npm install ws')
    console.error('   Depois: node x32-proxy.js')
    process.exit(1)
}

// ============================================================================
// OSC HELPERS (minimalista)
// ============================================================================

function encodeOSCString(str) {
    const buf = Buffer.from(str + '\0')
    const padding = 4 - (buf.length % 4)
    return padding < 4 ? Buffer.concat([buf, Buffer.alloc(padding)]) : buf
}

function encodeOSCFloat(value) {
    const buf = Buffer.alloc(4)
    buf.writeFloatBE(value, 0)
    return buf
}

function encodeOSCInt(value) {
    const buf = Buffer.alloc(4)
    buf.writeInt32BE(value, 0)
    return buf
}

function buildOSCMessage(address, type, value) {
    const addrBuf = encodeOSCString(address)
    const typeBuf = encodeOSCString(',' + type)
    const valBuf = type === 'f' ? encodeOSCFloat(value) : encodeOSCInt(value)
    return Buffer.concat([addrBuf, typeBuf, valBuf])
}

function parseOSCMessage(buf) {
    try {
        // Ler endereço
        let i = 0
        while (i < buf.length && buf[i] !== 0) i++
        const address = buf.toString('ascii', 0, i)
        // Alinhar a 4 bytes
        i = Math.ceil((i + 1) / 4) * 4
        // Ler tipo
        if (buf[i] !== 0x2C) return null // ','
        i++
        const type = String.fromCharCode(buf[i])
        i++
        i = Math.ceil((i + 1) / 4) * 4
        // Ler valor
        let value
        if (type === 'f') value = buf.readFloatBE(i)
        else if (type === 'i') value = buf.readInt32BE(i)
        else if (type === 's') {
            // Ler string OSC
            let j = i
            while (j < buf.length && buf[j] !== 0) j++
            value = buf.toString('ascii', i, j)
        }
        else value = null
        return { address, type, value }
    } catch {
        return null
    }
}

// ============================================================================
// SERVIDOR
// ============================================================================

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' })
    res.end('ADMVC X32 Proxy OK')
})

const wss = new WebSocketServer({ server })
const udpClients = new Map() // ws → { socket, target }

wss.on('connection', (ws) => {
    console.log('🔗 Browser conectado')

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString())

            if (msg.type === 'subscribe') {
                // Criar socket UDP para este cliente
                const socket = dgram.createSocket('udp4')
                const target = { ip: msg.target, port: msg.port || 10023 }

                socket.on('message', (buf) => {
                    const osc = parseOSCMessage(buf)
                    if (osc && ws.readyState === 1) {
                        // Fader value
                        if (osc.address.includes('/mix/fader')) {
                            const channel = osc.address.replace('/mix/fader', '').replace(/^\//, '')
                            ws.send(JSON.stringify({ type: 'fader', channel, value: osc.value }))
                        }
                        // Mute status
                        if (osc.address.includes('/mix/on')) {
                            const channel = osc.address.replace('/mix/on', '').replace(/^\//, '')
                            ws.send(JSON.stringify({ type: 'mute', channel, muted: osc.value === 0 }))
                        }
                        // Channel/bus name
                        if (osc.address.includes('/config/name') && osc.type === 's') {
                            const channel = osc.address.replace('/config/name', '').replace(/^\//, '')
                            ws.send(JSON.stringify({ type: 'label', channel, name: osc.value || '' }))
                        }
                    }
                })

                udpClients.set(ws, { socket, target })
                console.log(`📡 Subscrito ao X32 em ${target.ip}:${target.port}`)

                // Pedir valores iniciais dos primeiros 32 canais (fader, mute, nome)
                for (let i = 1; i <= 32; i++) {
                    const ch = String(i).padStart(2, '0')
                    socket.send(encodeOSCString(`/ch/${ch}/mix/fader`), target.port, target.ip)
                    socket.send(encodeOSCString(`/ch/${ch}/mix/on`), target.port, target.ip)
                    socket.send(encodeOSCString(`/ch/${ch}/config/name`), target.port, target.ip)
                }
                // Mix bus (fader, mute, nome)
                for (let i = 1; i <= 16; i++) {
                    const ch = String(i).padStart(2, '0')
                    socket.send(encodeOSCString(`/bus/${ch}/mix/fader`), target.port, target.ip)
                    socket.send(encodeOSCString(`/bus/${ch}/mix/on`), target.port, target.ip)
                    socket.send(encodeOSCString(`/bus/${ch}/config/name`), target.port, target.ip)
                }
                // Main/mono fader e mute
                socket.send(encodeOSCString('/main/st/mix/fader'), target.port, target.ip)
                socket.send(encodeOSCString('/main/st/mix/on'), target.port, target.ip)
                socket.send(encodeOSCString('/main/m/mix/fader'), target.port, target.ip)
                socket.send(encodeOSCString('/main/m/mix/on'), target.port, target.ip)
            }

            if (msg.type === 'fader' && udpClients.has(ws)) {
                const { socket, target } = udpClients.get(ws)
                const oscMsg = buildOSCMessage(msg.osc, 'f', msg.value)
                socket.send(oscMsg, target.port, target.ip)
                console.log(`🎚️ ${msg.osc} = ${Math.round(msg.value * 100)}%`)
            }

            if (msg.type === 'mute' && udpClients.has(ws)) {
                const { socket, target } = udpClients.get(ws)
                const oscMsg = buildOSCMessage(msg.osc, 'i', msg.muted ? 0 : 1)
                socket.send(oscMsg, target.port, target.ip)
                console.log(`🔇 ${msg.osc} = ${msg.muted ? 'MUTE' : 'ON'}`)
            }
        } catch (err) {
            console.error('Erro ao processar mensagem:', err.message)
        }
    })

    ws.on('close', () => {
        const client = udpClients.get(ws)
        if (client) {
            client.socket.close()
            udpClients.delete(ws)
        }
        console.log('🔌 Browser desconectado')
    })
})

server.listen(WS_PORT, () => {
    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log('  ADMVC X32 Proxy')
    console.log('═══════════════════════════════════════════')
    console.log(`  WebSocket: ws://localhost:${WS_PORT}`)
    console.log('  Status: A aguardar conexao do browser...')
    console.log('')
    console.log('  No Cloud ADMVC, use este endereco:')
    console.log(`  ws://localhost:${WS_PORT}`)
    console.log('═══════════════════════════════════════════')
    console.log('')
})
