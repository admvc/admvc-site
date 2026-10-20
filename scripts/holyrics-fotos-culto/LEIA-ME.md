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

O PC precisa só do Windows e do Microsoft Edge (já vêm instalados). Não precisa de internet.

## Usar em cada culto
1. Pôr as fotos (7 a 10) na pasta **FOTOS-CULTO**.
2. Clique direito na pasta **FOTOS-CULTO** → **Preparar fotos para o slide-show**
   (ou o botão do módulo "Preparar fotos do culto").
3. Confirmar ou mudar o **título**, a **data**, o **estilo** (direita, inclinada ou diagonal) e o **link do álbum**
   (fica guardado para a próxima vez). O versículo pode ficar vazio: cada foto leva um diferente.
4. Esperar o aviso "10 fotos prontas" (cerca de 3 segundos por foto).
5. Soltar a apresentação como de costume (ou ela começa sozinha, se estiver ligado nas definições).

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
