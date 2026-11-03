# Fotos do Culto ADMVC — moldura e QR para o slide-show do Holyrics

A equipa da fotografia larga as fotos cruas do culto na pasta **Entrada** (ao lado do `FotosCulto.exe`). Com um clique,
as escolhidas ganham moldura, o título do culto, a data, um versículo e o QR do álbum (`slide-01.png`, `slide-02.png`…) na
pasta **FOTOS-CULTO** do Holyrics, e **todas** as originais ficam arquivadas em **Cultos\`<data> <título>`**. A Entrada fica
vazia. Sem fotos na Entrada funciona como antes: usa as que estiverem na pasta FOTOS-CULTO e guarda os originais em
`_originais`. Como os PCs sincronizam pelo Holyrics, chega fazer isto no PC da fotografia.

```
C:\Holyrics\FotosCulto\
├─ Entrada\                             as fotos cruas do culto (a equipa larga aqui)
├─ FOTOS-CULTO\                         o Holyrics lê daqui: as slides prontos
├─ Cultos\2026-11-02 Culto da Família\  as originais arquivadas, por culto
└─ modelo\                              o desenho do slide
```

Fica guardado com o portal da igreja, em `admvc/scripts/holyrics-fotos-culto/` (histórico no git). Para levar para um PC,
copiar esta pasta (ou descarregá-la do repositório).

## Instalar (uma vez em cada PC onde se vai usar)
1. Copiar esta pasta inteira para `C:\Holyrics\FotosCulto\`
   (tem de ficar `FotosCulto.exe`, a pasta `modelo` e a pasta `Entrada` lado a lado; a `Cultos` é criada na 1.ª vez).
2. Criar um atalho no Ambiente de Trabalho para `C:\Holyrics\FotosCulto\Entrada` — é onde a equipa põe as fotos.
3. No Holyrics: **Menu → Módulos (JavaScript)** → adicionar módulo → escolher `FotosCultoADMVC.js`.
4. Nas definições do módulo **Fotos do Culto ADMVC**:
   - em **Arquivos permitidos**, escolher `C:\Holyrics\FotosCulto\FotosCulto.exe`;
   - confirmar a pasta (`FOTOS-CULTO`) e o link do álbum;
   - colar a **chave do portal** (ver "Sincronizar APP", mais abaixo) e deixar ligado **"Enviar para o álbum do portal"** (vem ligado);
   - opcional: "Começar o slide-show no fim" e os segundos por foto.

O PC precisa só do Windows e do Microsoft Edge (já vêm instalados). As fotos não precisam de internet; trazer as artes precisa.

## Usar em cada culto
1. A equipa da fotografia copia as fotos cruas (as 20 do culto) para **Entrada**. Não é preciso renomear nem apagar nada —
   as fotos da Entrada são arrumadas pelo programa.
2. **"Preparar fotos do culto"** (botão do módulo, ou clique direito na pasta **FOTOS-CULTO** → *Preparar fotos para o
   slide-show*).
3. A janela diz quantas estão à espera (*"20 à espera na Entrada"*) e, como antes, pergunta o título, a data, o estilo, o
   link do álbum, o versículo e quantas fotos (10 por omissão). As opções de subpastas e de apagar originais só aparecem
   quando as fotos vêm da pasta, não da Entrada.
4. Esperar o aviso **"20 recebidas · 10 fotos prontas · arquivadas em Cultos\2026-11-02 Culto da Família"** (cerca de 2 a 3
   segundos por foto; um minuto ou dois). O Holyrics fica ocupado enquanto trabalha — não fechar nem clicar durante esse
   tempo. Se alguma não entrar, o aviso diz quantas e porquê (ex.: HEIC).
   Se o processo for cortado a meio (o Holyrics fecha os programas ao fim de alguns segundos), **basta repetir o passo 2**:
   os slides já feitos ficam e ele continua de onde parou (o aviso diz "3 já estavam feitas"). Mudar o título, a data ou o
   versículo faz de conta que é um culto novo e refaz todos os slides.
5. **O álbum no portal** (passo novo, automático): no fim, as originais desse culto sobem para o portal — uma versão leve
   de cada foto (2560 px) e uma miniatura — e o álbum fica publicado em `https://app.igrejaadmvc.org/fotos/<culto>`. O QR dos
   slides já aponta para esse álbum (o campo "Link do álbum" só conta se o envio falhar ou estiver desligado).
   - O aviso final diz *"20 enviadas para https://…/fotos/…"*. Cada foto demora 1 a 3 segundos.
   - **Cortou a meio?** Repetir o passo 2: não reenvia as que já subiram (o estado fica em `Cultos<culto>._portal.txt`).
   - **Sem internet?** Os slides fazem-se na mesma (com o link que escreveu) e o aviso diz que as fotos sobem da próxima vez:
     basta voltar a carregar em "Preparar fotos do culto" quando houver rede (mesmo com a Entrada vazia).
   - **O portal recusou** (limite de fotos ou de espaço, aviso *"O portal recusou: …"*): o envio pára e não repete sozinho.
     Fale com a Mídia; para tentar outra vez, apagar `._portal.txt` dessa pasta do culto.
   - HEIC/RAW não sobem (o aviso diz quantos). Para não enviar um culto: desligar "Enviar para o álbum do portal" na janela.
