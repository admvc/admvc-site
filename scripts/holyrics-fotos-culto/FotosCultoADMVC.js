// Fotos do Culto ADMVC — módulo JS do Holyrics (2.24+, Windows)
// Clique direito na pasta de imagens das fotos (FOTOS-CULTO) → "Preparar fotos para o slide-show" (ou o botão do módulo):
// pergunta o título, a data, o estilo, o link do álbum e um versículo; corre o FotosCulto.exe, que põe moldura, título,
// data, versículo e o QR do álbum em cada foto (slide-01.png…) e apaga os originais; no fim pode arrancar o slide-show.
// "Receber o culto do portal" e "Trazer as artes do culto": pedem ao portal (app.igrejaadmvc.org) as artes do TELÃO publicadas pela Mídia e põe-nas na pasta
// ARTES-CULTO (por omissão o culto de hoje, senão o próximo); basta depois mostrar a pasta. Precisa da chave de Mídia → Holyrics.
// Precisa de "FotosCulto.exe" na lista de ficheiros permitidos do módulo (Definições do módulo → Arquivos permitidos).

var mID = 'admvc-fotos-culto'

function info() {
    return {
        id: mID,
        name: 'Fotos do Culto ADMVC',
        description: 'Põe moldura, título, data, versículo e o QR do álbum nas fotos do culto e prepara o slide-show.',
        min_version: '2.24.0',
        os_required: 'windows',
        available_in_main_window: true,
        available_in_bible_window: false,
        permissions: [
            { type: 'advanced', key: 'allowed_files' },
            { type: 'advanced', key: 'edit_important_data' }   // só para criar o texto da escala e rotina
        ]
    }
}

function settings(module) {
    return [
        { id: 'PASTA', name: 'Pasta das fotos (em Imagens)', label: 'Pasta das fotos (em Imagens)', type: 'string', default_value: 'FOTOS-CULTO' },
        { id: 'LINK', name: 'Link do álbum (por omissão)', label: 'Link do álbum (por omissão)', type: 'string', default_value: 'https://photos.app.goo.gl/Go1hH2gj3NXhTFe1A' },
        {
            id: 'ESTILO', name: 'Estilo por omissão', label: 'Estilo por omissão', type: 'string', default_value: 'direita',
            allowed_values: [
                { value: 'direita', label: 'Moldura direita' },
                { value: 'inclinada', label: 'Moldura inclinada (postal)' },
                { value: 'diagonal', label: 'Faixa diagonal' }
            ]
        },
        { id: 'MAX', name: 'Máximo de fotos', label: 'Máximo de fotos', type: 'number', min: 1, max: 20, default_value: 10 },
        { id: 'MOSTRAR', name: 'Começar o slide-show no fim', label: 'Começar o slide-show no fim', type: 'boolean', default_value: 'false' },
        { id: 'SEGUNDOS', name: 'Segundos por foto', label: 'Segundos por foto', type: 'number', min: 3, max: 60, default_value: 8 },
        { id: 'PORTAL', name: 'Portal (artes do culto)', label: 'Portal (artes do culto)', type: 'string', default_value: 'https://app.igrejaadmvc.org' },
        { id: 'CHAVE', name: 'Chave do portal (artes do culto)', label: 'Chave do portal (artes do culto)', type: 'password', default_value: '' },
        { id: 'PASTA_ARTES', name: 'Pasta das artes (em Imagens)', label: 'Pasta das artes (em Imagens)', type: 'string', default_value: 'ARTES-CULTO' }
    ]
}

function actions(module) {
    return [{
        id: 'preparar_fotos_culto',
        name: 'Preparar fotos do culto',
        hint: 'Moldura, título, versículo e QR do álbum nas fotos',
        icon: 'photo_library',
        action: function (evt) { preparar(module, null) }
    }, {
        id: 'trazer_artes_culto',
        name: 'Trazer as artes do culto',
        hint: 'As artes do telão publicadas no portal, na pasta ARTES-CULTO',
        icon: 'cloud_download',
        action: function (evt) { trazerArtes(module) }
    }, {
        id: 'receber_culto_portal',
        name: 'Receber o culto do portal',
        hint: 'Músicas, artes do telão, escala e rotina do culto, na lista aberta',
        icon: 'download_for_offline',
        action: function (evt) { receberCulto(module) }
    }]
}

