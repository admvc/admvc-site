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
//                  --data "Quarta-feira, 21 de outubro" --estilo direita|inclinada|diagonal|jovem|mulher|homem|familia
//                  --link "https://…" [--verso "…" --ref "…"] [--max 10] [--recursivo] [--apagar-originais] [--escala 2]
//                  [--entrada "…\Entrada"] [--arquivo "…\Cultos"] [--dia AAAA-MM-DD]
//
//   A rotina das fotos: a equipa larga as fotos cruas em Entrada\ (ao lado do exe) e o programa escolhe as --max
//   espalhadas pela hora da foto, copia-as para a pasta do culto e arquiva TODAS em Cultos\<data> <título>\.
//   A Entrada fica vazia; as fotos nunca se perdem. Sem fotos na Entrada, trabalha como antes (as fotos na pasta).
//
//   Envio para o portal (só na rotina da Entrada; o módulo passa --enviar):
//                  [--enviar --portal https://… --chave … [--evento-id 12]]
//   No fim do "Preparar", as originais desse culto sobem para o álbum do portal (JPEG 2560 px + miniatura 640 px),
//   o álbum publica-se e o QR do slide aponta para https://<portal>/fotos/<slug>. O estado fica em
//   Cultos\<data> <título>\._portal.txt (retoma se for cortado; sem rede tenta da próxima vez).
//
//   FotosCulto.exe --versao                    → V|6 (o módulo confirma que este exe é o novo antes de perguntar)
//   FotosCulto.exe --inventario --pasta "…"    → S|slides  T|fotos  F|nome  I|extensão|quantas  E|na Entrada  IE|extensão|quantas
//
// Para cada foto da pasta (jpg/jpeg/png/webp, por ordem, subpastas com --recursivo) abre
// modelo\modelo.html no Edge sem janela e guarda o slide 1920×1080 (slide-01.png, …) diretamente na pasta.
// Grava cada slide assim que está feito e retoma o que já existe: se o Holyrics cortar o programa a meio
// (o processo é morto ao fim de alguns segundos), basta correr outra vez e continua de onde ficou.
// Uma configuração diferente (título, data, versículo…) apaga os slides antigos e começa do zero.
// Os originais vão para _originais\ no fim (nunca são apagados, salvo --apagar-originais). Os que não entram
// (HEIC, RAW…) contam-se e dizem-se no resumo. Sai com 0 se fez pelo menos um slide.
// Compilar (sem instalar nada): C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /out:FotosCulto.exe src\FotosCulto.cs
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using System.Threading;

static class FotosCulto
{
    static readonly string[] Extensoes = { ".jpg", ".jpeg", ".png", ".webp" };
    static readonly string[] Estilos = { "direita", "inclinada", "diagonal", "jovem", "mulher", "homem", "familia" };

