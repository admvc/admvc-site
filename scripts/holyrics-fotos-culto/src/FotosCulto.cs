// FotosCulto.exe — põe moldura, título, data, versículo e o QR do álbum nas fotos do culto, para o slide-show do Holyrics.
//
//   Artes do culto (do portal, só as do telão):
//   FotosCulto.exe --listar --portal https://app.igrejaadmvc.org --chave <chave>      (uma linha por culto: id|AAAA-MM-DDTHH:MM|nome|artes)
//   FotosCulto.exe --trazer --portal … --chave … --evento 12 --pasta "C:\…\image\ARTES-CULTO"   (descarrega e SUBSTITUI o conteúdo da pasta)
//
//   Culto do app (músicas, artes, escala e rotina; uma linha curta por item, para o módulo do Holyrics):
//   FotosCulto.exe --cultos --portal … --chave …                    → C|id|AAAA-MM-DDTHH:MM|nome|músicas|artes
//   FotosCulto.exe --culto  --portal … --chave … --evento N        → N|nome|data  M|título|artista|idHolyrics|tom  A|secção|ficheiro|nome  E|linha  R|linha
//   FotosCulto.exe --trazer … [--so 01-oracao.png,03-oferta.png]   → só descarrega esses ficheiros
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
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using System.Threading;

static class FotosCulto
{
    static readonly string[] Extensoes = { ".jpg", ".jpeg", ".png", ".webp" };

    static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        try
        {
            var a = LerArgumentos(args);
            if (a.ContainsKey("cultos")) return CultosDoApp(a);
            if (a.ContainsKey("culto")) return CultoDoApp(a);
            if (a.ContainsKey("ligar")) return LigarMusica(a);
            if (a.ContainsKey("listar")) return Listar(a);
            if (a.ContainsKey("trazer")) return Trazer(a);
            return Correr(a);
        }
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

    // ---- artes do culto, vindas do portal -------------------------------------------------------------------------------

    static string PedirJson(Dictionary<string, string> a, string extra, out object json, string caminho = "/api/public/divulgacao/holyrics")
    {
        json = null;
        string portal = Valor(a, "portal").TrimEnd('/');
        string chave = Valor(a, "chave");
        if (portal == "" || chave == "") return "Falta o endereço do portal ou a chave (definições do módulo).";
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;   // TLS 1.2 (o .NET 4.8 antigo não o usa sozinho)
        try
        {
            using (var c = new WebClient { Encoding = Encoding.UTF8 })
            {
                string texto = c.DownloadString(portal + caminho + "?chave=" + Uri.EscapeDataString(chave) + extra);
                json = new JavaScriptSerializer().DeserializeObject(texto);
                return null;
            }
        }
        catch (WebException e)
        {
            var r = e.Response as HttpWebResponse;
            if (r != null && (int)r.StatusCode == 401) return "A chave não é válida (veja em Mídia, no portal).";
            if (r != null && (int)r.StatusCode == 404) return "Este culto não tem artes do telão publicadas.";
            if (r != null && (int)r.StatusCode == 429) return "Pedidos a mais: tente daqui a um minuto.";
            return "Não consegui falar com o portal: " + e.Message;
        }
    }

    // Uma linha curta e só em ASCII: os acentos vão como \uXXXX (o módulo do Holyrics converte de volta), sem depender da codificação.
    static string Linha(object o)
    {
        var sb = new StringBuilder();
        foreach (char ch in Convert.ToString(o ?? ""))
        {
            if (ch == '|') sb.Append('/');
            else if (ch == '\r' || ch == '\n') sb.Append(' ');
            else if (ch < 32 || ch > 126) sb.Append("\\u" + ((int)ch).ToString("x4"));
            else sb.Append(ch);
        }
        return sb.ToString();
    }

    /// <summary>Os cultos do app (de hoje a +14 dias), um por linha: C|id|data|nome|músicas|artes.</summary>
    static int CultosDoApp(Dictionary<string, string> a)
    {
        object json;
        string erro = PedirJson(a, "", out json, "/api/public/holyrics/culto");
        if (erro != null) { Console.WriteLine(erro); return 1; }
        var cultos = ((Dictionary<string, object>)json)["cultos"] as object[];
        if (cultos == null || cultos.Length == 0) { Console.WriteLine("Não há cultos no app para os próximos dias."); return 2; }
        foreach (Dictionary<string, object> c in cultos)
        {
            string data = Convert.ToString(c["data"]);
            if (data.Length >= 16) data = data.Substring(0, 16);   // a hora já vem em hora de Lisboa
            Console.WriteLine("C|" + Linha(c["id"]) + "|" + data + "|" + Linha(c["nome"]) + "|" + Linha(c["musicas"]) + "|" + Linha(c["artes"]));
        }
        return 0;
    }

