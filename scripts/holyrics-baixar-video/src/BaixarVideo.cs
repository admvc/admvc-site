// BaixarVideo.exe — descarrega um vídeo (ou só o áudio) do YouTube para a pasta de vídeos do Holyrics.
//
//   BaixarVideo.exe --baixar --url "https://youtu.be/..." --pasta "C:\Holyrics\Holyrics\files\media\video\YOUTUBE"
//                   [--qualidade 1080|720|480|audio] [--ffmpeg "C:\Holyrics\Holyrics\files"]
//   BaixarVideo.exe --versao                  ->  V|1
//
// Linhas lidas pelo módulo do Holyrics (uma por linha):
//   I|texto                       informação / progresso
//   T|título                      título do vídeo
//   R|ok|caminho|bytes|título     terminou bem
//   E|mensagem                    erro
//
// Usa o yt-dlp (descarregado para bin\ na primeira vez, ~18 MB) e o ffmpeg que já vem com o
// Holyrics (<Holyrics>\files\ffmpeg.exe), encontrado a subir a partir da pasta dos vídeos.
// Sem ffmpeg, tenta um ficheiro único de menor qualidade (o YouTube não dá 1080p num só ficheiro).
//
// Compilar: compilar.cmd  (não precisa de instalar nada)

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Text;

static class BaixarVideo
{
    static readonly string[] Extensoes = { ".mp4", ".mkv", ".webm", ".mov", ".m4a", ".mp3" };
    const string Versao = "1";
    const string YtDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";

