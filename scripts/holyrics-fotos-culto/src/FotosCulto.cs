// FotosCulto.exe — põe moldura, título, data, versículo e o QR do álbum nas fotos do culto, para o slide-show do Holyrics.
//
//   FotosCulto.exe --pasta "C:\Holyrics\Holyrics\files\media\image\FOTOS-CULTO" --titulo "Culto de Jovens"
//                  --data "Quarta-feira, 21 de outubro" --estilo direita|inclinada|diagonal --link "https://…"
//                  [--verso "…" --ref "…"] [--max 10]
//
// Para cada foto da pasta (jpg/jpeg/png/webp, por ordem do nome) abre modelo\modelo.html no Edge sem janela e guarda o
// slide 1920×1080 (slide-01.png, …). Antes apaga os slides do culto anterior. O original só é apagado DEPOIS de o slide
// estar feito. No máximo 10 fotos: as que sobram ficam na pasta (não se apagam). Sai com 0 se correu tudo bem.
// Compilar (sem instalar nada): C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /out:FotosCulto.exe src\FotosCulto.cs
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;

static class FotosCulto
{
    static readonly string[] Extensoes = { ".jpg", ".jpeg", ".png", ".webp" };

    static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        try { return Correr(LerArgumentos(args)); }
        catch (Exception e) { Console.WriteLine("Erro: " + e.Message); return 1; }
    }

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

    static int Correr(Dictionary<string, string> a)
    {
        string pasta = Valor(a, "pasta");
        if (pasta == "" || !Directory.Exists(pasta)) { Console.WriteLine("Pasta não encontrada: " + pasta); return 1; }
        string aqui = AppDomain.CurrentDomain.BaseDirectory;
        string modelo = Path.Combine(aqui, "modelo", "modelo.html");
        if (!File.Exists(modelo)) { Console.WriteLine("Falta o modelo: " + modelo); return 1; }
        string navegador = AcharNavegador();
        if (navegador == null) { Console.WriteLine("Não encontrei o Microsoft Edge nem o Google Chrome neste computador."); return 1; }

        int max;
        if (!int.TryParse(Valor(a, "max", "10"), out max) || max < 1) max = 10;
        string estilo = Valor(a, "estilo", "direita").ToLowerInvariant();
        if (estilo != "direita" && estilo != "inclinada" && estilo != "diagonal") estilo = "direita";

        var todas = Directory.GetFiles(pasta)
            .Where(f => Extensoes.Contains(Path.GetExtension(f).ToLowerInvariant()))
            .OrderBy(f => Path.GetFileName(f), StringComparer.OrdinalIgnoreCase)
            .ToList();
        var slidesAntigos = todas.Where(f => Path.GetFileName(f).StartsWith("slide-", StringComparison.OrdinalIgnoreCase)).ToList();
        var fotos = todas.Except(slidesAntigos).ToList();
        if (fotos.Count == 0) { Console.WriteLine("Não há fotos novas na pasta (só slides já feitos)."); return 1; }

        var usar = fotos.Take(max).ToList();
        int deFora = fotos.Count - usar.Count;

        // os slides do culto anterior saem antes de criar os novos
        foreach (var s in slidesAntigos) TentarApagar(s);

        string temp = Path.Combine(Path.GetTempPath(), "FotosCulto-" + Guid.NewGuid().ToString("N").Substring(0, 8));
        Directory.CreateDirectory(temp);
        int feitas = 0;
        try
        {
            for (int i = 0; i < usar.Count; i++)
            {
                string foto = usar[i];
                int n = i + 1;
                string saida = Path.Combine(pasta, string.Format("slide-{0:00}.png", n));
                string png = Path.Combine(temp, "s" + n + ".png");
                var p = new List<string>
                {
                    "estilo=" + estilo,
                    "foto=" + Uri.EscapeDataString(new Uri(foto).AbsoluteUri),
                    "titulo=" + Uri.EscapeDataString(Valor(a, "titulo", "Culto")),
                    "data=" + Uri.EscapeDataString(Valor(a, "data")),
                    "link=" + Uri.EscapeDataString(Valor(a, "link")),
                    "n=" + n,
                };
                if (Valor(a, "verso") != "") { p.Add("verso=" + Uri.EscapeDataString(Valor(a, "verso"))); p.Add("ref=" + Uri.EscapeDataString(Valor(a, "ref"))); }
                string endereco = new Uri(modelo).AbsoluteUri + "?" + string.Join("&", p);

                if (!Fotografar(navegador, endereco, png, Path.Combine(temp, "perfil")))
                {
                    Console.WriteLine("Não consegui fazer o slide de " + Path.GetFileName(foto) + " (a foto fica na pasta).");
                    continue;
                }
                File.Copy(png, saida, true);
                // só agora, com o slide feito, o original sai
                if (new FileInfo(saida).Length > 0) TentarApagar(foto);
                feitas++;
                Console.WriteLine(string.Format("{0}/{1} {2} → {3}", n, usar.Count, Path.GetFileName(foto), Path.GetFileName(saida)));
            }
        }
        finally
        {
            try { Directory.Delete(temp, true); } catch { }
        }

        string resumo = feitas + (feitas == 1 ? " foto pronta" : " fotos prontas");
        if (deFora > 0) resumo += string.Format(" · {0} {1} de fora (máximo {2}) e {3} na pasta", deFora, deFora == 1 ? "ficou" : "ficaram", max, deFora == 1 ? "continua" : "continuam");
        if (feitas < usar.Count) resumo += string.Format(" · {0} falharam", usar.Count - feitas);
        Console.WriteLine(resumo);
        return feitas == usar.Count && feitas > 0 ? 0 : 1;
    }

    /// <summary>Abre o endereço no Edge/Chrome sem janela e guarda a imagem 1920×1080.</summary>
    static bool Fotografar(string navegador, string endereco, string png, string perfil)
    {
        var args = string.Join(" ", new[]
        {
            "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--no-first-run", "--no-default-browser-check",
            "--allow-file-access-from-files", "--virtual-time-budget=8000", "--window-size=1920,1080",
            "--user-data-dir=\"" + perfil + "\"",   // perfil próprio: não mexe num Edge que esteja aberto
            "--screenshot=\"" + png + "\"",
            "\"" + endereco + "\"",
        });
        var info = new ProcessStartInfo(navegador, args) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardError = true, RedirectStandardOutput = true };
        using (var pr = Process.Start(info))
        {
            pr.StandardOutput.ReadToEndAsync();
            pr.StandardError.ReadToEndAsync();
            if (!pr.WaitForExit(90000)) { try { pr.Kill(); } catch { } return false; }
        }
        for (int i = 0; i < 20 && !File.Exists(png); i++) Thread.Sleep(100);
        return File.Exists(png) && new FileInfo(png).Length > 0;
    }

    static string AcharNavegador()
    {
        string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        var candidatos = new[]
        {
            Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
        };
        return candidatos.FirstOrDefault(File.Exists);
    }

    static void TentarApagar(string f)
    {
        for (int i = 0; i < 5; i++)
        {
            try { File.Delete(f); return; }
            catch { Thread.Sleep(300); }
        }
        Console.WriteLine("Não consegui apagar " + Path.GetFileName(f) + " (está aberto noutro programa?).");
    }
}