function contextActions(module) {
    return [{
        name: 'Receber o culto do portal',
        types: ['image_folder'],
        action: function (evt) { receberCulto(module) }
    }, {
        name: 'Trazer as artes do culto',
        types: ['image_folder'],
        action: function (evt) { trazerArtes(module) }
    }, {
        name: 'Preparar fotos para o slide-show',
        types: ['image_folder'],
        action: function (evt) {
            var nome = evt && evt.item ? (evt.item.file_fullname || evt.item.name || '') : ''
            preparar(module, nome)
        }
    }]
}

// ---------------------------------------------------------------------------------------------------------------------

var DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function hojePorExtenso() {
    var d = new Date()
    return DIAS[d.getDay()] + ', ' + d.getDate() + ' de ' + MESES[d.getMonth()]
}

/** Título sugerido: o 1.º título da lista de mídia do culto, senão "Culto de <dia da semana>". */
function tituloSugerido() {
    try {
        var r = h.hly('GetMediaPlaylist')
        var itens = (r && r.data) ? r.data : []
        for (var i = 0; i < itens.length; i++) {
            if (itens[i].type === 'title' && itens[i].name) return String(itens[i].name)
        }
    } catch (e) { h.log(mID, 'Sem lista de mídia: {}', [e]) }
    var dia = DIAS[new Date().getDay()].replace('-feira', '')
    return 'Culto de ' + dia
}

function exePermitido(module) {
    var lista = module.getAllowedFiles() || []
    for (var i = 0; i < lista.length; i++) {
        if (String(lista[i]).toLowerCase().endsWith('fotosculto.exe')) return lista[i]
    }
    if (h.yesNo('Falta indicar o programa FotosCulto.exe nos ficheiros permitidos deste módulo. Abrir as definições agora?')) {
        module.openSettings('allowed_files')
    }
    return null
}

function preparar(module, pastaEscolhida) {
    var exe = exePermitido(module)
    if (!exe) return

    var s = module.settings
    var pasta = pastaEscolhida || s.PASTA || 'FOTOS-CULTO'
    var ultimoLink = h.restore('fotos_culto_link') || s.LINK || ''

    var r = h.input([
        { type: 'title', label: 'Fotos do culto · ' + pasta },
        { type: 'separator' },
        { id: 'titulo', key: 'titulo', type: 'string', label: 'Título', default_value: tituloSugerido() },
        { id: 'data', key: 'data', type: 'string', label: 'Data', default_value: hojePorExtenso() },
        {
            id: 'estilo', key: 'estilo', type: 'string', label: 'Estilo', default_value: s.ESTILO || 'direita',
            allowed_values: [
                { value: 'direita', label: 'Moldura direita' },
                { value: 'inclinada', label: 'Moldura inclinada (postal)' },
                { value: 'diagonal', label: 'Faixa diagonal' }
            ]
        },
        { id: 'link', key: 'link', type: 'string', label: 'Link do álbum (QR)', default_value: ultimoLink },
        { id: 'verso', key: 'verso', type: 'string', label: 'Versículo (vazio = um diferente em cada foto)', default_value: '' },
        { id: 'ref', key: 'ref', type: 'string', label: 'Referência do versículo (ex.: Salmos 23:1)', default_value: '' },
        { type: 'separator' },
        { type: 'title', label: 'Os originais são apagados depois de cada slide estar pronto.' }
    ])
    if (r == null) { h.notification('Cancelado.', 3); return }
    if (!r.link) { h.notificationError('Falta o link do álbum para o QR.', 6); return }
    h.store('fotos_culto_link', r.link)

    var base = h.hly('GetVersion').data.baseDir
    var caminho = base + '\\Holyrics\\files\\media\\image\\' + pasta
    var cli = ['--pasta', caminho, '--titulo', r.titulo || 'Culto', '--data', r.data || '', '--estilo', r.estilo || 'direita',
        '--link', r.link, '--max', String(s.MAX || 10)]
    if (r.verso) cli = cli.concat(['--verso', r.verso, '--ref', r.ref || ''])

    var mensagens = []
    h.popupWorker({
        action: function (evtFn) {
            return module.process(exe, {
                cli: cli,
                on_message: function (buf) {
                    var linha = buf.readString()
                    mensagens.push(linha)
                    h.log(mID, '[FotosCulto] {}', [linha])
                },
                on_error: function (buf) { h.log(mID, '[FotosCulto|erro] {}', [buf.readString()]) },
                on_finish: function (codigo) {
                    var ultima = mensagens.length ? String(mensagens[mensagens.length - 1]).trim() : ''
                    if (codigo === 0) {
                        h.notification(ultima || 'Fotos prontas.', 8)
                        if (s.MOSTRAR) {
                            h.hly('ShowImage', { file: pasta, automatic: { seconds: Number(s.SEGUNDOS) || 8, repeat: true } })
                        }
                    } else {
                        h.notificationError(ultima || 'Não foi possível preparar as fotos. Veja o registo do módulo.', 10)
                    }
                }
            }).await()
        },
        callback: function (resp, err) {
            if (err) {
                h.log(mID, 'erro: {}', [err])
                h.notificationError('Algo correu mal ao preparar as fotos.', 8)
            }
        }
    })
}