    static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        try
        {
            var a = LerArgumentos(args);
            if (a.ContainsKey("versao")) return Versao();
            if (a.ContainsKey("inventario")) return Inventario(a);
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

    // ---- envio das originais para o álbum do portal ------------------------------------------------------------------------

    /// <summary>O envio está ligado (o módulo passa --enviar) e há portal e chave.</summary>
    static bool EnviarAtivo(Dictionary<string, string> a)
    {
        return a.ContainsKey("enviar") && Valor(a, "portal") != "" && Valor(a, "chave") != "";
    }

    /// <summary>O que se sabe do álbum de um culto: guardado em Cultos\…\._portal.txt, para retomar sem repetir nada.</summary>
    class Estado
    {
        public string Ficheiro = "", Portal = "", Titulo = "", Dia = "", Evento = "", Album = "", Slug = "", Fim = "";
        public HashSet<string> Enviadas = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
    }

    static string LimparLinha(string s) { return (s ?? "").Replace("\r", " ").Replace("\n", " "); }

    static Estado LerEstado(string destino)
    {
        var st = new Estado { Ficheiro = Path.Combine(destino, "._portal.txt") };
        try
        {
            if (File.Exists(st.Ficheiro))
                foreach (var l in File.ReadAllLines(st.Ficheiro, Encoding.UTF8))
                {
                    int i = l.IndexOf('=');
                    if (i <= 0) continue;
                    string k = l.Substring(0, i), v = l.Substring(i + 1);
                    if (k == "portal") st.Portal = v;
                    else if (k == "titulo") st.Titulo = v;
                    else if (k == "dia") st.Dia = v;
                    else if (k == "evento") st.Evento = v;
                    else if (k == "album") st.Album = v;
                    else if (k == "slug") st.Slug = v;
                    else if (k == "fim") st.Fim = v;
                    else if (k == "enviada") st.Enviadas.Add(v);
                }
        }
        catch { }
        return st;
    }

    static void GuardarEstado(Estado st)
    {
        var sb = new StringBuilder();
        sb.AppendLine("portal=" + LimparLinha(st.Portal));
        sb.AppendLine("titulo=" + LimparLinha(st.Titulo));
        sb.AppendLine("dia=" + st.Dia);
        sb.AppendLine("evento=" + st.Evento);
        sb.AppendLine("album=" + st.Album);
        sb.AppendLine("slug=" + st.Slug);
        sb.AppendLine("fim=" + st.Fim);
        foreach (var n in st.Enviadas) sb.AppendLine("enviada=" + LimparLinha(n));
        try { File.WriteAllText(st.Ficheiro, sb.ToString(), new UTF8Encoding(false)); } catch { }
    }

    /// <summary>O estado do culto arquivado (cria-o se não existir). Se o portal for outro, o álbum e as enviadas não valem.</summary>
    static Estado PrepararEstado(Dictionary<string, string> a, string destino)
    {
        var st = LerEstado(destino);
        string portal = Valor(a, "portal").TrimEnd('/');
        if (st.Portal != portal)
        {
            st.Album = ""; st.Slug = ""; st.Fim = ""; st.Enviadas.Clear();
            st.Portal = portal;
        }
        if (st.Titulo == "") st.Titulo = Valor(a, "titulo", "Culto");
        string pasta = Path.GetFileName(destino.TrimEnd('\\', '/'));
        DateTime d;
        if (st.Dia == "" && pasta.Length >= 10 && DateTime.TryParseExact(pasta.Substring(0, 10), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out d))
            st.Dia = pasta.Substring(0, 10);
        if (st.Evento == "") st.Evento = Valor(a, "evento-id");
        GuardarEstado(st);
        return st;
    }

    /// <summary>Os cultos arquivados com o envio por acabar (nem publicado nem recusado pelos travões).</summary>
    static List<string> CultosPendentes(string arquivo, string exceto)
    {
        var r = new List<string>();
        try
        {
            if (!Directory.Exists(arquivo)) return r;
            foreach (var dir in Directory.GetDirectories(arquivo))
            {
                if (exceto != null && MesmoCaminho(dir, exceto)) continue;
                if (!File.Exists(Path.Combine(dir, "._portal.txt"))) continue;
                string fim = LerEstado(dir).Fim;
                if (fim != "") continue;   // publicado, bloqueado pelos travões ou sem fotos
                r.Add(dir);
            }
        }
        catch { }
        return r;
    }

    class Resp
    {
        public int Estado;               // código HTTP (0 = nem chegou ao portal)
        public string Rede;              // porque não chegou (sem rede, tempo esgotado…)
        public Dictionary<string, object> Json;
        public string Texto(string chave) { object o; return Json != null && Json.TryGetValue(chave, out o) && o != null && !(o is Dictionary<string, object>) && !(o is object[]) ? Convert.ToString(o) : ""; }
    }

    /// <summary>Um pedido ao portal (a chave vai no cabeçalho, nunca no endereço nem no ecrã).</summary>
    static Resp Pedir(Dictionary<string, string> a, string caminho, string tipo, byte[] corpo, int limiteMs = 120000)
    {
        var r = new Resp();
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
        string texto = "";
        try
        {
            var req = (HttpWebRequest)WebRequest.Create(Valor(a, "portal").TrimEnd('/') + caminho);
            req.Method = "POST";
            req.Timeout = limiteMs;
            req.ReadWriteTimeout = limiteMs;
            req.ContentType = tipo;
            req.ContentLength = corpo.Length;
            req.ServicePoint.Expect100Continue = false;
            req.Headers["x-fotos-chave"] = Valor(a, "chave");
            using (var s = req.GetRequestStream()) s.Write(corpo, 0, corpo.Length);
            using (var resp = (HttpWebResponse)req.GetResponse())
            {
                r.Estado = (int)resp.StatusCode;
                using (var rd = new StreamReader(resp.GetResponseStream(), Encoding.UTF8)) texto = rd.ReadToEnd();
            }
        }
        catch (WebException e)
        {
            var resp = e.Response as HttpWebResponse;
            if (resp == null) { r.Rede = e.Message; return r; }
            r.Estado = (int)resp.StatusCode;
            try { using (var rd = new StreamReader(resp.GetResponseStream(), Encoding.UTF8)) texto = rd.ReadToEnd(); } catch { }
        }
        catch (Exception e) { r.Rede = e.Message; return r; }
        try { r.Json = new JavaScriptSerializer().DeserializeObject(texto) as Dictionary<string, object>; } catch { }
        return r;
    }

    /// <summary>A frase para a pessoa quando o portal diz que não (ou não responde).</summary>
    static string MensagemDe(Resp r)
    {
        if (r.Rede != null) return "Sem ligação ao portal (" + r.Rede + ")";
        string erro = r.Texto("error");
        if (r.Estado == 401) return "A chave do portal não é válida (veja em Mídia, no portal)";
        if (r.Estado == 413)
        {
            string limite = r.Texto("limite");
            return "O portal recusou: " + (erro != "" ? erro : "limite de fotos atingido") + (limite != "" && erro.IndexOf(limite) < 0 ? " (limite: " + limite + ")" : "");
        }
        if (r.Estado == 429) return "O portal pede calma (pedidos a mais)";
        return "O portal respondeu " + r.Estado + (erro != "" ? ": " + erro : "");
    }

    /// <summary>Cria ou obtém o álbum do culto. Devolve null se correu bem, senão a frase do problema (e o link do slide fica o que a pessoa escreveu).</summary>
    static string ObterAlbum(Dictionary<string, string> a, Estado st)
    {
        if (st.Album != "" && st.Slug != "") return null;   // já sabemos (retoma sem rede)
        if (st.Dia == "") return "Não sei a data do culto para criar o álbum no portal.";
        var corpo = new Dictionary<string, object> { { "titulo", st.Titulo }, { "dia", st.Dia } };
        int ev;
        if (int.TryParse(st.Evento, out ev) && ev > 0) corpo["evento_id"] = ev;
        var r = Pedir(a, "/api/public/fotos/album", "application/json; charset=utf-8", Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(corpo)), 40000);
        if (r.Estado != 200 || r.Json == null || r.Texto("slug") == "" || r.Texto("id") == "")
        {
            if (r.Estado == 413) { st.Fim = "bloqueado"; GuardarEstado(st); }
            return MensagemDe(r) + ": o QR fica com o link que escreveu" + (r.Rede != null ? "; as fotos sobem da próxima vez." : ".");
        }
        st.Album = r.Texto("id");
        st.Slug = r.Texto("slug");
        GuardarEstado(st);
        return null;
    }

    class ResEnvio
    {
        public int Enviadas, Total, Falhadas, NaoImagens;
        public bool Publicado, Bloqueado;
        public string Erro = "", Link = "";

        public string Texto()
        {
            string t;
            if (Total == 0) t = Erro != "" ? Erro : "sem fotos para enviar";
            else if (Bloqueado) t = "envio parado — " + Erro + " (" + Enviadas + " de " + Total + " enviadas)";
            else if (Publicado) t = Total + (Total == 1 ? " enviada para " : " enviadas para ") + Link;
            else if (Erro != "") t = Enviadas + " de " + Total + " enviadas — " + Erro;
            else t = Enviadas + " de " + Total + " enviadas" + (Falhadas > 0 ? ", " + Falhadas + " falharam (tento outra vez da próxima vez)" : "");
            if (NaoImagens > 0) t += " · " + NaoImagens + (NaoImagens == 1 ? " ficheiro não é imagem suportada e não subiu" : " ficheiros não são imagens suportadas e não subiram");
            return t;
        }
    }

