# Baixar vídeo do YouTube — um botão no Holyrics

Cola-se o link de um vídeo do YouTube e ele é descarregado para a pasta **YOUTUBE** dos vídeos do Holyrics
(`Vídeos → YOUTUBE`). No fim, o módulo pergunta se o vídeo entra na lista do culto aberto e se começa a tocar.
A qualidade por omissão é **1080p**; nas definições do módulo pode ficar em 720p, 480p ou só o áudio (MP3).

```
C:\Holyrics\BaixarVideo\
├─ BaixarVideo.exe        o programa que descarrega (o módulo chama-o)
├─ BaixarVideoADMVC.js    o módulo que aparece dentro do Holyrics
├─ bin\yt-dlp.exe         descarregado na 1.ª vez (~18 MB); não vai para o git
└─ LEIA-ME.md
```

O vídeo fica em:

```
C:\Holyrics\Holyrics\files\media\video\YOUTUBE\
```

Fica guardado com o portal da igreja, em `admvc/scripts/holyrics-baixar-video/` (histórico no git). Para levar para
outro PC, copiar a pasta e voltar a instalar o módulo nesse Holyrics.

## Instalar (uma vez em cada PC)

1. Copiar esta pasta para `C:\Holyrics\BaixarVideo\` (o `BaixarVideo.exe` e o `BaixarVideoADMVC.js` lado a lado).
   Se quiser evitar o primeiro download, copiar também a pasta `bin\` com o `yt-dlp.exe` já lá dentro.
2. No Holyrics: **Menu → Módulos (JavaScript) → adicionar módulo → escolher `BaixarVideoADMVC.js`**.
3. Nas definições do módulo **Baixar vídeo do YouTube**:
   - em **Arquivos permitidos**, escolher `C:\Holyrics\BaixarVideo\BaixarVideo.exe`;
   - confirmar a pasta dos vídeos (`YOUTUBE`) e a qualidade (1080p);
   - o **tempo máximo** vem a 30 minutos — chega para um culto inteiro em 1080p numa ligação normal;
   - deixar ligadas as duas perguntas do fim (entrar na lista / começar a tocar).

O PC precisa do Windows e de internet. **Não é preciso instalar o ffmpeg**: o programa usa o `ffmpeg.exe` que já vem
com o Holyrics (`C:\Holyrics\Holyrics\files\ffmpeg.exe`), encontrado automaticamente.

## Usar

1. Clicar em **Baixar vídeo do YouTube** (botão do módulo).
2. Colar o link (`https://www.youtube.com/watch?v=…` ou `https://youtu.be/…`) e confirmar. O último link fica
   preenchido da próxima vez.
3. Esperar. O Holyrics fica ocupado enquanto descarrega — **não fechar nem clicar durante esse tempo**. Não há
   percentagem ao vivo: no fim aparece o aviso com o nome e o tamanho.
   - um clipe de 2 minutos em 1080p: cerca de meio minuto a dois minutos;
   - um culto de 1 hora em 1080p: pode levar 5 a 20 minutos, conforme a ligação.
4. No fim, duas perguntas:
   - **«Adicionar à lista do culto aberto?»** → entra na lista de mídia como item de vídeo (`YOUTUBE/ficheiro.mp4`);
   - **«Começar a tocar agora?»** → abre o vídeo no telão.
   Se não houver culto aberto, o vídeo fica só guardado — aparece em **Vídeos → YOUTUBE** e pode ser arrastado para
   a lista como sempre.
5. O ficheiro tem o nome do título do vídeo. Se voltar a descarregar o mesmo, o yt-dlp não duplica: diz que já está.

## O que é seguro esperar

- **H.264 + AAC dentro de MP4.** O `ffmpeg.exe` do Holyrics é de 2014 e não sabe juntar AV1 nem VP9; por isso o
  programa pede sempre a versão H.264 ao YouTube, que é também a que o Holyrics reproduz sem surpresas.
  Um vídeo que só tenha AV1/VP9 (raro) pode falhar — nesse caso tentar 720p ou 480p.
- **1080p num ficheiro só não existe no YouTube**: o vídeo e o áudio vêm separados e são juntados pelo ffmpeg.
  Sem ffmpeg, o programa tenta um ficheiro único, mas a qualidade máxima costuma ser 720p ou menos.
- **Só o áudio** sai em MP3 (para o fundo musical ou uma mensagem para ouvir).
- Os ficheiros ficam na pasta normal de vídeos do Holyrics, por isso sincronizam com os outros PCs como os restantes.

## Se algo falhar

| Aviso | O que fazer |
|---|---|
| «Falta indicar o programa BaixarVideo.exe…» | Definições do módulo → **Arquivos permitidos** → escolher o `BaixarVideo.exe`. |
| «Não consegui obter o yt-dlp…» | Sem internet ou o GitHub está bloqueado. Descarregar `yt-dlp.exe` em `https://github.com/yt-dlp/yt-dlp/releases/latest` e colocá-lo em `C:\Holyrics\BaixarVideo\bin\`. |
| «Could not write header…» / erro do ffmpeg | O vídeo só tem AV1/VP9. Tentar 720p ou 480p, ou substituir o `ffmpeg.exe` do Holyrics por um atual. |
| «Video unavailable» / «Private video» | O vídeo é privado, foi apagado ou está bloqueado no país. |
| «Sign in to confirm you're not a bot» | O YouTube pediu login. Este módulo não usa cookies de conta; nesse caso descarregar com o yt-dlp à mão (com `--cookies-from-browser`) e copiar o ficheiro para a pasta YOUTUBE. |
| O Holyrics corta o download a meio | Aumentar **Tempo máximo** nas definições (até 180 minutos). O que já foi descarregado fica em `.part`; repetir continua. |
| O vídeo não aparece em Vídeos → YOUTUBE | Actualizar a pasta no Holyrics (F5 / mudar de aba). O ficheiro está lá. |

O YouTube muda com frequência. Se um dia todos os downloads começarem a falhar, **apagar `bin\yt-dlp.exe`** e usar o
botão outra vez: ele descarrega a versão mais recente.

## Só vídeos próprios ou autorizados

O módulo é uma ferramenta técnica. Descarregar vídeos de terceiros pode violar os termos do YouTube e direitos de
autor. Usar com vídeos da própria igreja, com licença livre ou com autorização de quem os publicou.

## Refazer o programa

Se o `BaixarVideo.cs` for alterado, correr **`compilar.cmd`** (usa o compilador de C# que já vem no Windows; não
instala nada) e copiar o `BaixarVideo.exe` novo para `C:\Holyrics\BaixarVideo\`.