// ---------------------------------------------------------------------------------------------------------------------
// Do portal: trazer as artes do telão e receber o culto inteiro (músicas, artes, escala e rotina).
// Tudo SÍNCRONO (module.executeCmdAndWait e janelas h.input / h.yesNo dentro da própria ação): no Holyrics os temporizadores
// e as janelas dentro de callbacks não são fiáveis. Escreve sempre na lista do culto ABERTO no Holyrics e confirma a data antes.

/** Corre o FotosCulto.exe e devolve { ok, codigo, linhas } (linhas já com os \uXXXX convertidos de volta em acentos). */
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
    return { ok: !!r && r.status === 'ok' && codigo === 0, codigo: codigo, linhas: linhas, erro: r && r.error ? String(r.error) : '' }
}

function ultimaLinha(res, omissao) { return res.linhas.length ? res.linhas[res.linhas.length - 1] : (res.erro || omissao) }

function dataCurta(iso) {   // "2026-10-21T19:00" → "21/10 · 19:00" (já é hora de Lisboa)
    return iso.substring(8, 10) + '/' + iso.substring(5, 7) + ' · ' + iso.substring(11, 16)
}

function ligado(v) { return v === true || v === 'true' || v === 1 || v === '1' }

function semAcentos(t) {
    return String(t || '').toLowerCase()
        .replace(/[àáâãä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i').replace(/[òóôõö]/g, 'o').replace(/[ùúûü]/g, 'u').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, ' ').replace(/^ | $/g, '')
}

function chavesDoPortal(module) {
    var s = module.settings
    if (!s.CHAVE) {
        h.notificationError('Falta a chave do portal: cole-a nas definições do módulo (o portal gera-a em Mídia).', 10)
        return null
    }
    return { portal: s.PORTAL || 'https://app.igrejaadmvc.org', chave: s.CHAVE, pasta: s.PASTA_ARTES || 'ARTES-CULTO', s: s }
}

function pastaAbsoluta(pasta) {
    return h.hly('GetVersion').data.baseDir + '\\Holyrics\\files\\media\\image\\' + pasta
}

/** Os cultos do app (hoje até +21 dias): [{ id, data, nome, musicas, artes }] e o escolhido por omissão (hoje, senão o 1.º). */
function cultosDoApp(module, exe, k) {
    var res = rodarExe(module, exe, ['--cultos', '--portal', k.portal, '--chave', k.chave], 60000)
    if (!res.ok) { h.notificationError(ultimaLinha(res, 'Não foi possível ver os cultos.'), 10); return null }
    var cultos = []
    for (var i = 0; i < res.linhas.length; i++) {
        var p = res.linhas[i].split('|')
        if (p[0] === 'C' && p.length >= 6) cultos.push({ id: p[1], data: p[2], nome: p[3], musicas: p[4], artes: p[5] })
    }
    if (cultos.length === 0) { h.notificationError('Não há cultos no app para os próximos dias.', 8); return null }
    var d = new Date()
    var hoje = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)
    var omissao = cultos[0].id
    for (var j = 0; j < cultos.length; j++) { if (cultos[j].data.substring(0, 10) === hoje) { omissao = cultos[j].id; break } }
    return { cultos: cultos, omissao: omissao }
}

function rotuloDoCulto(c) { return dataCurta(c.data) + ' · ' + c.nome + ' (' + c.musicas + ' músicas, ' + c.artes + ' artes)' }

function escolherCulto(titulo, lista) {
    var valores = []
    for (var k = 0; k < lista.cultos.length; k++) valores.push({ value: lista.cultos[k].id, label: rotuloDoCulto(lista.cultos[k]) })
    var r = h.input([
        { type: 'title', label: titulo },
        { type: 'separator' },
        { id: 'evento', key: 'evento', type: 'string', label: 'Culto do app', default_value: lista.omissao, allowed_values: valores }
    ])
    if (r == null) { h.notification('Cancelado.', 3); return null }
    // o Holyrics pode devolver o valor (o id) ou o texto da linha escolhida: aceita os dois (e a posição, como último recurso)
    // com UM só campo a preencher, o Holyrics devolve o próprio valor (não um objeto com o nome do campo)
    var escolhido = (r !== null && r !== undefined && r.evento !== undefined && r.evento !== null) ? String(r.evento) : String(r)
    for (var m = 0; m < lista.cultos.length; m++) {
        if (String(lista.cultos[m].id) === escolhido || rotuloDoCulto(lista.cultos[m]) === escolhido) return lista.cultos[m]
    }
    for (var n = 0; n < lista.cultos.length; n++) {
        if (escolhido.indexOf(lista.cultos[n].nome) >= 0 && escolhido.indexOf(dataCurta(lista.cultos[n].data).substring(0, 5)) >= 0) return lista.cultos[n]
    }
    h.notificationError('Não percebi qual culto escolheu (o Holyrics devolveu: «' + escolhido.substring(0, 70) + '»).', 12)
    return null
}

// ---- Trazer as artes do culto (só descarrega para a pasta ARTES-CULTO)

function trazerArtes(module) {
    var exe = exePermitido(module)
    if (!exe) return
    var k = chavesDoPortal(module)
    if (!k) return
    var res = rodarExe(module, exe, ['--listar', '--portal', k.portal, '--chave', k.chave], 60000)
    if (!res.ok) { h.notificationError(ultimaLinha(res, 'Não foi possível ver os cultos.'), 10); return }
    var cultos = []
    for (var i = 0; i < res.linhas.length; i++) {
        var p = res.linhas[i].split('|')
        if (p.length >= 4) cultos.push({ id: p[0], data: p[1], nome: p[2], musicas: '', artes: p[3] })
    }
    if (cultos.length === 0) { h.notificationError('Não há artes do telão publicadas.', 8); return }
    var d = new Date()
    var hoje = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2)
    var omissao = cultos[0].id
    for (var j = 0; j < cultos.length; j++) { if (cultos[j].data.substring(0, 10) === hoje) { omissao = cultos[j].id; break } }
    var culto = escolherCulto('Artes do culto → ' + k.pasta + ' (as que lá estavam são substituídas)', { cultos: cultos, omissao: omissao })
    if (!culto) return
    var fim = rodarExe(module, exe, ['--trazer', '--portal', k.portal, '--chave', k.chave, '--evento', String(culto.id), '--pasta', pastaAbsoluta(k.pasta)], 120000)
    if (fim.ok) {
        h.notification(ultimaLinha(fim, 'Artes prontas.'), 8)
        if (k.s.MOSTRAR) h.hly('ShowImage', { file: k.pasta, automatic: { seconds: Number(k.s.SEGUNDOS) || 8, repeat: true } })
    } else {
        h.notificationError(ultimaLinha(fim, 'Não foi possível trazer as artes.'), 10)
    }
}