    /// <summary>Envia as originais de um culto arquivado (as que ainda não subiram) e publica o álbum. Pode ser cortado e retomado.</summary>
    static ResEnvio EnviarCulto(Dictionary<string, string> a, string destino)
    {
        var res = new ResEnvio();
        var st = PrepararEstado(a, destino);
        string portal = Valor(a, "portal").TrimEnd('/');
        res.Link = portal + "/fotos/" + st.Slug;

        var todas = new List<string>();
        var naoImagens = 0;
        try
        {
            foreach (var f in Directory.GetFiles(destino))
            {
                string nome = Path.GetFileName(f);
                if (nome.StartsWith(".") || string.Equals(nome, "desktop.ini", StringComparison.OrdinalIgnoreCase)) continue;
                if (Foto(f)) todas.Add(f); else naoImagens++;
            }
        }
        catch (Exception e) { res.Erro = "não consegui ler o arquivo: " + e.Message; return res; }
        res.NaoImagens = naoImagens;
        res.Total = todas.Count;
        if (todas.Count == 0) { st.Fim = "vazio"; GuardarEstado(st); return res; }

        string erroAlbum = ObterAlbum(a, st);
        if (erroAlbum != null) { res.Erro = erroAlbum; res.Bloqueado = st.Fim == "bloqueado"; return res; }
        res.Link = portal + "/fotos/" + st.Slug;

        var ordenadas = todas.OrderBy(HoraDaFoto).ThenBy(f => Path.GetFileName(f), new Natural()).ToList();
        res.Enviadas = ordenadas.Count(f => st.Enviadas.Contains(Path.GetFileName(f)));
        int ordem = 0;
        foreach (var f in ordenadas)
        {
            ordem++;
            string nome = Path.GetFileName(f);
            if (st.Enviadas.Contains(nome)) continue;

            Console.WriteLine("A enviar " + (res.Enviadas + 1) + " de " + res.Total + "… (" + nome + ")");
            byte[] web, mini; int largura, altura, w2, h2;
            try
            {
                web = JpegAte(f, 2560, 82, 4 * 1024 * 1024 - 65536, out largura, out altura);
                mini = JpegAte(f, 640, 78, 1024 * 1024, out w2, out h2);
            }
            catch (Exception e)
            {
                res.Falhadas++;
                Console.WriteLine("Não consegui preparar " + nome + " para enviar: " + e.Message);
                continue;
            }

            Resp r = null;
            for (int tentativa = 0; tentativa < 3; tentativa++)
            {
                string limite = "----fotosculto" + Guid.NewGuid().ToString("N");
                var corpo = Multipart(limite,
                    new[] { new[] { "album", st.Album }, new[] { "origem", nome }, new[] { "ordem", ordem.ToString() },
                            new[] { "hora", HoraDaFoto(f).ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture) },
                            new[] { "largura", largura.ToString() }, new[] { "altura", altura.ToString() } },
                    new Dictionary<string, byte[]> { { "web", web }, { "mini", mini } });
                r = Pedir(a, "/api/public/fotos/foto", "multipart/form-data; boundary=" + limite, corpo);
                if (r.Estado == 200 && r.Json != null) break;
                if (r.Estado == 429 || r.Estado >= 500 || (r.Rede != null && tentativa == 0)) { Thread.Sleep(r.Estado == 429 ? 15000 : 3000); continue; }
                break;
            }

            if (r.Estado == 200 && r.Json != null)
            {
                st.Enviadas.Add(nome);
                try { File.AppendAllText(st.Ficheiro, "enviada=" + LimparLinha(nome) + Environment.NewLine, new UTF8Encoding(false)); } catch { }
                res.Enviadas++;
                continue;
            }

            // o que pára tudo: travão de custo (413), chave, álbum que desapareceu, sem rede
            if (r.Estado == 413) { st.Fim = "bloqueado"; GuardarEstado(st); res.Bloqueado = true; res.Erro = MensagemDe(r); Console.WriteLine(res.Erro); return res; }
            if (r.Estado == 401) { res.Erro = MensagemDe(r); Console.WriteLine(res.Erro); return res; }
            if (r.Estado == 404) { st.Album = ""; st.Slug = ""; GuardarEstado(st); res.Erro = "o álbum já não existe no portal (volto a criá-lo da próxima vez)"; Console.WriteLine(res.Erro); return res; }
            if (r.Rede != null) { res.Erro = MensagemDe(r) + ": as que faltam sobem da próxima vez"; Console.WriteLine(res.Erro); return res; }
            res.Falhadas++;
            Console.WriteLine("Não consegui enviar " + nome + ": " + MensagemDe(r));
            if (res.Falhadas >= 3) { res.Erro = "demasiadas falhas seguidas (" + MensagemDe(r) + ")"; return res; }
        }

        if (res.Falhadas > 0) return res;