    static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        try { ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; } catch { }   // TLS 1.2 (GitHub)
        try
        {
            var a = LerArgumentos(args);
            if (a.ContainsKey("versao")) { Console.WriteLine("V|" + Versao); return 0; }
            if (a.ContainsKey("baixar")) return Baixar(a);
            Console.WriteLine("E|Nada para fazer. Use --baixar --url <link> --pasta <pasta>.");
            return 1;
        }
        catch (Exception e)
        {
            Console.WriteLine("E|" + Limpar(e.Message));
            return 1;
        }
    }

    static int Baixar(Dictionary<string, string> a)
    {
        string url = Valor(a, "url");
        string pasta = Valor(a, "pasta");
        string qualidade = Valor(a, "qualidade", "1080").ToLowerInvariant();

        if (qualidade != "1080" && qualidade != "720" && qualidade != "480" && qualidade != "audio") qualidade = "1080";
        if (url == "") { Diz("E|Falta o link do vídeo do YouTube."); return 1; }
        if (!url.StartsWith("http://") && !url.StartsWith("https://")) { Diz("E|O link tem de começar por https://"); return 1; }
        if (pasta == "") { Diz("E|Falta a pasta onde guardar o vídeo."); return 1; }

        try { Directory.CreateDirectory(pasta); }
        catch (Exception e) { Diz("E|Não consegui criar a pasta " + pasta + ": " + e.Message); return 1; }

        string ytdlp = GarantirYtDlp();
        if (ytdlp == null) return 1;

        bool soAudio = qualidade == "audio";
        string ffmpeg = AcharFfmpeg(pasta, a);
        Diz("I|ffmpeg: " + (ffmpeg == null ? "não encontrado" : ffmpeg));

        // O ffmpeg que vem com o Holyrics é antigo (2014): não sabe juntar AV1 nem VP9. Preferir sempre H.264 (avc1),
        // que é também o que o Holyrics reproduz sem surpresas; só no fim aceita outro codec.
        string fmt;
        if (soAudio)
            fmt = ffmpeg != null ? "bestaudio/best" : "bestaudio[ext=m4a]/bestaudio/best";
        else if (ffmpeg != null)
            fmt = "bv*[height<=" + qualidade + "][vcodec^=avc1]+ba[ext=m4a]/b[height<=" + qualidade + "][ext=mp4]/bv*[height<=" + qualidade + "][vcodec^=avc1]+ba/b[height<=" + qualidade + "]/b";
        else
            fmt = "b[height<=" + qualidade + "][ext=mp4]/b[height<=" + qualidade + "]/b";

        var args = new StringBuilder();
        args.Append("--no-playlist --newline --no-progress --no-simulate --no-overwrites --encoding utf-8");
        args.Append(" --print \"before_dl:T|%(title)s\"");
        args.Append(" --print \"after_move:F|%(filepath)s\"");
        args.Append(" -f ").Append(Aspas(fmt));
        if (!soAudio && ffmpeg != null) args.Append(" --merge-output-format mp4");
        if (ffmpeg != null) args.Append(" --ffmpeg-location ").Append(Aspas(ffmpeg));
        if (soAudio && ffmpeg != null) args.Append(" -x --audio-format mp3 --audio-quality 0");
        args.Append(" -o ").Append(Aspas(pasta.TrimEnd('\\', '/') + "\\%(title).120s.%(ext)s"));
        args.Append(" ").Append(Aspas(url));

        var saida = new List<string>();
        var erros = new List<string>();
        int codigo;

        Diz("I|A descarregar (" + Rotulo(qualidade) + ")…");
        var psi = new ProcessStartInfo(ytdlp, args.ToString());
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.RedirectStandardOutput = true;
        psi.RedirectStandardError = true;
        psi.StandardOutputEncoding = Encoding.UTF8;
        psi.StandardErrorEncoding = Encoding.UTF8;

        using (var p = Process.Start(psi))
        {
            p.OutputDataReceived += delegate(object s, DataReceivedEventArgs e) { if (e.Data != null) { lock (saida) saida.Add(e.Data); } };
            p.ErrorDataReceived += delegate(object s, DataReceivedEventArgs e) { if (e.Data != null) { lock (erros) erros.Add(e.Data); } };
            p.BeginOutputReadLine();
            p.BeginErrorReadLine();
            p.WaitForExit();
            p.WaitForExit();   // segunda chamada: garante que as últimas linhas chegaram
            codigo = p.ExitCode;
        }

        string titulo = "";
        string caminho = "";
        for (int i = 0; i < saida.Count; i++)
        {
            string l = saida[i];
            if (l.StartsWith("T|")) titulo = l.Substring(2).Trim();
            else if (l.StartsWith("F|")) caminho = l.Substring(2).Trim();
        }

        // O yt-dlp pode ter-se calado (ficheiro já existente): procurar na pasta.
        if (caminho == "" || !File.Exists(caminho)) caminho = ProcurarNaPasta(pasta, titulo);

        if (codigo != 0 || caminho == "" || !File.Exists(caminho))
        {
            string erro = PrimeiroErro(erros, saida);
            if (codigo == 0 && caminho == "" && titulo != "")
                erro = "O vídeo não apareceu na pasta depois do download. Veja o registo do módulo.";
            Diz("E|" + Limpar(erro));
            if (saida.Count > 0) Diz("I|" + Limpar(saida[saida.Count - 1]));
            return 1;
        }

        long bytes = 0;
        try { bytes = new FileInfo(caminho).Length; } catch { }
        if (titulo == "") titulo = Path.GetFileNameWithoutExtension(caminho);
        Diz("R|ok|" + caminho + "|" + bytes.ToString(CultureInfo.InvariantCulture) + "|" + Limpar(titulo));
        return 0;
    }

    // ---- ferramentas ----------------------------------------------------------------------------------------------------

    /// <summary>O yt-dlp ao lado do exe, em bin\, no PATH — ou descarregado de GitHub para bin\ (só na primeira vez).</summary>
    static string GarantirYtDlp()
    {
        string dir = AppDomain.CurrentDomain.BaseDirectory;
        var candidatos = new[] { Path.Combine(dir, "yt-dlp.exe"), Path.Combine(dir, @"bin\yt-dlp.exe") };
        for (int i = 0; i < candidatos.Length; i++) if (File.Exists(candidatos[i])) return candidatos[i];

        string noPath = ProcurarNoPath("yt-dlp.exe");
        if (noPath != null) return noPath;

        string destino = Path.Combine(dir, @"bin\yt-dlp.exe");
        try { Directory.CreateDirectory(Path.GetDirectoryName(destino)); } catch { }
        Diz("I|A obter o yt-dlp (só na primeira vez, ~18 MB)…");
        try
        {
            using (var w = new WebClient())
            {
                w.Headers.Add("User-Agent", "BaixarVideoADMVC/1.0");
                w.DownloadFile(YtDlpUrl, destino);
            }
            if (File.Exists(destino) && new FileInfo(destino).Length > 5000000)
            {
                Diz("I|yt-dlp pronto.");
                return destino;
            }
        }
        catch (Exception e)
        {
            try { if (File.Exists(destino)) File.Delete(destino); } catch { }
            Diz("E|Não consegui obter o yt-dlp: " + e.Message + ". Verifique a internet ou copie o yt-dlp.exe para " + Path.GetDirectoryName(destino) + ".");
            return null;
        }
        try { if (File.Exists(destino)) File.Delete(destino); } catch { }
        Diz("E|O yt-dlp não ficou completo. Verifique a internet e tente outra vez.");
        return null;
    }

    /// <summary>Diretoria do ffmpeg: --ffmpeg, ao lado do exe, PATH, ou a subir a partir da pasta dos vídeos (o Holyrics traz um).</summary>
    static string AcharFfmpeg(string pasta, Dictionary<string, string> a)
    {
        string explicito = Valor(a, "ffmpeg");
        if (explicito != "")
        {
            try
            {
                if (Directory.Exists(explicito) && File.Exists(Path.Combine(explicito, "ffmpeg.exe"))) return explicito;
                if (File.Exists(explicito)) return Path.GetDirectoryName(explicito);
            }
            catch { }
        }

        string dir = AppDomain.CurrentDomain.BaseDirectory;
        var aoLado = new[] { dir, Path.Combine(dir, "bin") };
        for (int i = 0; i < aoLado.Length; i++) if (File.Exists(Path.Combine(aoLado[i], "ffmpeg.exe"))) return aoLado[i];

        try
        {
            var d = new DirectoryInfo(pasta);
            for (int i = 0; i < 8 && d != null; i++, d = d.Parent)
            {
                if (File.Exists(Path.Combine(d.FullName, "ffmpeg.exe"))) return d.FullName;
                string sub = Path.Combine(d.FullName, "files");
                if (File.Exists(Path.Combine(sub, "ffmpeg.exe"))) return sub;
            }
        }
        catch { }

        string noPath = ProcurarNoPath("ffmpeg.exe");
        if (noPath != null) return Path.GetDirectoryName(noPath);

        var comuns = new[]
        {
            @"C:\ffmpeg\bin",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"ffmpeg\bin"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"ffmpeg\bin"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\WinGet\Links"),
        };
        for (int i = 0; i < comuns.Length; i++)
        {
            try { if (File.Exists(Path.Combine(comuns[i], "ffmpeg.exe"))) return comuns[i]; }
            catch { }
        }
        return null;
    }

    static string ProcurarNoPath(string ficheiro)
    {
        try
        {
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            string[] partes = path.Split(';');
            for (int i = 0; i < partes.Length; i++)
            {
                string p = partes[i].Trim().Trim('"');
                if (p == "") continue;
                string f = Path.Combine(p, ficheiro);
                if (File.Exists(f)) return f;
            }
        }
        catch { }
        return null;
    }

    /// <summary>Caminho do ficheiro: o que o yt-dlp disse, ou o mais recente da pasta, ou o que tem o título.</summary>
    static string ProcurarNaPasta(string pasta, string titulo)
    {
        try
        {
            var ficheiros = new List<FileInfo>();
            foreach (string f in Directory.GetFiles(pasta))
            {
                string ext = Path.GetExtension(f).ToLowerInvariant();
                if (Array.IndexOf(Extensoes, ext) >= 0) ficheiros.Add(new FileInfo(f));
            }
            if (ficheiros.Count == 0) return "";

            DateTime limite = DateTime.Now.AddMinutes(-10);
            FileInfo melhor = null;
            for (int i = 0; i < ficheiros.Count; i++)
                if (ficheiros[i].LastWriteTime >= limite && (melhor == null || ficheiros[i].LastWriteTime > melhor.LastWriteTime))
                    melhor = ficheiros[i];
            if (melhor != null) return melhor.FullName;

            if (titulo != "")
            {
                string esperado = NomeSeguro(titulo);
                if (esperado.Length > 120) esperado = esperado.Substring(0, 120).Trim();
                for (int i = 0; i < ficheiros.Count; i++)
                {
                    string nome = Path.GetFileNameWithoutExtension(ficheiros[i].Name);
                    if (string.Equals(nome, esperado, StringComparison.OrdinalIgnoreCase) ||
                        nome.StartsWith(esperado, StringComparison.OrdinalIgnoreCase))
                        return ficheiros[i].FullName;
                }
            }
        }
        catch { }
        return "";
    }

    static string PrimeiroErro(List<string> erros, List<string> saida)
    {
        for (int i = erros.Count - 1; i >= 0; i--)
            if (erros[i].IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0) return ArrumarErro(erros[i]);
        for (int i = saida.Count - 1; i >= 0; i--)
            if (saida[i].IndexOf("ERROR", StringComparison.OrdinalIgnoreCase) >= 0) return ArrumarErro(saida[i]);
        if (erros.Count > 0) return erros[erros.Count - 1];
        if (saida.Count > 0) return saida[saida.Count - 1];
        return "Não foi possível descarregar o vídeo.";
    }

    static string ArrumarErro(string l)
    {
        string s = (l ?? "").Trim();
        int i = s.IndexOf("ERROR:", StringComparison.OrdinalIgnoreCase);
        if (i >= 0) s = s.Substring(i + 6).Trim();
        return s == "" ? "Não foi possível descarregar o vídeo." : s;
    }

    // ---- utilidades -----------------------------------------------------------------------------------------------------

    static Dictionary<string, string> LerArgumentos(string[] args)
    {
        var a = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < args.Length; i++)
        {
            if (!args[i].StartsWith("--")) continue;
            string chave = args[i].Substring(2);
            string valor = (i + 1 < args.Length && !args[i + 1].StartsWith("--")) ? args[++i] : "1";
            a[chave] = valor;
        }
        return a;
    }

    static string Valor(Dictionary<string, string> a, string chave, string omissao = "")
    {
        string v;
        return a.TryGetValue(chave, out v) ? v.Trim() : omissao;
    }

    /// <summary>Um nome de ficheiro como o yt-dlp o deixa no Windows (para reconhecer o que já estava na pasta).</summary>
    static string NomeSeguro(string s)
    {
        var sb = new StringBuilder();
        char[] maus = Path.GetInvalidFileNameChars();
        foreach (char c in Convert.ToString(s ?? ""))
            sb.Append(Array.IndexOf(maus, c) >= 0 ? '_' : c);
        return sb.ToString().Trim().TrimEnd('.');
    }

    static string Rotulo(string qualidade)
    {
        if (qualidade == "audio") return "só áudio";
        return qualidade + "p";
    }

    static string Aspas(string s)
    {
        return "\"" + (s ?? "").Replace("\"", "\\\"") + "\"";
    }

    /// <summary>Uma linha só: o módulo separa os campos por |.</summary>
    static string Limpar(string s)
    {
        if (s == null) return "";
        return s.Replace("|", "/").Replace("\r", " ").Replace("\n", " ").Trim();
    }

    static void Diz(string linha)
    {
        Console.WriteLine(linha);
    }
}