// ---- Receber o culto do portal

var SECOES = [
    { nome: 'ABERTURA', re: /^abertura/, cor: '70671A' },
    { nome: 'LOUVOR', re: /louvor/, cor: '1F5F99' },
    { nome: 'OFERTORIO', re: /ofert|dizim/, cor: '4A6572' },
    { nome: 'MENSAGEM', re: /mensag|palavra|prega/, cor: '2E7D32' },
    { nome: 'ORACOES', re: /ora[cç]/, cor: '70671A' },
    { nome: 'AVISOS', re: /avis/, cor: '5C6BC0' },
    { nome: 'ENCERRAMENTO', re: /encerr/, cor: 'BF360C' },
    { nome: 'ESCALA E ROTINA (NAO PROJETAR)', re: /^escala/, cor: '555555', fechada: true }
]

function indiceDaSecao(nome) { for (var i = 0; i < SECOES.length; i++) if (SECOES[i].nome === nome) return i; return -1 }

/** Posição do título desta secção na lista de mídia (ou -1) e onde acaba (antes do título seguinte, ou no fim). */
function limitesDaSecao(lista, sec) {
    var ini = -1
    for (var i = 0; i < lista.length; i++) {
        if (String(lista[i].type) === 'title' && sec.re.test(semAcentos(lista[i].name))) { ini = i; break }
    }
    if (ini < 0) return { ini: -1, fim: -1 }
    var fim = lista.length
    for (var j = ini + 1; j < lista.length; j++) { if (String(lista[j].type) === 'title') { fim = j; break } }
    return { ini: ini, fim: fim }
}

