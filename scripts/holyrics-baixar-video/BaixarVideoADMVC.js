// Baixar vídeo do YouTube — módulo JS do Holyrics (2.24+, Windows)
// Um botão no Holyrics: cola-se o link do vídeo, ele é descarregado para a pasta YOUTUBE dos vídeos
// (Vídeos \ YOUTUBE), e no fim pergunta se entra na lista do culto aberto e se começa a tocar.
// A qualidade por omissão é 1080p; muda-se nas definições do módulo (720p, 480p ou só o áudio).
// Usa o yt-dlp (descarregado uma vez para bin\ ao lado do BaixarVideo.exe) e o ffmpeg que já vem
// com o Holyrics. Precisa de "BaixarVideo.exe" nos ficheiros permitidos do módulo
// (Definições do módulo → Arquivos permitidos).
//
// Só se devem descarregar vídeos próprios ou com autorização para usar (o YouTube tem os seus termos).

var mID = 'admvc-baixar-video'

function info() {
    return {
        id: mID,
        name: 'Baixar vídeo do YouTube',
        description: 'Descarrega um vídeo do YouTube para a pasta YOUTUBE dos vídeos do Holyrics e, se quiseres, põe-no já na lista do culto aberto.',
        min_version: '2.24.0',
        os_required: 'windows',
        available_in_main_window: true,
        available_in_bible_window: false,
        permissions: [
            { type: 'advanced', key: 'allowed_files' },
            { type: 'advanced', key: 'edit_important_data' }   // para escrever na lista de mídia
        ]
    }
}

function settings(module) {
    return [
        { id: 'PASTA', name: 'Pasta dos vídeos', label: 'Pasta dos vídeos (em Vídeos)', type: 'string', default_value: 'YOUTUBE' },
        {
            id: 'QUALIDADE', name: 'Qualidade por omissão', label: 'Qualidade por omissão', type: 'string', default_value: '1080',
            allowed_values: [
                { value: '1080', label: '1080p — melhor para o telão' },
                { value: '720', label: '720p — mais leve e rápido' },
                { value: '480', label: '480p — para avisos e testes' },
                { value: 'audio', label: 'Só o áudio (MP3)' }
            ]
        },
        { id: 'MINUTOS', name: 'Tempo máximo (minutos)', label: 'Tempo máximo de espera (minutos)', type: 'number', min: 5, max: 180, default_value: 30 },
        { id: 'PERGUNTAR_ADICIONAR', name: 'No fim: perguntar se entra na lista', label: 'No fim: perguntar se entra na lista do culto aberto', type: 'boolean', default_value: 'true' },
        { id: 'PERGUNTAR_TOCAR', name: 'No fim: perguntar se começa a tocar', label: 'No fim: perguntar se começa a tocar', type: 'boolean', default_value: 'true' }
    ]
}

function actions(module) {
    return [{
        id: 'baixar_video',
        name: 'Baixar vídeo do YouTube',
        hint: 'Guarda o vídeo na pasta YOUTUBE e, se quiseres, põe-no na lista do culto',
        icon: 'download',
        action: function (evt) { baixar(module) }
    }]
}

// ---------------------------------------------------------------------------------------------------------------------

var ROTULOS = { '1080': '1080p', '720': '720p', '480': '480p', 'audio': 'só o áudio' }