6. Soltar a apresentação como de costume (ou ela começa sozinha, se estiver ligado).

### Estilos da moldura

| Estilo | Como fica |
|---|---|
| **Clássico** | foto à esquerda com passe-partout branco, painel azul à direita (o de sempre) |
| **Postal** | foto inclinada, moldura branca, sombra de postal |
| **Diagonal** | foto grande com corte em diagonal e um filete dourado |
| **Jovem** | a foto ocupa tudo, escurecida em baixo, título grande e verde-água |
| **Mulher** | fundo rosa, foto em arco (como uma janela), serifa e dourado velho |
| **Homem** | azul-aço, texto à esquerda e foto à direita com um filete fino |
| **Família** | foto inteira com uma faixa clara em baixo: título, versículo e QR |

Todos levam a pomba da igreja, a data, o versículo (ou um diferente em cada foto) e o QR do álbum. Servem para fotos
verticais e horizontais; nas horizontais os estilos Jovem e Família mostram a foto inteira, e os outros emolduram-na.

## Sincronizar APP (o culto do portal → Holyrics)
Uma ação só. Faz numa vez o que o plugin do LouveApp faz: o culto que a equipa preparou no portal passa para a lista do
Holyrics. E, se só quiseres as artes, também é por aqui.
1. **Abra no Holyrics o culto que quer preencher** (a lista de mídia do culto aberto é onde se escreve).
2. **"Sincronizar APP"** (botão do módulo ou clique direito numa pasta de imagens) → escolhe o **culto do portal** (hoje,
   senão o próximo) e **o que trazer**:
   - **Culto completo**: músicas, artes, escala e rotina na lista aberta. Se o culto aberto no Holyrics tiver outra data,
     avisa e pergunta antes de escrever.
   - **Só as artes do telão**: descarrega para a pasta `ARTES-CULTO` e **não mexe na lista**.
3. No culto completo aparece a lista com caixas para marcar: cada **música** do repertório, cada **arte do telão** (com a
   secção onde entra) e **"Escala e rotina em texto"**. Opções: *Adicionar também à lista de Letras* e *Lista já preenchida*:
   **Mesclar** (não duplica; põe cada coisa debaixo do seu título) ou **Substituir** (limpa a lista e as letras, depois de
   pedir confirmação).
4. Onde fica cada coisa: músicas → **LOUVOR**; artes → ABERTURA (oração, boas-vindas), ORACOES (oração por…), OFERTORIO (oferta),
   MENSAGEM (palavra), ENCERRAMENTO (fundo sem texto); escala e rotina → título **ESCALA E ROTINA (NAO PROJETAR)** com um texto.
   Os títulos que já existirem no culto (ABERTURA, LOUVOR…) são usados; os que faltarem são criados com cores.
5. Resumo no fim: o que entrou e o que falhou (ex.: música que não está no Holyrics: ligue-a no portal ou acrescente-a).
- **Músicas que não estão ligadas:** o módulo procura na biblioteca do Holyrics a mais parecida (sem "(Ao vivo)", acentos, maiúsculas);
  se houver uma só muito parecida usa-a; senão abre uma janela com as parecidas, **Procurar no Holyrics…** (a janela de escolher música
  do Holyrics), **Criar letra nova…** (abre o editor com o título e o artista; depois de guardar, carregar outra vez em "Sincronizar APP"
  com Mesclar) ou **Saltar**. A escolha fica lembrada neste PC e **ligada no portal** (ficha da música no repertório), por isso da
  próxima vez é encontrada logo — também nos outros PCs.