function listaDeMidia(module) {
    var r = module.hly('GetMediaPlaylist')
    return r && r.data ? r.data : []
}

/** Cópia simples da lista de mídia: [{ type, name, id, songId }] (a original é uma lista Java que muda por baixo). */
function copiarLista(lista) {
    var t = []
    for (var i = 0; i < lista.length; i++) t.push({ type: String(lista[i].type), name: String(lista[i].name || ''), id: String(lista[i].id), songId: lista[i].song_id ? String(lista[i].song_id) : '' })
    return t
}

function terminaCom(texto, fim) {
    return fim.length > 0 && texto.length >= fim.length && texto.substring(texto.length - fim.length) === fim
}

function idsDasLetras(module) {
    var r = module.hly('GetLyricsPlaylist')
    var l = r && r.data ? r.data : []
    var ids = {}
    for (var i = 0; i < l.length; i++) ids[String(l[i].id)] = true
    return ids
}

/** Insere UM item no Holyrics e na cópia local (indice -1 = no fim). Devolve a resposta do Holyrics. */
function inserir(module, espelho, corpo, indice) {
    var pos = (indice === undefined || indice < 0 || indice > espelho.length) ? espelho.length : indice
    var r = module.hly('AddToPlaylist', { items: [corpo], index: pos })
    if (r && r.status === 'ok') espelho.splice(pos, 0, { type: String(corpo.type), name: String(corpo.name || ''), id: String(corpo.id || ''), songId: corpo.type === 'song' ? String(corpo.id) : '' })
    return r
}

function cultoAberto(module) {
    var r = module.hly('GetCurrentSchedule')
    var d = r ? r.data : null
    if (!d) return null
    if (d.name !== undefined && d.name !== null) return d
    try { if (d.size && d.size() > 0) return d.get(0) } catch (e) { }
    try { if (d[0]) return d[0] } catch (e) { }
    return null
}

/** A música no Holyrics: o id ligado no portal, senão a 1.ª procura pelo título (confirma que o título é igual). */
function acharMusica(module, m) {
    if (m.holyricsId) return { id: m.holyricsId, via: 'id' }
    var r = module.hly('SearchLyrics', { text: m.titulo })
    var lista = r && r.status === 'ok' && r.data ? r.data : []
    var alvo = semAcentos(m.titulo)
    for (var i = 0; i < lista.length; i++) {
        if (semAcentos(lista[i].title || lista[i].name) === alvo) return { id: String(lista[i].id), via: 'título' }
    }
    return null
}