function baixar(module) {
    var exe = exePermitido(module)
    if (!exe) return

    // Confirma que o exe é o desta versão (e não uma cópia antiga esquecida na pasta).
    var v = rodarExe(module, exe, ['--versao'], 15000)
    if (!v.ok || !v.linhas.length || v.linhas[0].substring(0, 2) !== 'V|') {
        h.notificationError('O BaixarVideo.exe não respondeu. Copie o BaixarVideo.exe novo de admvc/scripts/holyrics-baixar-video/ para a pasta indicada nos ficheiros permitidos.', 15)
        return
    }

    var s = module.settings
    var alvo = pastaDosVideos(s.PASTA || 'YOUTUBE')
    var q = String(s.QUALIDADE || '1080').toLowerCase()
    if (!ROTULOS.hasOwnProperty(q)) q = '1080'
    var ultimo = h.restore('baixar_video_url') || ''

    var campos = [
        { type: 'title', label: 'Cole o link do vídeo do YouTube.' },
        { id: 'url', key: 'url', type: 'string', label: 'Link do vídeo', default_value: ultimo },
        { type: 'separator' },
        { type: 'title', label: 'Guarda em Vídeos \\ ' + alvo.nome + ' · ' + ROTULOS[q] + '. A qualidade muda-se nas definições do módulo.' }
    ]

    var r = h.input(campos)
    if (r == null) { h.notification('Cancelado.', 3); return }

    var url = String(r.url || '').replace(/^\s+|\s+$/g, '')
    if (!/^https?:\/\//i.test(url)) { h.notificationError('Cole o link completo do vídeo (a começar por https://).', 8); return }
    if (!/(youtube\.com|youtu\.be)/i.test(url)) { h.notificationError('Esse link não parece ser do YouTube.', 8); return }

    var minutos = Math.max(5, Math.min(180, Number(s.MINUTOS) || 30))
    var prazo = minutos * 60000

    h.notification('A descarregar o vídeo. Pode levar alguns minutos; não feche o Holyrics.', 8)
    var res = rodarExe(module, exe, ['--baixar', '--url', url, '--pasta', alvo.caminho, '--qualidade', q], prazo)
    var fim = resultado(res)

    if (!fim.ok) {
        h.notificationError(fim.erro || 'Não foi possível descarregar o vídeo. Veja o registo do módulo.', 15)
        if (res.linhas.length > 1) h.log(mID, '[BaixarVideo] {}', [res.linhas.join(' / ')])
        return
    }

    h.store('baixar_video_url', url)
    h.notification('Vídeo guardado: ' + fim.nome + (fim.bytes ? ' (' + tamanho(fim.bytes) + ')' : '') + '.', 10)

    if (ligado(s.PERGUNTAR_ADICIONAR) && h.yesNo('Adicionar «' + fim.nome + '» à lista do culto aberto?')) {
        adicionarALista(module, alvo, fim.nome)
    }

    if (ligado(s.PERGUNTAR_TOCAR) && h.yesNo('Começar a tocar «' + fim.nome + '» agora?')) {
        try { module.hly('PlayVideo', { file: alvo.nome + '/' + fim.nome }) }
        catch (e) {
            h.notificationError('Não consegui começar a tocar. O vídeo está em Vídeos \\ ' + alvo.nome + '.', 12)
            h.log(mID, 'PlayVideo: {}', [e])
        }
    }
}

/** Pasta dos vídeos: nome simples (YOUTUBE) ou caminho completo, para quem quiser outra pasta. */
function pastaDosVideos(nome) {
    var p = String(nome || 'YOUTUBE').replace(/^\s+|\s+$/g, '').replace(/[\\\/]+$/, '')
    if (/^[a-zA-Z]:[\\\/]/.test(p) || p.substring(0, 2) === '\\\\') {
        var i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
        return { nome: p.substring(i + 1) || 'YOUTUBE', caminho: p }
    }
    var j = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
    if (j >= 0) p = p.substring(j + 1)
    p = p || 'YOUTUBE'
    return { nome: p, caminho: h.hly('GetVersion').data.baseDir + '\\Holyrics\\files\\media\\video\\' + p }
}

/** Insere o vídeo na lista de mídia: caminho relativo (documentação), com \ ou o caminho completo (como as imagens). */
function adicionarALista(module, alvo, nome) {
    var tentativas = [alvo.nome + '/' + nome, alvo.nome + '\\' + nome, alvo.caminho + '\\' + nome]
    for (var i = 0; i < tentativas.length; i++) {
        var resp = null
        try { resp = module.hly('AddToPlaylist', { items: [{ type: 'video', name: tentativas[i] }], index: -1 }) }
        catch (e) { h.log(mID, 'AddToPlaylist: {}', [e]) }
        if (resp && resp.status === 'ok') {
            h.notification('Adicionado à lista do culto.', 5)
            return true
        }
    }
    h.notificationError('Não consegui adicionar à lista. O vídeo ficou em Vídeos \\ ' + alvo.nome + '; arrasta-o para a lista.', 12)
    return false
}

function exePermitido(module) {
    var lista = module.getAllowedFiles() || []
    for (var i = 0; i < lista.length; i++) {
        if (String(lista[i]).toLowerCase().endsWith('baixarvideo.exe')) return lista[i]
    }
    if (h.yesNo('Falta indicar o programa BaixarVideo.exe nos ficheiros permitidos deste módulo. Abrir as definições agora?')) {
        module.openSettings('allowed_files')
    }
    return null
}

/** Corre o BaixarVideo.exe e devolve { ok, codigo, linhas } (acentos \uXXXX já convertidos). */
function rodarExe(module, exe, cli, timeout) {
    var r = module.executeCmdAndWait(exe, cli, timeout || 60000)
    var saida = r && r.data && r.data.output ? String(r.data.output) : ''
    var linhas = []
    var bruto = saida.split('\n')
    for (var i = 0; i < bruto.length; i++) {
        var l = bruto[i].replace(/\r/g, '')
        if (l.replace(/\s/g, '') === '') continue
        linhas.push(l.replace(/\\u([0-9a-fA-F]{4})/g, function (m, hex) { return String.fromCharCode(parseInt(hex, 16)) }))
    }
    var codigo = r && r.data && r.data.code !== undefined ? Number(r.data.code) : -1
    return { ok: !!r && r.status === 'ok' && codigo === 0, codigo: codigo, linhas: linhas }
}

/** A última linha R| ou E| do exe: { ok, caminho, bytes, titulo, nome, erro }. */
function resultado(res) {
    for (var i = res.linhas.length - 1; i >= 0; i--) {
        var l = res.linhas[i]
        if (l.substring(0, 2) === 'R|') {
            var p = l.split('|')
            return {
                ok: p[1] === 'ok', caminho: p[2] || '', bytes: Number(p[3]) || 0,
                titulo: p.slice(4).join('|'), nome: nomeDoCaminho(p[2] || '')
            }
        }
        if (l.substring(0, 2) === 'E|') return { ok: false, erro: l.substring(2) }
    }
    return { ok: false, erro: res.linhas.length ? res.linhas[res.linhas.length - 1] : 'Não foi possível descarregar o vídeo.' }
}

function nomeDoCaminho(caminho) {
    var p = String(caminho || '')
    var i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'))
    return i >= 0 ? p.substring(i + 1) : p
}

function tamanho(bytes) {
    if (!bytes) return ''
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2).replace('.', ',') + ' GB'
    return (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB'
}

function ligado(v) { return v === true || v === 'true' || v === 1 || v === '1' }
