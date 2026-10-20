// Fotos do Culto ADMVC — módulo JS do Holyrics (2.24+, Windows)
// Clique direito na pasta de imagens das fotos (FOTOS-CULTO) → "Preparar fotos para o slide-show" (ou o botão do módulo):
// pergunta o título, a data, o estilo, o link do álbum e um versículo; corre o FotosCulto.exe, que põe moldura, título,
// data, versículo e o QR do álbum em cada foto (slide-01.png…) e apaga os originais; no fim pode arrancar o slide-show.
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
            { type: 'advanced', key: 'allowed_files' }
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
        { id: 'SEGUNDOS', name: 'Segundos por foto', label: 'Segundos por foto', type: 'number', min: 3, max: 60, default_value: 8 }
    ]
}

function actions(module) {
    return [{
        id: 'preparar_fotos_culto',
        name: 'Preparar fotos do culto',
        hint: 'Moldura, título, versículo e QR do álbum nas fotos',
        icon: 'photo_library',
        action: function (evt) { preparar(module, null) }
    }]
}

function contextActions(module) {
    return [{
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
    h.setTimeout(function () {
        if (h.yesNo('Falta indicar o programa FotosCulto.exe nos ficheiros permitidos deste módulo. Abrir as definições agora?')) {
            module.openSettings('allowed_files')
        }
    }, 0)
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