function receberCulto(module) {
    var exe = exePermitido(module)
    if (!exe) return
    var k = chavesDoPortal(module)
    if (!k) return

    var lista = cultosDoApp(module, exe, k)
    if (!lista) return
    var culto = escolherCulto('Receber o culto do portal', lista)
    if (!culto) return

    var res = rodarExe(module, exe, ['--culto', '--portal', k.portal, '--chave', k.chave, '--evento', String(culto.id)], 60000)
    if (!res.ok) { h.notificationError(ultimaLinha(res, 'Não foi possível ver o culto.'), 10); return }
    var nome = culto.nome, data = culto.data
    var musicas = [], artes = [], escala = [], rotina = []
    for (var i = 0; i < res.linhas.length; i++) {
        var p = res.linhas[i].split('|')
        if (p[0] === 'N') { nome = p[1]; data = p[2] }
        else if (p[0] === 'M') musicas.push({ titulo: p[1], artista: p[2], holyricsId: p[3], tom: p[4] })
        else if (p[0] === 'A') artes.push({ secao: p[1], ficheiro: p[2], nome: p[3] })
        else if (p[0] === 'E') escala.push(res.linhas[i].substring(2))
        else if (p[0] === 'R') rotina.push(res.linhas[i].substring(2))
    }
    if (!musicas.length && !artes.length && !escala.length && !rotina.length) {
        h.notificationError('Este culto ainda não tem músicas, artes publicadas, escala nem rotina no portal.', 10)
        return
    }

    // 1) o culto aberto no Holyrics é o certo? (se não for, não se escreve sem perguntar)
    var aberto = cultoAberto(module)
    var dataAberto = aberto && aberto.datetime ? String(aberto.datetime).substring(0, 10) : ''
    var nomeAberto = aberto && aberto.name ? String(aberto.name) : '?'
    if (dataAberto !== data.substring(0, 10)) {
        if (!h.yesNo('O culto ABERTO no Holyrics é «' + nomeAberto + '» (' + (dataAberto || 'sem data') + ').\nO culto do app é «' + nome + '» (' + dataCurta(data) + ').\n\nO mais seguro é abrir o culto certo no Holyrics e voltar a tentar.\nEscrever mesmo assim na lista aberta?')) {
            h.notification('Cancelado: abra o culto «' + nome + '» no Holyrics e tente outra vez.', 8)
            return
        }
    }

    // 2) o que enviar
    var campos = [
        { type: 'title', label: nome + ' · ' + dataCurta(data) + '  →  culto aberto: ' + nomeAberto },
        { type: 'separator' }
    ]
    if (musicas.length) {
        campos.push({ type: 'title', label: 'Músicas (vão para LOUVOR)' })
        for (var a = 0; a < musicas.length; a++) campos.push({ id: 'm' + a, key: 'm' + a, type: 'boolean', label: musicas[a].titulo + (musicas[a].artista ? ' — ' + musicas[a].artista : '') + (musicas[a].tom ? ' (' + musicas[a].tom + ')' : ''), default_value: true })
    }
    if (artes.length) {
        campos.push({ type: 'title', label: 'Artes do telão' })
        for (var b = 0; b < artes.length; b++) campos.push({ id: 'a' + b, key: 'a' + b, type: 'boolean', label: artes[b].nome + '  →  ' + artes[b].secao, default_value: true })
    }
    if (escala.length || rotina.length) {
        campos.push({ type: 'title', label: 'Escala e rotina' })
        campos.push({ id: 'texto', key: 'texto', type: 'boolean', label: 'Escala e rotina em texto (não projetar)', default_value: true })
    }
    campos.push({ type: 'separator' })
    campos.push({ id: 'letras', key: 'letras', type: 'boolean', label: 'Adicionar as músicas também à lista de Letras', default_value: true })
    campos.push({
        id: 'modo', key: 'modo', type: 'string', label: 'Lista já preenchida', default_value: 'mesclar',
        allowed_values: [{ value: 'mesclar', label: 'Mesclar (não duplica; põe cada coisa debaixo do seu título)' }, { value: 'substituir', label: 'Substituir (limpa a lista e as letras)' }]
    })
    var r = h.input(campos)
    if (r == null) { h.notification('Cancelado.', 3); return }

    var escolhidas = [], falhas = [], avisos = []
    var feito = { musicas: 0, artes: 0, letras: 0, texto: false }

    // O Holyrics devolve a lista ANTIGA durante uns instantes depois de se escrever nela: lê-se UMA vez, agora, e a ordem passa
    // a ser mantida numa cópia local (cada inserção atualiza a cópia). As posições calculam-se sempre na cópia.
    var espelho = copiarLista(listaDeMidia(module))
    var letrasNoCulto = idsDasLetras(module)

    // 3) substituir = limpar primeiro (pede confirmação com os números)
    if (String(r.modo) === 'substituir') {
        var atual = listaDeMidia(module)
        var letrasAtuais = module.hly('GetLyricsPlaylist')
        var nLetras = letrasAtuais && letrasAtuais.data ? letrasAtuais.data.length : 0
        if (!h.yesNo('Substituir vai apagar ' + atual.length + ' itens da lista de mídia e ' + nLetras + ' letras do culto aberto («' + nomeAberto + '»). Continuar?')) { h.notification('Cancelado.', 3); return }
        var ids = []
        for (var q = 0; q < atual.length; q++) ids.push(String(atual[q].id))
        for (var q2 = 0; q2 < ids.length; q2++) module.hly('RemoveFromMediaPlaylist', { id: ids[q2] })
        for (var q3 = nLetras - 1; q3 >= 0; q3--) module.hly('RemoveFromLyricsPlaylist', { index: q3 })
        espelho = []; letrasNoCulto = {}
    }

    // 4) os itens por secção
    var porSecao = {}
    function colocar(secao, item) { (porSecao[secao] = porSecao[secao] || []).push(item) }

    for (var c = 0; c < musicas.length; c++) {
        if (!ligado(r['m' + c])) continue
        var achada = acharMusica(module, musicas[c])
        if (!achada) { falhas.push('♪ ' + musicas[c].titulo + ' (não está no Holyrics)'); continue }
        escolhidas.push({ titulo: musicas[c].titulo, id: achada.id })
        colocar('LOUVOR', { type: 'song', id: achada.id, chave: 'song:' + achada.id, rotulo: musicas[c].titulo, titulo: musicas[c].titulo })
    }

    var ficheiros = []
    for (var d2 = 0; d2 < artes.length; d2++) if (ligado(r['a' + d2])) ficheiros.push(artes[d2].ficheiro)
    if (ficheiros.length) {
        h.notification('A descarregar as artes…', 4)
        var pasta = k.pasta
        var baixar = rodarExe(module, exe, ['--trazer', '--portal', k.portal, '--chave', k.chave, '--evento', String(culto.id), '--pasta', pastaAbsoluta(pasta), '--so', ficheiros.join(',')], 120000)
        if (!baixar.ok) { falhas.push('artes: ' + ultimaLinha(baixar, 'falhou o descarregamento')) }
        else {
            for (var e2 = 0; e2 < artes.length; e2++) {
                if (!ligado(r['a' + e2])) continue
                var caminho = pasta + '\\' + artes[e2].ficheiro
                colocar(artes[e2].secao, { type: 'image', name: caminho, ficheiro: semAcentos(artes[e2].ficheiro), chave: 'image:' + semAcentos(artes[e2].ficheiro), rotulo: artes[e2].nome })
            }
        }
    }

    var textoEscala = ''
    if (ligado(r.texto)) {
        var partes = ['ESCALA']
        for (var f1 = 0; f1 < escala.length; f1++) partes.push(escala[f1])
        if (rotina.length) { partes.push(''); partes.push('ROTINA'); for (var f2 = 0; f2 < rotina.length; f2++) partes.push(rotina[f2]) }
        textoEscala = partes.join('\n')
    }

    // 5) garantir os títulos que faltam (pela ordem das secções) e pôr cada item no fim da sua secção
    for (var s1 = 0; s1 < SECOES.length; s1++) {
        var sec = SECOES[s1]
        var precisa = !!porSecao[sec.nome] || (sec.nome.indexOf('ESCALA') === 0 && textoEscala)
        // um de cada vez, no fim da lista, pela ordem das secções
        if (precisa && limitesDaSecao(espelho, sec).ini < 0) inserir(module, espelho, { type: 'title', name: sec.nome, background_color: sec.cor, collapsed: !!sec.fechada }, -1)
    }

    // o texto da escala: cria o texto no Holyrics (precisa da permissão do módulo); sem ela, entra como linhas de título
    if (textoEscala) {
        var titulo = 'Escala e rotina ' + data.substring(8, 10) + '-' + data.substring(5, 7) + ' ' + nome
        var slides = [{ text: textoEscala }]
        // uma escala nova substitui a anterior deste culto (o texto antigo sai da lista e é apagado, para não duplicar)
        try {
            var limE = limitesDaSecao(espelho, SECOES[SECOES.length - 1])
            if (limE.ini >= 0) for (var oi = limE.fim - 1; oi > limE.ini; oi--) if (espelho[oi].type === 'text') { module.hly('RemoveFromMediaPlaylist', { id: espelho[oi].id }); espelho.splice(oi, 1) }
            var textos = module.hly('GetTexts')
            var lt2 = textos && textos.data ? textos.data : []
            for (var ti = 0; ti < lt2.length; ti++) if (String(lt2[ti].title) === titulo) module.hly('DeleteText', { id: lt2[ti].id })
        } catch (e0) { h.log(mID, 'não limpei a escala anterior: {}', [e0]) }
        var criado = module.hly('CreateText', { title: titulo, folder: 'ADMVC', slides: slides })
        var idTexto = criado && criado.status === 'ok' && criado.data ? String(criado.data.id || criado.data) : ''
        if (idTexto) colocar('ESCALA E ROTINA (NAO PROJETAR)', { type: 'text', id: idTexto, chave: 'text:' + idTexto, rotulo: titulo })
        else {
            avisos.push('Não consegui criar o texto da escala (ligue a permissão "Criar, editar e remover dados importantes" nas definições do módulo): ficou em linhas.')
            var todas = escala.concat(rotina)
            for (var z = 0; z < todas.length; z++) colocar('ESCALA E ROTINA (NAO PROJETAR)', { type: 'title', name: todas[z].substring(0, 120), background_color: '3A3A3A', chave: 'title:' + semAcentos(todas[z]), rotulo: todas[z] })
        }
    }

    for (var s2 = 0; s2 < SECOES.length; s2++) {
        var itens = porSecao[SECOES[s2].nome]
        if (!itens) continue
        for (var w = 0; w < itens.length; w++) {
            var atualLista = espelho
            var lim = limitesDaSecao(atualLista, SECOES[s2])
            if (lim.ini < 0) { falhas.push(itens[w].rotulo + ' (o título ' + SECOES[s2].nome + ' não existe)'); continue }
            // já está nesta secção? (mesclar não duplica)
            var repetido = false
            for (var y = lim.ini + 1; y < lim.fim; y++) {
                var existente = atualLista[y]
                var nomeNorm = semAcentos(existente.name)
                var igual = false
                if (itens[w].type === 'song') igual = existente.type === 'song' && ((existente.songId && existente.songId === itens[w].id) || existente.id === itens[w].id || nomeNorm.indexOf(semAcentos(itens[w].titulo)) === 0)
                else if (itens[w].type === 'image') igual = existente.type !== 'title' && terminaCom(nomeNorm, itens[w].ficheiro)   // o Holyrics pode devolver a pasta com / ou com a barra invertida
                else if (itens[w].type === 'text') igual = existente.type === 'text' && existente.id === itens[w].id
                else igual = existente.type === 'title' && nomeNorm === semAcentos(itens[w].name)
                if (igual) { repetido = true; break }
            }
            if (repetido) continue
            var corpo = itens[w].type === 'song' ? { type: 'song', id: itens[w].id } : itens[w].type === 'image' ? { type: 'image', name: itens[w].name } : itens[w].type === 'text' ? { type: 'text', id: itens[w].id } : { type: 'title', name: itens[w].name, background_color: itens[w].background_color }
            // as linhas de escala em modo "só títulos" ficam sempre no fim da lista (cada uma fecharia a secção)
            var ok = inserir(module, espelho, corpo, itens[w].type === 'title' ? -1 : lim.fim)
            if (ok && ok.status === 'ok') {
                if (itens[w].type === 'song') feito.musicas++
                else if (itens[w].type === 'image') feito.artes++
                else feito.texto = true
            } else falhas.push(itens[w].rotulo + ' (' + (ok && ok.error ? String(ok.error).substring(0, 60) : 'não entrou') + ')')
        }
    }

    // 6) letras
    if (ligado(r.letras)) {
        for (var v = 0; v < escolhidas.length; v++) {
            if (letrasNoCulto[String(escolhidas[v].id)]) continue
            var rl = module.hly('AddLyricsToPlaylist', { id: escolhidas[v].id })
            if (rl && rl.status === 'ok') { feito.letras++; letrasNoCulto[String(escolhidas[v].id)] = true }
            else falhas.push('letra de ' + escolhidas[v].titulo)
        }
    }

    // 7) resumo
    var linhasFim = [
        { type: 'title', label: 'Culto recebido: ' + nome + ' · ' + dataCurta(data) },
        { type: 'separator' },
        { type: 'title', label: 'Músicas na lista: ' + feito.musicas + ' · letras: ' + feito.letras + ' · artes: ' + feito.artes + ' · escala/rotina: ' + (feito.texto ? 'sim' : 'não') }
    ]
    for (var g = 0; g < avisos.length; g++) linhasFim.push({ type: 'title', label: '⚠ ' + avisos[g].substring(0, 150) })
    for (var g2 = 0; g2 < falhas.length && g2 < 12; g2++) linhasFim.push({ type: 'title', label: '✗ ' + falhas[g2].substring(0, 150) })
    h.input(linhasFim)
}