- **A chave do portal** (uma vez): no portal, **Mídia → Holyrics: artes do culto → Gerar a chave** (aparece uma só vez: copiar).
  No Holyrics, nas definições do módulo, colar a **chave** e confirmar o **portal** (`https://app.igrejaadmvc.org`) e a
  **pasta das artes** (`ARTES-CULTO`). Trocar a chave no portal desliga a antiga.
- **Permissões do módulo:** em *Definições do módulo* ligue as permissões avançadas **Arquivos permitidos** (já usada) e
  **Criar, editar e remover dados importantes** (para criar o texto da escala; sem ela a escala entra como linhas de título).
- As artes do telão vão para a pasta ARTES-CULTO (as que lá estavam com o mesmo nome são substituídas). Depois, mostrar a
  pasta no Holyrics como de costume (ou ligar "Começar o slide-show no fim").
- A API do Holyrics só LÊ as Anotações e a aba Escala (não há como escrever lá), por isso a escala vai como texto na lista.
- A Mídia faz as artes no portal em **Divulgação** e carrega em **Publicar para a igreja**. O Holyrics traz só as do **telão**.
- No computador do telão copie outra vez a pasta (FotosCulto.exe e FotosCultoADMVC.js novos).
- À mão (teste): `FotosCulto.exe --listar --portal https://app.igrejaadmvc.org --chave …` e
  `FotosCulto.exe --trazer --portal … --chave … --evento 12 --pasta "C:\...\ARTES-CULTO"`.

## Bom saber
- **As fotos da Entrada:** escolhem-se as **10 espalhadas pela hora da foto** (EXIF; sem EXIF, a hora do ficheiro), para não
  saírem todas do mesmo momento. Fotos tiradas no mesmo segundo (rajada) contam como uma: fica a maior. **Todas** as
  originais ficam em `Cultos\<data> <título>\` e a Entrada fica vazia. O que não é imagem suportada (HEIC, RAW…) também
  vai para o arquivo, para a Entrada não ficar com restos.
- **Antes dos slides, as fotos do culto anterior são substituídas** — mas só no fim, quando os novos estão prontos. Se tudo
  falhar, o culto anterior fica como está.
- **Nada se apaga:** na rotina da Entrada as fotos ficam no arquivo (`Cultos\…`), por isso as 10 cópias da pasta FOTOS-CULTO
  saem no fim. No modo antigo (fotos na pasta), os originais passam para `_originais\` dentro da pasta (ou apagam-se, se
  marcar a caixa). A subpasta `_originais` não entra no slide-show.
- **HEIC do iPhone não entra** (o Windows não abre esse formato). A janela diz quantas ficaram de fora. Para as usar: no
  iPhone, **Definições → Câmara → Formatos → Mais compatível**, ou exportar em JPG.
- Se houver mais fotos do que as escolhidas no modo antigo, usam-se as primeiras **por ordem natural** (`IMG_2` antes de
  `IMG_10`) e as outras ficam na pasta.
- Se uma foto falhar, essa fica na pasta e o aviso diz quantas falharam.
- **Para refazer** (outro título, outra moldura): copiar as fotos do arquivo `Cultos\…` de volta para a `Entrada` e repetir.
- O desenho está em `modelo\modelo.html` (cores, letras, posições). Para mudar o desenho, pedir ao Claude.
- Para correr à mão (teste): `FotosCulto.exe --pasta "C:\...\FOTOS-CULTO" --titulo "Culto de Jovens" --data "Quarta-feira, 21 de outubro" --estilo inclinada --link "https://…"`
  (mais `--recursivo`, `--max 20`, `--escala 2`, `--apagar-originais`, `--entrada "…\Entrada"`, `--arquivo "…\Cultos"`).
- Ver o que a pasta e a Entrada têm, sem mexer em nada: `FotosCulto.exe --inventario --pasta "C:\...\FOTOS-CULTO"`.

## Ficheiros
- `FotosCulto.exe` — o programa, feito a partir de `src\FotosCulto.cs`. Depois de mudar o código, correr `compilar.cmd`
  (usa o compilador de C# que já vem no Windows) e guardar o `.exe` novo junto com o código.
- `modelo\` — o desenho do slide, as letras (Cinzel, Montserrat, Playfair Display) e a pomba; o QR é feito com a biblioteca
  livre de Project Nayuki (licença MIT, em `modelo\qrcodegen.js`).
- `FotosCultoADMVC.js` — o módulo do Holyrics.
- À mão (teste do envio): acrescentar `--enviar --portal https://app.igrejaadmvc.org --chave …` ao comando do preparar (mais `--evento-id 12` para ligar o álbum a um culto do portal).
