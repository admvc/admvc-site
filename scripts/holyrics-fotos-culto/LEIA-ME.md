# Fotos do Culto ADMVC — moldura e QR para o slide-show do Holyrics

A equipa da fotografia põe 7 a 10 fotos na pasta **FOTOS-CULTO** do Holyrics. Com um clique, cada foto ganha moldura, o
título do culto, a data, um versículo e o QR do álbum. Os originais são apagados e ficam `slide-01.png`, `slide-02.png`…
Como os PCs sincronizam pelo Holyrics, chega fazer isto no PC da fotografia.

Fica guardado com o portal da igreja, em `admvc/scripts/holyrics-fotos-culto/` (histórico no git). Para levar para um PC,
copiar esta pasta (ou descarregá-la do repositório).

## Instalar (uma vez em cada PC onde se vai usar)
1. Copiar esta pasta inteira para `C:\Holyrics\FotosCulto\`
   (tem de ficar `FotosCulto.exe` e a pasta `modelo` lado a lado).
2. No Holyrics: **Menu → Módulos (JavaScript)** → adicionar módulo → escolher `FotosCultoADMVC.js`.
3. Nas definições do módulo **Fotos do Culto ADMVC**:
   - em **Arquivos permitidos**, escolher `C:\Holyrics\FotosCulto\FotosCulto.exe`;
   - confirmar a pasta (`FOTOS-CULTO`) e o link do álbum;
   - opcional: "Começar o slide-show no fim" e os segundos por foto.

O PC precisa só do Windows e do Microsoft Edge (já vêm instalados). As fotos não precisam de internet; trazer as artes precisa.

## Usar em cada culto
1. Pôr as fotos (7 a 10) na pasta **FOTOS-CULTO**.
2. Clique direito na pasta **FOTOS-CULTO** → **Preparar fotos para o slide-show**
   (ou o botão do módulo "Preparar fotos do culto").
3. Confirmar ou mudar o **título**, a **data**, o **estilo** (direita, inclinada ou diagonal) e o **link do álbum**
   (fica guardado para a próxima vez). O versículo pode ficar vazio: cada foto leva um diferente.
4. Esperar o aviso "10 fotos prontas" (cerca de 3 segundos por foto).
5. Soltar a apresentação como de costume (ou ela começa sozinha, se estiver ligado nas definições).

## Receber o culto do portal (músicas, artes, escala e rotina)
Faz numa só vez o que o plugin do LouveApp faz: o culto que a equipa preparou no portal passa para a lista do Holyrics.
1. **Abra no Holyrics o culto que quer preencher** (a lista de mídia do culto aberto é onde se escreve).
2. **Ação "Receber o culto do portal"** (botão do módulo ou clique direito numa pasta de imagens) → escolhe o culto do portal
   (hoje, senão o próximo). Se o culto aberto no Holyrics tiver outra data, avisa e pergunta antes de escrever.
3. Aparece a lista com caixas para marcar: cada **música** do repertório, cada **arte do telão** (com a secção onde entra) e
   **"Escala e rotina em texto"**. Opções: *Adicionar também à lista de Letras* e *Lista já preenchida*: **Mesclar** (não duplica;
   põe cada coisa debaixo do seu título) ou **Substituir** (limpa a lista e as letras, depois de pedir confirmação).
4. Onde fica cada coisa: músicas → **LOUVOR**; artes → ABERTURA (oração, boas-vindas), ORACOES (oração por…), OFERTORIO (oferta),
   MENSAGEM (palavra), ENCERRAMENTO (fundo sem texto); escala e rotina → título **ESCALA E ROTINA (NAO PROJETAR)** com um texto.
   Os títulos que já existirem no culto (ABERTURA, LOUVOR…) são usados; os que faltarem são criados com cores.
5. Resumo no fim: o que entrou e o que falhou (ex.: música que não está no Holyrics: ligue-a no portal ou acrescente-a).
- **Músicas que não estão ligadas:** o módulo procura na biblioteca do Holyrics a mais parecida (sem "(Ao vivo)", acentos, maiúsculas);
  se houver uma só muito parecida usa-a; senão abre uma janela com as parecidas, **Procurar no Holyrics…** (a janela de escolher música
  do Holyrics), **Criar letra nova…** (abre o editor com o título e o artista; depois de guardar, carregar outra vez em "Receber o culto"
  com Mesclar) ou **Saltar**. A escolha fica lembrada neste PC e **ligada no portal** (ficha da música no repertório), por isso da
  próxima vez é encontrada logo — também nos outros PCs.
- **Permissões do módulo:** em *Definições do módulo* ligue as permissões avançadas **Arquivos permitidos** (já usada) e
  **Criar, editar e remover dados importantes** (para criar o texto da escala; sem ela a escala entra como linhas de título).
- As artes são descarregadas para a pasta ARTES-CULTO (as da mesma ação substituem as anteriores com o mesmo nome).
- A API do Holyrics só LÊ as Anotações e a aba Escala (não há como escrever lá), por isso a escala vai como texto na lista.
- No computador do telão copie outra vez a pasta (FotosCulto.exe e FotosCultoADMVC.js novos).

## Trazer as artes do culto (do portal)
A Mídia faz as artes em **Divulgação** (portal) e carrega em **Publicar para a igreja**. O Holyrics traz só as do **telão**.
1. Uma vez: no portal, **Mídia → Holyrics: artes do culto → Gerar a chave** (aparece uma só vez: copiar). No Holyrics,
   nas definições do módulo, colar a **chave** e confirmar o **portal** (`https://app.igrejaadmvc.org`) e a **pasta das artes** (`ARTES-CULTO`).
   Os PCs têm de ter o `FotosCulto.exe` e o módulo **novos** (copiar a pasta outra vez).
2. Em cada culto: clique direito numa pasta de imagens → **Trazer as artes do culto** (ou o botão do módulo).
   Aparece o culto de hoje (senão o próximo): confirmar. As artes que lá estavam são substituídas (`01-oracao.png`, `02-…`).
3. Mostrar a pasta **ARTES-CULTO** no Holyrics como de costume (ou ligar "Começar o slide-show no fim").
- Trocar a chave no portal desliga a antiga: colar a nova no módulo.
- À mão (teste): `FotosCulto.exe --listar --portal https://app.igrejaadmvc.org --chave …` e
  `FotosCulto.exe --trazer --portal … --chave … --evento 12 --pasta "C:\...\ARTES-CULTO"`.

## Bom saber
- Os **slides do culto anterior são apagados** quando se preparam fotos novas.
- Se houver mais fotos do que o máximo (10), usam-se as primeiras por ordem do nome; **as outras ficam na pasta**.
- Se uma foto falhar, essa **não é apagada** e o aviso diz quantas falharam.
- O desenho está em `modelo\modelo.html` (cores, letras, posições). Para mudar o desenho, pedir ao Claude.
- Para correr à mão (teste): `FotosCulto.exe --pasta "C:\...\FOTOS-CULTO" --titulo "Culto de Jovens" --data "Quarta-feira, 21 de outubro" --estilo inclinada --link "https://…"`

## Ficheiros
- `FotosCulto.exe` — o programa, feito a partir de `src\FotosCulto.cs`. Depois de mudar o código, correr `compilar.cmd`
  (usa o compilador de C# que já vem no Windows) e guardar o `.exe` novo junto com o código.
- `modelo\` — o desenho do slide, as letras (Cinzel, Montserrat, Playfair Display) e a pomba; o QR é feito com a biblioteca
  livre de Project Nayuki (licença MIT, em `modelo\qrcodegen.js`).
- `FotosCultoADMVC.js` — o módulo do Holyrics.