    /// <summary>Um culto do app: N (nome e data), M (música), A (arte do telão e a secção), E (escala), R (rotina).</summary>
    static int CultoDoApp(Dictionary<string, string> a)
    {
        object json;
        string erro = PedirJson(a, "&evento=" + Uri.EscapeDataString(Valor(a, "evento")), out json, "/api/public/holyrics/culto");
        if (erro != null) { Console.WriteLine(erro); return 1; }
        var r = (Dictionary<string, object>)json;
        var culto = (Dictionary<string, object>)r["culto"];
        string data = Convert.ToString(culto["data"]); if (data.Length >= 16) data = data.Substring(0, 16);
        Console.WriteLine("N|" + Linha(culto["nome"]) + "|" + data);
        foreach (Dictionary<string, object> m in (object[])r["musicas"])
            Console.WriteLine("M|" + Linha(m["titulo"]) + "|" + Linha(m["artista"]) + "|" + Linha(m["holyricsId"]) + "|" + Linha(m["tom"]) + "|" + Linha(m.ContainsKey("id") ? m["id"] : ""));
        foreach (Dictionary<string, object> x in (object[])r["artes"])
            Console.WriteLine("A|" + Linha(x["secao"]) + "|" + Linha(x["ficheiro"]) + "|" + Linha(x["nome"]));
        foreach (object l in (object[])r["escala"]) Console.WriteLine("E|" + Linha(l));
        foreach (object l in (object[])r["rotina"]) Console.WriteLine("R|" + Linha(l));
        return 0;
    }

    /// <summary>Liga uma música do repertório à música do Holyrics (para a próxima vez ser encontrada logo): --ligar --musica ID --holyrics ID.</summary>
    static int LigarMusica(Dictionary<string, string> a)
    {
        string portal = Valor(a, "portal").TrimEnd('/');
        string chave = Valor(a, "chave");
        if (portal == "" || chave == "") { Console.WriteLine("Falta o endereço do portal ou a chave (definições do módulo)."); return 1; }
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
        try
        {
            using (var c = new WebClient { Encoding = Encoding.UTF8 })
            {
                c.UploadString(portal + "/api/public/holyrics/ligar?chave=" + Uri.EscapeDataString(chave) + "&musica=" + Uri.EscapeDataString(Valor(a, "musica")) + "&holyrics=" + Uri.EscapeDataString(Valor(a, "holyrics")), "POST", "");
            }
            Console.WriteLine("Ligada no portal.");
            return 0;
        }
        catch (WebException e)
        {
            var r = e.Response as HttpWebResponse;
            if (r != null && (int)r.StatusCode == 409) { Console.WriteLine("Essa música do Holyrics já está ligada a outra do repertório."); return 1; }
            if (r != null && (int)r.StatusCode == 401) { Console.WriteLine("A chave não é válida (veja em Mídia, no portal)."); return 1; }
            Console.WriteLine("Não consegui ligar no portal: " + e.Message);
            return 1;
        }
    }

    static int Listar(Dictionary<string, string> a)
    {
        object json;
        string erro = PedirJson(a, "", out json);
        if (erro != null) { Console.WriteLine(erro); return 1; }
        var cultos = ((Dictionary<string, object>)json)["cultos"] as object[];
        if (cultos == null || cultos.Length == 0) { Console.WriteLine("Não há artes do telão publicadas para os próximos dias."); return 2; }
        foreach (Dictionary<string, object> c in cultos)
        {
            string data = Convert.ToString(c["data"]);
            if (data.Length >= 16) data = data.Substring(0, 16);   // a hora já vem em hora de Lisboa
            Console.WriteLine(string.Format("{0}|{1}|{2}|{3}", c["id"], data, Convert.ToString(c["nome"]).Replace("|", "/"), c["artes"]));
        }
        return 0;
    }

    static int Trazer(Dictionary<string, string> a)
    {
        string pasta = Valor(a, "pasta");
        if (pasta == "") { Console.WriteLine("Falta a pasta das artes."); return 1; }
        object json;
        string erro = PedirJson(a, "&evento=" + Uri.EscapeDataString(Valor(a, "evento")), out json);
        if (erro != null) { Console.WriteLine(erro); return 1; }
        var culto = (Dictionary<string, object>)((Dictionary<string, object>)json)["culto"];
        var artes = (object[])culto["artes"];

        // primeiro tudo para uma pasta temporária; só se correr bem é que a pasta do Holyrics é substituída
        string temp = Path.Combine(Path.GetTempPath(), "ArtesCulto-" + Guid.NewGuid().ToString("N").Substring(0, 8));
        Directory.CreateDirectory(temp);
        try
        {
            using (var c = new WebClient())
            {
                string so = Valor(a, "so");
                var escolhidas = so == "" ? null : new HashSet<string>(so.Split(','), StringComparer.OrdinalIgnoreCase);
                foreach (Dictionary<string, object> x in artes)
                {
                    string ficheiro = Path.GetFileName(Convert.ToString(x["ficheiro"]));
                    if (escolhidas != null && !escolhidas.Contains(ficheiro)) continue;
                    c.DownloadFile(Convert.ToString(x["url"]), Path.Combine(temp, ficheiro));
                }
            }
            Directory.CreateDirectory(pasta);
            foreach (var antigo in Directory.GetFiles(pasta).Where(f => Extensoes.Contains(Path.GetExtension(f).ToLowerInvariant()))) TentarApagar(antigo);
            foreach (var nova in Directory.GetFiles(temp)) File.Copy(nova, Path.Combine(pasta, Path.GetFileName(nova)), true);
        }
        catch (Exception e) { Console.WriteLine("Não consegui trazer as artes: " + e.Message); return 1; }
        finally { try { Directory.Delete(temp, true); } catch { } }

        int n = Directory.GetFiles(pasta).Count(f => Extensoes.Contains(Path.GetExtension(f).ToLowerInvariant()));
        Console.WriteLine(string.Format("{0} {1} de \"{2}\" na pasta {3}", n, n == 1 ? "arte" : "artes", Convert.ToString(culto["nome"]), Path.GetFileName(pasta)));
        return 0;
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