        var pub = Pedir(a, "/api/public/fotos/publicar", "application/json; charset=utf-8",
            Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(new Dictionary<string, object> { { "album", int.Parse(st.Album) } })), 40000);
        if (pub.Estado != 200)
        {
            res.Erro = "as fotos subiram mas não consegui publicar o álbum: " + MensagemDe(pub);
            Console.WriteLine(res.Erro);
            return res;
        }
        st.Fim = "publicado";
        GuardarEstado(st);
        res.Publicado = true;
        return res;
    }

    static byte[] Multipart(string limite, string[][] campos, Dictionary<string, byte[]> ficheiros)
    {
        using (var ms = new MemoryStream())
        {
            Action<string> txt = delegate (string t) { var b = Encoding.UTF8.GetBytes(t); ms.Write(b, 0, b.Length); };
            foreach (var c in campos)
                txt("--" + limite + "\r\nContent-Disposition: form-data; name=\"" + c[0] + "\"\r\n\r\n" + c[1] + "\r\n");
            foreach (var kv in ficheiros)
            {
                txt("--" + limite + "\r\nContent-Disposition: form-data; name=\"" + kv.Key + "\"; filename=\"" + kv.Key + ".jpg\"\r\nContent-Type: image/jpeg\r\n\r\n");
                ms.Write(kv.Value, 0, kv.Value.Length);
                txt("\r\n");
            }
            txt("--" + limite + "--\r\n");
            return ms.ToArray();
        }
    }

    /// <summary>JPEG com o lado maior em `lado` px (sem ampliar), a orientação EXIF aplicada e sem metadados (nada de GPS).
    /// Se passar de `maximo` bytes, baixa a qualidade por degraus.</summary>
    static byte[] JpegAte(string caminho, int lado, long qualidade, int maximo, out int largura, out int altura)
    {
        using (var origem = System.Drawing.Image.FromFile(caminho))
        {
            RotateFlipType rf = RotateFlipType.RotateNoneFlipNone;
            try
            {
                int o = BitConverter.ToUInt16(origem.GetPropertyItem(0x0112).Value, 0);
                switch (o)
                {
                    case 2: rf = RotateFlipType.RotateNoneFlipX; break;
                    case 3: rf = RotateFlipType.Rotate180FlipNone; break;
                    case 4: rf = RotateFlipType.Rotate180FlipX; break;
                    case 5: rf = RotateFlipType.Rotate90FlipX; break;
                    case 6: rf = RotateFlipType.Rotate90FlipNone; break;
                    case 7: rf = RotateFlipType.Rotate270FlipX; break;
                    case 8: rf = RotateFlipType.Rotate270FlipNone; break;
                }
            }
            catch { }

            double f = Math.Min(1.0, (double)lado / Math.Max(origem.Width, origem.Height));
            int nw = Math.Max(1, (int)Math.Round(origem.Width * f)), nh = Math.Max(1, (int)Math.Round(origem.Height * f));
            using (var bmp = new Bitmap(nw, nh, PixelFormat.Format24bppRgb))
            {
                bmp.SetResolution(96, 96);
                using (var g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.White);
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.DrawImage(origem, new Rectangle(0, 0, nw, nh), 0, 0, origem.Width, origem.Height, GraphicsUnit.Pixel);
                }
                if (rf != RotateFlipType.RotateNoneFlipNone) bmp.RotateFlip(rf);
                largura = bmp.Width;
                altura = bmp.Height;

                var codec = ImageCodecInfo.GetImageEncoders().First(c => c.MimeType == "image/jpeg");
                byte[] saida = null;
                for (long q = qualidade; q >= 50; q -= 10)
                {
                    using (var ps = new EncoderParameters(1))
                    using (var ms = new MemoryStream())
                    {
                        ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, q);
                        bmp.Save(ms, codec, ps);
                        saida = ms.ToArray();
                    }
                    if (saida.Length <= maximo) break;
                }
                return saida;
            }
        }
    }

    static int Versao()
    {
        Console.WriteLine("V|6");
        return 0;
    }

    /// <summary>Ordena "IMG_2" antes de "IMG_10": compara os números como números.</summary>
    class Natural : IComparer<string>
    {
        public int Compare(string x, string y)
        {
            int i = 0, j = 0;
            while (i < x.Length && j < y.Length)
            {
                if (char.IsDigit(x[i]) && char.IsDigit(y[j]))
                {
                    int si = i, sj = j;
                    while (i < x.Length && char.IsDigit(x[i])) i++;
                    while (j < y.Length && char.IsDigit(y[j])) j++;
                    string na = x.Substring(si, i - si).TrimStart('0');
                    string nb = y.Substring(sj, j - sj).TrimStart('0');
                    if (na.Length != nb.Length) return na.Length - nb.Length;
                    int c = string.CompareOrdinal(na, nb);
                    if (c != 0) return c;
                }
                else
                {
                    int c = char.ToUpperInvariant(x[i]).CompareTo(char.ToUpperInvariant(y[j]));
                    if (c != 0) return c;
                    i++;
                    j++;
                }
            }
            return (x.Length - i) - (y.Length - j);
        }
    }

    /// <summary>Todos os ficheiros da pasta (e subpastas, com --recursivo), pela ordem natural do nome.</summary>
    static List<string> Recolher(Dictionary<string, string> a, string pasta)
    {
        bool recursivo = a.ContainsKey("recursivo");
        var lista = new List<string>();
        foreach (var f in Directory.GetFiles(pasta, "*", recursivo ? SearchOption.AllDirectories : SearchOption.TopDirectoryOnly))
        {
            string nome = Path.GetFileName(f);
            if (nome.StartsWith(".") || string.Equals(nome, "desktop.ini", StringComparison.OrdinalIgnoreCase)) continue;
            string rel = f.Substring(pasta.Length);
            if (rel.IndexOf("\\_originais\\", StringComparison.OrdinalIgnoreCase) >= 0) continue;
            lista.Add(f);
        }
        lista.Sort(delegate (string x, string y) { return new Natural().Compare(Path.GetFileName(x), Path.GetFileName(y)); });
        return lista;
    }

    /// <summary>O que não entra: por extensão (os HEIC do iPhone são o caso mais comum).</summary>
    static Dictionary<string, int> Ignorados(List<string> ficheiros)
    {
        var d = new Dictionary<string, int>();
        foreach (var f in ficheiros)
        {
            string nome = Path.GetFileName(f);
            if (nome.StartsWith("slide-", StringComparison.OrdinalIgnoreCase)) continue;
            if (Extensoes.Contains(Path.GetExtension(nome).ToLowerInvariant())) continue;
            string ext = Path.GetExtension(nome).ToLowerInvariant();
            if (ext == "") ext = "(sem extensão)";
            d[ext] = (d.ContainsKey(ext) ? d[ext] : 0) + 1;
        }
        return d;
    }

    /// <summary>Só conta o que há na pasta e na Entrada, para a janela do módulo: S|slides  T|fotos  F|nome  I|extensão|quantas  E|na Entrada.</summary>
    static int Inventario(Dictionary<string, string> a)
    {
        string pasta = Valor(a, "pasta");
        if (pasta == "" || !Directory.Exists(pasta)) { Console.WriteLine("Pasta não encontrada: " + pasta); return 1; }
        var ficheiros = Recolher(a, pasta);
        int slides = 0;
        var fotos = new List<string>();
        foreach (var f in ficheiros)
        {
            string nome = Path.GetFileName(f);
            if (nome.StartsWith("slide-", StringComparison.OrdinalIgnoreCase)) { slides++; continue; }
            if (Extensoes.Contains(Path.GetExtension(nome).ToLowerInvariant())) fotos.Add(f);
        }
        Console.WriteLine("S|" + slides);
        Console.WriteLine("T|" + fotos.Count);
        foreach (var f in fotos) Console.WriteLine("F|" + Linha(Path.GetFileName(f)));
        foreach (var kv in Ignorados(ficheiros)) Console.WriteLine("I|" + Linha(kv.Key) + "|" + kv.Value);

        string entrada = Valor(a, "entrada");
        if (entrada == "") entrada = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Entrada");
        int naEntrada = 0;
        if (Directory.Exists(entrada))
        {
            var ficheirosEntrada = Recolher(a, entrada);
            naEntrada = ficheirosEntrada.Count(Foto);
            foreach (var kv in Ignorados(ficheirosEntrada)) Console.WriteLine("IE|" + Linha(kv.Key) + "|" + kv.Value);
        }
        Console.WriteLine("E|" + naEntrada);
        return 0;
    }

    static int Correr(Dictionary<string, string> a)
    {
        string pasta = Valor(a, "pasta");
        if (pasta == "" || !Directory.Exists(pasta)) { Console.WriteLine("Pasta não encontrada: " + pasta); return 1; }
        string aqui = AppDomain.CurrentDomain.BaseDirectory;
        string modelo = Path.Combine(aqui, "modelo", "modelo.html");
        if (!File.Exists(modelo)) { Console.WriteLine("Falta o modelo: " + modelo); return 1; }

        int max;
        if (!int.TryParse(Valor(a, "max", "10"), out max) || max < 1) max = 10;
        if (max > 50) max = 50;
        string estilo = Valor(a, "estilo", "direita").ToLowerInvariant();
        if (Array.IndexOf(Estilos, estilo) < 0) estilo = "direita";
        bool apagar = a.ContainsKey("apagar-originais");
        int escala = Valor(a, "escala", "1") == "2" ? 2 : 1;
        string navegador = AcharNavegador();
        if (navegador == null) { Console.WriteLine("Não encontrei o Microsoft Edge nem o Google Chrome neste computador."); return 1; }

        string entrada = Valor(a, "entrada");
        if (entrada == "") { entrada = Path.Combine(aqui, "Entrada"); try { Directory.CreateDirectory(entrada); } catch { } }
        string arquivo = Valor(a, "arquivo");
        if (arquivo == "") arquivo = Path.Combine(aqui, "Cultos");
        string fila = Path.Combine(pasta, "._fotosculto-fila.txt");
        string assinatura = Assinatura(a, estilo, max, escala);

        // 1) Um culto já começado (o Holyrics mata o programa ao fim de alguns segundos): continua-se pela fila.
        if (File.Exists(fila))
        {
            var plano = LerFila(fila, assinatura);
            if (plano != null) return FilaAdiante(a, pasta, modelo, navegador, estilo, escala, assinatura, fila, plano, new Dictionary<string, int>());
            TentarApagar(fila);   // de outro culto, ou estragada: faz-se de novo
        }

        // 2) A rotina das fotos: as cruas em Entrada\ (ao lado do exe).
        var daEntrada = Directory.Exists(entrada) ? Recolher(a, entrada) : new List<string>();
        var fotosDaEntrada = daEntrada.Where(Foto).ToList();
        if (fotosDaEntrada.Count > 0)
            return PrepararEntrada(a, pasta, arquivo, modelo, navegador, estilo, max, escala, assinatura, fila, fotosDaEntrada, Ignorados(daEntrada));

        // 2b) Sem fotos novas, mas um culto arquivado com o envio por acabar (cortado, sem rede…): continua-se.
        if (EnviarAtivo(a) && !Recolher(a, pasta).Any(Foto))
        {
            var pendentes = CultosPendentes(arquivo, null);
            if (pendentes.Count > 0)
            {
                var textos = new List<string>();
                foreach (var dir in pendentes) textos.Add(Path.GetFileName(dir) + ": " + EnviarCulto(a, dir).Texto());
                Console.WriteLine(string.Join(" · ", textos));
                return 0;
            }
        }

        // 3) Sem Entrada, mas com o envio para o portal ligado e fotos na própria pasta (a equipa pôs as fotos em
        //    FOTOS-CULTO em vez de na Entrada): seguem a mesma rotina da Entrada — arquivo por culto, slides e envio.
        //    Assim as fotos chegam sempre ao álbum, seja qual for a pasta onde foram postas.
        if (EnviarAtivo(a))
        {
            var naPasta = Recolher(a, pasta);
            var fotosNaPasta = naPasta.Where(Foto).ToList();
            if (fotosNaPasta.Count > 0)
            {
                Console.WriteLine("As fotos estavam em " + Path.GetFileName(pasta) + " (não na Entrada): seguem a rotina da Entrada e vão para o álbum.");
                return PrepararEntrada(a, pasta, arquivo, modelo, navegador, estilo, max, escala, assinatura, fila, fotosNaPasta, Ignorados(naPasta));
            }
        }

        // 4) Sem envio: como sempre foi — as fotos que estão na própria pasta (originais em _originais).
        return CorrerDaPasta(a, pasta, modelo, navegador, estilo, max, escala, apagar, arquivo);
    }

    /// <summary>Uma imagem que entra: jpg/jpeg/png/webp e não é um slide já feito.</summary>
    static bool Foto(string f)
    {
        string nome = Path.GetFileName(f);
        return !nome.StartsWith("slide-", StringComparison.OrdinalIgnoreCase)
            && Extensoes.Contains(Path.GetExtension(nome).ToLowerInvariant());
    }

    // ---- rotina das fotos: Entrada → arquivo por culto → 10 escolhidas na pasta do Holyrics ---------------------------

    /// <summary>As fotos que estão na Entrada: escolhe as espalhadas pela hora, escreve a fila e segue.</summary>
    static int PrepararEntrada(Dictionary<string, string> a, string pasta, string arquivo, string modelo, string navegador,
        string estilo, int max, int escala, string assinatura, string fila, List<string> fotos, Dictionary<string, int> ignorados)
    {
        var porHora = fotos.OrderBy(HoraDaFoto).ThenBy(f => Path.GetFileName(f), new Natural()).ToList();
        var escolhidas = EscolherEspalhadas(SemRajadas(porHora, max), max);

        DateTime dia;
        if (!DateTime.TryParseExact(Valor(a, "dia"), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out dia))
            dia = HoraDaFoto(escolhidas[0]);
        string destino = Path.Combine(arquivo, dia.ToString("yyyy-MM-dd") + " " + NomeSeguro(Valor(a, "titulo", "Culto")));

        var sb = new StringBuilder();
        sb.AppendLine("v1");
        sb.AppendLine(assinatura);
        sb.AppendLine(destino);
        foreach (var f in fotos) sb.AppendLine((escolhidas.Contains(f) ? "1" : "0") + "\t" + f);
        try { File.WriteAllText(fila, sb.ToString(), new UTF8Encoding(false)); }
        catch (Exception e) { Console.WriteLine("Não consegui guardar a lista das fotos: " + e.Message); return 1; }

        var plano = LerFila(fila, assinatura);
        if (plano == null) { Console.WriteLine("Não consegui ler a lista das fotos que acabei de guardar."); return 1; }
        return FilaAdiante(a, pasta, modelo, navegador, estilo, escala, assinatura, fila, plano, ignorados);
    }

    /// <summary>O culto a meio: arquiva os originais, põe as escolhidas na pasta, faz os slides e limpa.</summary>
    static int FilaAdiante(Dictionary<string, string> a, string pasta, string modelo, string navegador, string estilo,
        int escala, string assinatura, string fila, DaFila plano, Dictionary<string, int> ignorados)
    {
        try { Directory.CreateDirectory(plano.Destino); }
        catch (Exception e) { Console.WriteLine("Não consegui criar o arquivo " + plano.Destino + ": " + e.Message); return 1; }

        // 1) Arquivar (copiar e só depois tirar da Entrada: uma foto nunca se perde).
        int presas = 0;
        foreach (var origem in plano.Todas)
        {
            if (!File.Exists(origem)) continue;   // já arquivada numa tentativa anterior
            string copia = Path.Combine(plano.Destino, Path.GetFileName(origem));
            try
            {
                File.Copy(origem, copia, true);
                if (new FileInfo(origem).Length != new FileInfo(copia).Length) throw new IOException("cópia incompleta");
                File.Delete(origem);
            }
            catch (Exception e)
            {
                presas++;
                Console.WriteLine("Não consegui arquivar " + Path.GetFileName(origem) + ": " + e.Message);
            }
        }

        // O que não entra (HEIC, RAW…): também vai para o arquivo, para a Entrada ficar vazia.
        if (presas == 0 && plano.Todas.Count > 0)
        {
            string de = Path.GetDirectoryName(plano.Todas[0]);
            foreach (var f in Directory.GetFiles(de))
            {
                string nome = Path.GetFileName(f);
                if (nome.StartsWith(".") || string.Equals(nome, "desktop.ini", StringComparison.OrdinalIgnoreCase)) continue;
                if (plano.Todas.Any(x => MesmoCaminho(x, f))) continue;
                try
                {
                    File.Copy(f, Path.Combine(plano.Destino, nome), true);
                    File.Delete(f);
                }
                catch { }
            }
        }

        // 2) As escolhidas vão do arquivo para a pasta do culto (com o nome original: o slide sabe de que foto é).
        var naPasta = new List<string>();
        foreach (var origem in plano.Escolhidas)
        {
            string doArquivo = Path.Combine(plano.Destino, Path.GetFileName(origem));
            string alvo = Path.Combine(pasta, Path.GetFileName(origem));
            try
            {
                if (!File.Exists(doArquivo)) continue;
                if (!File.Exists(alvo) || new FileInfo(alvo).Length != new FileInfo(doArquivo).Length) File.Copy(doArquivo, alvo, true);
                naPasta.Add(alvo);
            }
            catch (Exception e) { Console.WriteLine("Não consegui copiar " + Path.GetFileName(origem) + ": " + e.Message); }
        }
        if (naPasta.Count == 0) { Console.WriteLine("Não há fotos para preparar (o arquivo " + plano.Destino + " está vazio)."); return 1; }

        // 3) Fotos de outro culto que tenham ficado na pasta: para _originais (nunca se apagam).
        foreach (var f in Directory.GetFiles(pasta).Where(Foto))
        {
            if (naPasta.Any(x => MesmoCaminho(x, f))) continue;
            GuardarOriginal(pasta, f);
        }

        // 3b) O álbum do portal (antes dos slides: o QR aponta para ele). Falhou ou está desligado: o link que a pessoa escreveu.
        if (EnviarAtivo(a))
        {
            string portal = Valor(a, "portal").TrimEnd('/');
            var st = PrepararEstado(a, plano.Destino);
            string erroAlbum = ObterAlbum(a, st);
            if (erroAlbum == null)
            {
                a["link"] = portal + "/fotos/" + st.Slug;
                Console.WriteLine("QR dos slides: " + a["link"]);
            }
            else
            {
                Console.WriteLine(erroAlbum);
                if (Valor(a, "link") == "") a["link"] = portal + "/fotos";
            }
        }

        // 4) Os slides.
        var feito = FazerSlides(a, pasta, modelo, navegador, estilo, escala, assinatura, naPasta);

        // 5) Fim: as cópias saem (ficam no arquivo) e a fila desaparece. Se alguma falhou, fica tudo para a próxima tentativa.
        if (feito.Falhadas == 0)
        {
            foreach (var f in naPasta) TentarApagar(f);
            TentarApagar(fila);
        }

        // 6) O envio das originais para o portal (os slides já estão feitos; se for cortado, a próxima vez continua).
        string textoEnvio = null;
        if (EnviarAtivo(a))
        {
            textoEnvio = EnviarCulto(a, plano.Destino).Texto();
            string pastaArquivo = Valor(a, "arquivo") != "" ? Valor(a, "arquivo") : Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Cultos");
            foreach (var outro in CultosPendentes(pastaArquivo, plano.Destino))
                textoEnvio += " · " + Path.GetFileName(outro) + ": " + EnviarCulto(a, outro).Texto();
        }

        var partes = new List<string>();
        partes.Add(plano.Todas.Count + (plano.Todas.Count == 1 ? " recebida" : " recebidas"));
        partes.Add(feito.Feitas + (feito.Feitas == 1 ? " foto pronta" : " fotos prontas"));
        if (feito.JaFeitas > 0 && feito.JaFeitas < feito.Feitas) partes.Add(feito.JaFeitas + " já estavam feitas");
        if (feito.Falhadas > 0) partes.Add(feito.Falhadas + (feito.Falhadas == 1 ? " falhou" : " falharam"));
        if (presas > 0) partes.Add(presas + (presas == 1 ? " por arquivar (fica na Entrada)" : " por arquivar (ficam na Entrada)"));
        partes.Add("arquivadas em Cultos\\" + Path.GetFileName(plano.Destino));
        if (textoEnvio != null) partes.Add(textoEnvio);
        int ign = ignorados.Values.Sum();
        if (ign > 0) partes.Add(ign + (ign == 1 ? " ignorada (" : " ignoradas (") + string.Join(", ", ignorados.Select(kv => kv.Key + " " + kv.Value)) + ")");

        Console.WriteLine(string.Join(" · ", partes));
        return feito.Feitas > 0 ? 0 : 1;
    }

    /// <summary>A fila de um culto a meio: o arquivo do culto e as fotos (todas, e quais vão para os slides).</summary>
    class DaFila
    {
        public string Destino;
        public List<string> Todas = new List<string>();
        public List<string> Escolhidas = new List<string>();
    }

    static DaFila LerFila(string fila, string assinatura)
    {
        try
        {
            if (!File.Exists(fila)) return null;
            var linhas = File.ReadAllLines(fila);
            if (linhas.Length < 4 || linhas[0] != "v1" || linhas[1] != assinatura) return null;
            var p = new DaFila { Destino = linhas[2] };
            for (int i = 3; i < linhas.Length; i++)
            {
                string l = linhas[i];
                if (l.Length < 3) continue;
                string caminho = l.Substring(2);
                p.Todas.Add(caminho);
                if (l[0] == '1') p.Escolhidas.Add(caminho);
            }
            return p.Escolhidas.Count > 0 ? p : null;
        }
        catch { return null; }
    }

    /// <summary>Sem Entrada: as fotos na pasta, como sempre foi (com os originais para _originais).</summary>
    static int CorrerDaPasta(Dictionary<string, string> a, string pasta, string modelo, string navegador, string estilo,
        int max, int escala, bool apagar, string arquivo)
    {
        var ficheiros = Recolher(a, pasta);
        var ignorados = Ignorados(ficheiros);
        var fotos = ficheiros.Where(Foto).ToList();
        if (fotos.Count == 0) { Console.WriteLine(SemFotos(ignorados, arquivo)); return 1; }

        var usar = fotos.Take(max).ToList();
        var feito = FazerSlides(a, pasta, modelo, navegador, estilo, escala, Assinatura(a, estilo, max, escala), usar);

        foreach (var foto in feito.Usadas)
        {
            if (apagar) TentarApagar(foto);
            else GuardarOriginal(pasta, foto);
        }

        Console.WriteLine(Resumo(feito.Feitas, feito.Falhadas, feito.JaFeitas, fotos.Count - usar.Count, max, ignorados, apagar));
        return feito.Feitas > 0 ? 0 : 1;
    }

    /// <summary>O que se diz quando não há fotos: os HEIC, ou onde está o último culto arquivado.</summary>
    static string SemFotos(Dictionary<string, int> ignorados, string arquivo)
    {
        int ign = ignorados.Values.Sum();
        if (ign > 0)
            return "Não há fotos que entrem: " + ign + (ign == 1 ? " ficheiro não é imagem suportada (" : " ficheiros não são imagens suportadas (")
                + string.Join(", ", ignorados.Select(kv => kv.Key + " " + kv.Value)) + "). Se forem HEIC do iPhone, exporte como JPG.";
        string ultimo = UltimoArquivo(arquivo);
        string entrada = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Entrada");
        return ultimo == null
            ? "Não há fotos novas (só slides já feitos). Ponha as fotos do culto em " + entrada + " e volte a tentar."
            : "Não há fotos novas (só slides já feitos). As do último culto estão em " + ultimo + ".";
    }

    /// <summary>A pasta do culto mais recente do arquivo (o nome começa pela data).</summary>
    static string UltimoArquivo(string arquivo)
    {
        try
        {
            if (!Directory.Exists(arquivo)) return null;
            var pastas = Directory.GetDirectories(arquivo);
            if (pastas.Length == 0) return null;
            Array.Sort(pastas, StringComparer.OrdinalIgnoreCase);
            return pastas[pastas.Length - 1];
        }
        catch { return null; }
    }

    class Feito
    {
        public int Feitas, Falhadas, JaFeitas;
        public List<string> Usadas = new List<string>();
    }

    /// <summary>Faz um slide por foto (slide-01.png…) e retoma os que já estão feitos. Uma configuração nova apaga os antigos.</summary>
    static Feito FazerSlides(Dictionary<string, string> a, string pasta, string modelo, string navegador, string estilo,
        int escala, string assinatura, List<string> usar)
    {
        var r = new Feito();

        // Os slides de uma configuração anterior (outro título, outra data…) não servem: apagam-se e começa-se do zero.
        string marca = Path.Combine(pasta, "._fotosculto.txt");
        string anterior = null;
        try { if (File.Exists(marca)) anterior = File.ReadAllText(marca).Trim(); } catch { }
        if (anterior != null && anterior != assinatura)
        {
            int apagados = 0;
            foreach (var s in Directory.GetFiles(pasta).Where(f => Path.GetFileName(f).StartsWith("slide-", StringComparison.OrdinalIgnoreCase)))
            {
                TentarApagar(s);
                apagados++;
            }
            if (apagados > 0) Console.WriteLine("Configuração nova: " + apagados + (apagados == 1 ? " slide antigo apagado." : " slides antigos apagados."));
        }
        try { File.WriteAllText(marca, assinatura, new UTF8Encoding(false)); } catch { }

        Console.WriteLine("A preparar " + usar.Count + (usar.Count == 1 ? " foto…" : " fotos…"));
        string temp = Path.Combine(Path.GetTempPath(), "FotosCulto-" + Guid.NewGuid().ToString("N").Substring(0, 8));
        Directory.CreateDirectory(temp);
        try
        {
            for (int i = 0; i < usar.Count; i++)
            {
                string foto = usar[i];
                string saida = Path.Combine(pasta, string.Format("slide-{0:00}.png", i + 1));

                // já feito numa tentativa anterior (o Holyrics corta o programa a meio): não se repete
                if (SlideFeito(saida, foto))
                {
                    r.JaFeitas++; r.Feitas++;
                    r.Usadas.Add(foto);
                    Console.WriteLine(string.Format("{0}/{1} {2} → {3} (já estava feito)", i + 1, usar.Count, Path.GetFileName(foto), Path.GetFileName(saida)));
                    continue;
                }

                string png = Path.Combine(temp, "s" + (i + 1) + ".png");
                var p = new List<string>
                {
                    "estilo=" + estilo,
                    "foto=" + Uri.EscapeDataString(new Uri(foto).AbsoluteUri),
                    "titulo=" + Uri.EscapeDataString(Valor(a, "titulo", "Culto")),
                    "data=" + Uri.EscapeDataString(Valor(a, "data")),
                    "link=" + Uri.EscapeDataString(Valor(a, "link")),
                    "n=" + (i + 1),
                };
                if (Valor(a, "verso") != "") { p.Add("verso=" + Uri.EscapeDataString(Valor(a, "verso"))); p.Add("ref=" + Uri.EscapeDataString(Valor(a, "ref"))); }
                string endereco = new Uri(modelo).AbsoluteUri + "?" + string.Join("&", p);

                if (!Fotografar(navegador, endereco, png, Path.Combine(temp, "perfil"), escala))
                {
                    r.Falhadas++;
                    Console.WriteLine("Não consegui fazer o slide de " + Path.GetFileName(foto) + " (a foto fica na pasta).");
                    continue;
                }
                try { File.Copy(png, saida, true); }
                catch (Exception e) { r.Falhadas++; Console.WriteLine("Não consegui gravar " + Path.GetFileName(saida) + ": " + e.Message); continue; }
                r.Feitas++;
                r.Usadas.Add(foto);
                Console.WriteLine(string.Format("{0}/{1} {2} → {3}", i + 1, usar.Count, Path.GetFileName(foto), Path.GetFileName(saida)));
            }

            // sobras de um culto anterior com mais fotos do que este
            foreach (var resto in Directory.GetFiles(pasta))
            {
                string nome = Path.GetFileName(resto);
                if (!nome.StartsWith("slide-", StringComparison.OrdinalIgnoreCase) || nome.Length < 7) continue;
                int numero;
                if (int.TryParse(Path.GetFileNameWithoutExtension(nome).Substring(6), out numero) && numero > usar.Count) TentarApagar(resto);
            }
        }
        finally
        {
            try { Directory.Delete(temp, true); } catch { }
        }
        return r;
    }


    /// <summary>O que distingue uma configuração de outra: se mudar, os slides que já estão na pasta não servem.</summary>
    static string Assinatura(Dictionary<string, string> a, string estilo, int max, int escala)
    {
        return string.Join("|", new[]
        {
            Valor(a, "titulo", "Culto"), Valor(a, "data"), EnviarAtivo(a) ? "@portal" : Valor(a, "link"), estilo,
            Valor(a, "verso"), Valor(a, "ref"), max.ToString(), escala.ToString(),
            a.ContainsKey("recursivo") ? "r" : "-"
        });
    }

    /// <summary>O slide já existe e é mais recente do que a foto (foi feito desta foto, nesta configuração).</summary>
    static bool SlideFeito(string saida, string foto)
    {
        try
        {
            var s = new FileInfo(saida);
            if (!s.Exists || s.Length == 0) return false;
            return s.LastWriteTimeUtc >= File.GetLastWriteTimeUtc(foto);
        }
        catch { return false; }
    }

    /// <summary>Uma linha só, a última: é o que o módulo mostra na notificação.</summary>
    static string Resumo(int feitas, int falhadas, int jaFeitas, int deFora, int max, Dictionary<string, int> ignorados, bool apagar)
    {
        var partes = new List<string>();
        partes.Add(feitas + (feitas == 1 ? " foto pronta" : " fotos prontas"));
        if (jaFeitas > 0 && jaFeitas < feitas) partes.Add(jaFeitas + " já estavam feitas");
        if (falhadas > 0) partes.Add(falhadas + (falhadas == 1 ? " falhou" : " falharam"));
        if (deFora > 0) partes.Add(deFora + " de fora (máximo " + max + ")");
        int ign = ignorados.Values.Sum();
        if (ign > 0)
        {
            var nomes = ignorados.Select(kv => kv.Key + " " + kv.Value).ToList();
            partes.Add(ign + (ign == 1 ? " ignorada (" : " ignoradas (") + string.Join(", ", nomes) + ")");
        }
        if (feitas > 0) partes.Add(apagar ? "originais apagados" : "originais em _originais");
        return string.Join(" · ", partes);
    }

    /// <summary>Move o original para _originais (nunca apaga). Se já lá estiver um com o mesmo nome, acrescenta a hora.</summary>
    static void GuardarOriginal(string pasta, string foto)
    {
        string destinoDir = Path.Combine(pasta, "_originais");
        try { Directory.CreateDirectory(destinoDir); }
        catch (Exception e) { Console.WriteLine("Não consegui criar _originais: " + e.Message); return; }
        string nome = Path.GetFileName(foto);
        string destino = Path.Combine(destinoDir, nome);
        if (File.Exists(destino))
            destino = Path.Combine(destinoDir, Path.GetFileNameWithoutExtension(nome) + "-" + DateTime.Now.ToString("HHmmss") + Path.GetExtension(nome));
        try { File.Move(foto, destino); return; }
        catch { }
        try { File.Copy(foto, destino, true); File.Delete(foto); }
        catch { Console.WriteLine("Não consegui guardar o original " + nome + " (fica na pasta)."); }
    }


    /// <summary>A hora em que a foto foi tirada: EXIF (DateTimeOriginal, senão DateTime); sem EXIF, a hora do ficheiro.</summary>
    static DateTime HoraDaFoto(string f)
    {
        try
        {
            using (var img = System.Drawing.Image.FromFile(f))
            {
                foreach (int etiqueta in new[] { 0x9003, 0x0132 })
                {
                    try
                    {
                        var p = img.GetPropertyItem(etiqueta);
                        string texto = Encoding.ASCII.GetString(p.Value).Trim('\0', ' ', '\r', '\n');
                        DateTime d;
                        if (DateTime.TryParseExact(texto, new[] { "yyyy:MM:dd HH:mm:ss", "yyyy-MM-dd HH:mm:ss" },
                                CultureInfo.InvariantCulture, DateTimeStyles.None, out d)) return d;
                    }
                    catch { }
                }
            }
        }
        catch { }
        try { return File.GetLastWriteTime(f); }
        catch { return DateTime.Now; }
    }

    /// <summary>Fotos tiradas no mesmo segundo (rajada): fica só a maior (a menos comprimida).
    /// Só se houver horas suficientes para escolher: ficheiros copiados todos à mesma hora não são rajadas.</summary>
    static List<string> SemRajadas(List<string> porHora, int max)
    {
        var melhor = new Dictionary<long, string>();
        var ordem = new List<long>();
        foreach (var f in porHora)
        {
            long segundo = HoraDaFoto(f).Ticks / TimeSpan.TicksPerSecond;
            string ja;
            if (!melhor.TryGetValue(segundo, out ja)) { melhor[segundo] = f; ordem.Add(segundo); continue; }
            if (Tamanho(f) > Tamanho(ja)) melhor[segundo] = f;
        }
        if (ordem.Count < max) return new List<string>(porHora);
        return ordem.Select(s => melhor[s]).ToList();
    }

    /// <summary>Até `max` fotos espalhadas pela lista (com 20 e 10, uma sim uma não).</summary>
    static List<string> EscolherEspalhadas(List<string> fotos, int max)
    {
        if (fotos.Count <= max) return new List<string>(fotos);
        var escolhidas = new List<string>();
        for (int i = 0; i < max; i++)
        {
            int k = (int)((long)i * fotos.Count / max);
            if (!escolhidas.Contains(fotos[k])) escolhidas.Add(fotos[k]);
        }
        return escolhidas;
    }

    static long Tamanho(string f)
    {
        try { return new FileInfo(f).Length; }
        catch { return 0; }
    }

    /// <summary>Um nome que o Windows aceita para uma pasta (o título do culto).</summary>
    static string NomeSeguro(string s)
    {
        var sb = new StringBuilder();
        foreach (char c in Convert.ToString(s ?? ""))
            sb.Append(Array.IndexOf(Path.GetInvalidFileNameChars(), c) >= 0 ? '-' : c);
        string nome = sb.ToString().Trim().TrimEnd('.');
        if (nome.Length > 80) nome = nome.Substring(0, 80).Trim();
        return nome == "" ? "Culto" : nome;
    }

    static bool MesmoCaminho(string x, string y)
    {
        try { return string.Equals(Path.GetFullPath(x), Path.GetFullPath(y), StringComparison.OrdinalIgnoreCase); }
        catch { return string.Equals(x, y, StringComparison.OrdinalIgnoreCase); }
    }


    /// <summary>Abre o endereço no Edge/Chrome sem janela e guarda a imagem 1920×1080 (escala 2 = 3840×2160).</summary>
    static bool Fotografar(string navegador, string endereco, string png, string perfil, int escala)
    {
        var args = string.Join(" ", new[]
        {
            "--headless=new", "--disable-gpu", "--hide-scrollbars", "--mute-audio", "--no-first-run", "--no-default-browser-check",
            "--allow-file-access-from-files", "--virtual-time-budget=8000", "--window-size=1920,1080",
            "--force-device-scale-factor=" + (escala == 2 ? "2" : "1"),
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
