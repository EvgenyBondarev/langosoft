using LangoSoft.API.Models;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace LangoSoft.API.Services;

public class TextService
{
    private readonly string _dataPath;
    private readonly IHttpClientFactory _factory;
    private readonly ILogger<TextService> _logger;

    private record BookData(List<CanticleContent> Original, List<CanticleContent> English);

    private readonly ConcurrentDictionary<string, BookData>     _books = new();
    private readonly ConcurrentDictionary<string, SemaphoreSlim> _locks = new();

    // ── Dante URLs (special: multi-file) ──────────────────────────────────────
    private const string ItalianUrl  = "https://www.gutenberg.org/cache/epub/1000/pg1000.txt";
    private const string EnglishUrl1 = "https://www.gutenberg.org/cache/epub/1001/pg1001.txt";
    private const string EnglishUrl2 = "https://www.gutenberg.org/cache/epub/1002/pg1002.txt";
    private const string EnglishUrl3 = "https://www.gutenberg.org/cache/epub/1003/pg1003.txt";

    public TextService(IHttpClientFactory factory, ILogger<TextService> logger, IWebHostEnvironment env)
    {
        _factory  = factory;
        _logger   = logger;
        _dataPath = Path.Combine(env.ContentRootPath, "Data");
        Directory.CreateDirectory(_dataPath);
    }

    // ── Public API ────────────────────────────────────────────────────────────

    public bool IsBookLoaded(string bookId) => _books.ContainsKey(bookId);

    public int GetCanticleCount(string bookId) =>
        _books.TryGetValue(bookId, out var b) ? b.Original.Count : 0;

    public int GetCantoCount(string bookId, int canticle)
    {
        if (!_books.TryGetValue(bookId, out var b)) return 0;
        return canticle >= 0 && canticle < b.Original.Count ? b.Original[canticle].Cantos.Count : 0;
    }

    public string GetCanticleName(string bookId, int canticle)
    {
        if (!_books.TryGetValue(bookId, out var b)) return "";
        return canticle >= 0 && canticle < b.Original.Count ? b.Original[canticle].Name : "";
    }

    public CantoLinesResponse GetCanto(string bookId, int canticle, int canto)
    {
        if (!_books.TryGetValue(bookId, out var bd)) return Empty("?", "?");
        var orig = bd.Original;
        var eng  = bd.English;
        if (canticle < 0 || canticle >= orig.Count) return Empty("?", "?");
        var origC = orig[canticle];
        var engC  = canticle < eng.Count ? eng[canticle] : null;
        if (canto < 0 || canto >= origC.Cantos.Count) return Empty(origC.Name, "?");
        var origK = origC.Cantos[canto];
        var engK  = (engC != null && canto < engC.Cantos.Count)
            ? engC.Cantos[canto]
            : new CantoContent("?", new List<string>());
        return new CantoLinesResponse(origC.Name, origK.Name, origK.Lines, engK.Lines);
    }

    // ── Initialization (Dante eager at startup) ───────────────────────────────

    public Task InitializeAsync() => EnsureBookLoadedAsync("dante");

    // ── Lazy loading ──────────────────────────────────────────────────────────

    public async Task EnsureBookLoadedAsync(string bookId)
    {
        if (_books.ContainsKey(bookId)) return;
        var sem = _locks.GetOrAdd(bookId, _ => new SemaphoreSlim(1, 1));
        await sem.WaitAsync();
        try
        {
            if (_books.ContainsKey(bookId)) return;
            var data = bookId == "dante" ? await LoadDanteAsync() : await LoadProseBookAsync(bookId);
            _books[bookId] = data;
            _logger.LogInformation("Book loaded: {Id} — {N} canticle(s)", bookId, data.Original.Count);
        }
        finally { sem.Release(); }
    }

    // ── Dante loader ──────────────────────────────────────────────────────────

    private async Task<BookData> LoadDanteAsync()
    {
        var it  = await FetchOrLoad("italian.txt",  ItalianUrl);
        var en1 = await FetchOrLoad("english1.txt", EnglishUrl1);
        var en2 = await FetchOrLoad("english2.txt", EnglishUrl2);
        var en3 = await FetchOrLoad("english3.txt", EnglishUrl3);

        var original = ParseDante(it);
        var english  = new List<CanticleContent>
        {
            ParseDanteSingleCanticle(en1, "Inferno"),
            ParseDanteSingleCanticle(en2, "Purgatorio"),
            ParseDanteSingleCanticle(en3, "Paradiso"),
        };
        AlignBooks(original, english);
        return new BookData(original, english);
    }

    // ── Generic prose loader ──────────────────────────────────────────────────

    private async Task<BookData> LoadProseBookAsync(string bookId)
    {
        var info = BookRegistry.Books.FirstOrDefault(b => b.Id == bookId);
        if (info == null) return new BookData(new(), new());

        var original = await LoadUrls(bookId, "orig", info.OriginalUrls);
        var english  = await LoadUrls(bookId, "en",   info.EnglishUrls);

        if (original.Count == 0 && english.Count > 0) original = MirrorStructure(english);
        if (english.Count == 0 && original.Count > 0) english  = MirrorStructure(original);

        AlignBooks(original, english);
        return new BookData(original, english);
    }

    private async Task<List<CanticleContent>> LoadUrls(string bookId, string side, string[]? urls)
    {
        if (urls == null || urls.Length == 0) return new();
        var parts = new List<List<CanticleContent>>();
        for (int i = 0; i < urls.Length; i++)
        {
            var file = $"{bookId}_{side}_{i}.txt";
            var raw  = await FetchOrLoad(file, urls[i]);
            if (!string.IsNullOrWhiteSpace(raw))
                parts.Add(ParseProse(raw));
        }
        return MergeCanticles(parts);
    }

    private static List<CanticleContent> MirrorStructure(List<CanticleContent> src) =>
        src.Select(c => new CanticleContent(c.Name,
            c.Cantos.Select(k => new CantoContent(k.Name, new List<string>())).ToList()
        )).ToList();

    private static List<CanticleContent> MergeCanticles(List<List<CanticleContent>> parts)
    {
        if (parts.Count == 0) return new();
        if (parts.Count == 1) return parts[0];
        var merged = new List<CanticleContent>();
        foreach (var p in parts)
            merged.AddRange(p.Count == 1 ? p : p);
        return merged;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Download / disk cache
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<string> FetchOrLoad(string file, string url)
    {
        var path = Path.Combine(_dataPath, file);
        if (File.Exists(path))
        {
            _logger.LogInformation("Cached: {File}", file);
            return await File.ReadAllTextAsync(path);
        }
        try
        {
            _logger.LogInformation("Downloading {Url}…", url);
            using var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "LangoSoft/1.0 (educational)");
            var text = await client.GetStringAsync(url);
            await File.WriteAllTextAsync(path, text);
            return text;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Download failed for {Url}: {Msg}", url, ex.Message);
            return "";
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dante-specific regexes + parsers
    // ─────────────────────────────────────────────────────────────────────────

    private static readonly Regex CanticleUpperRx = new(
        @"^(INFERNO|PURGATORIO|PARADISO|PURGATORY|PARADISE|HELL)\s*$",
        RegexOptions.Compiled);

    private static readonly Regex SectionLabelRx = new(
        @"^(Inferno|Purgatorio|Paradiso|Purgatory|Paradise|Hell)\s*$",
        RegexOptions.Compiled);

    private static readonly Regex CantoRx = new(
        @"^(?:(?:Inferno|Purgatorio|Paradiso|Purgatory|Paradise|Hell|Inferno):\s*)?Canto\s+([IVXLCDM]+)\.?\s*$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static List<CanticleContent> ParseDante(string raw)
    {
        var lines = NormaliseLines(raw);
        int start = ContentStart(lines), end = ContentEnd(lines);

        var result       = new List<CanticleContent>();
        string canticle  = "";
        List<CantoContent>? curCantos = null;
        List<string>? curLines = null;
        string curCanto  = "";

        for (int i = start; i < end; i++)
        {
            var line = lines[i].Trim();
            if (CanticleUpperRx.IsMatch(line))
            {
                CommitDanteCanto(ref curLines, ref curCanto, curCantos);
                CommitDanteCanticle(result, curCantos, canticle);
                canticle  = CanticleName(line);
                curCantos = new();
                curLines  = null;
                curCanto  = "";
                continue;
            }
            if (canticle == "") continue;
            if (CantoRx.IsMatch(line))
            {
                CommitDanteCanto(ref curLines, ref curCanto, curCantos);
                curCanto = NormCanto(line);
                curLines = new();
                continue;
            }
            if (curLines == null) continue;
            if (!string.IsNullOrWhiteSpace(line)
                && !SectionLabelRx.IsMatch(line)
                && !Regex.IsMatch(line, @"^\d+$")
                && !line.StartsWith("***"))
                curLines.Add(line);
        }
        CommitDanteCanto(ref curLines, ref curCanto, curCantos);
        CommitDanteCanticle(result, curCantos, canticle);
        return result;
    }

    private static CanticleContent ParseDanteSingleCanticle(string raw, string name)
    {
        var lines = NormaliseLines(raw);
        int start = ContentStart(lines), end = ContentEnd(lines);
        var cantos   = new List<CantoContent>();
        List<string>? cur = null;
        string curName = "";

        for (int i = start; i < end; i++)
        {
            var line = lines[i].Trim();
            if (CantoRx.IsMatch(line))
            {
                CommitDanteCanto(ref cur, ref curName, cantos);
                curName = NormCanto(line);
                cur     = new();
                continue;
            }
            if (cur == null) continue;
            if (!string.IsNullOrWhiteSpace(line)
                && !SectionLabelRx.IsMatch(line)
                && !CanticleUpperRx.IsMatch(line)
                && !Regex.IsMatch(line, @"^\d+$")
                && !line.StartsWith("***"))
                cur.Add(line);
        }
        CommitDanteCanto(ref cur, ref curName, cantos);
        return new CanticleContent(name, cantos);
    }

    private static void CommitDanteCanto(ref List<string>? lines, ref string name, List<CantoContent>? cantos)
    {
        if (cantos == null || lines == null || lines.Count == 0) return;
        cantos.Add(new CantoContent(name, new List<string>(lines)));
        lines = null;
        name  = "";
    }

    private static void CommitDanteCanticle(List<CanticleContent> result, List<CantoContent>? cantos, string name)
    {
        if (cantos == null || cantos.Count == 0 || string.IsNullOrEmpty(name)) return;
        result.Add(new CanticleContent(name, cantos));
    }

    private static string CanticleName(string upper) => upper.ToUpperInvariant() switch
    {
        "INFERNO"   or "HELL"      => "Inferno",
        "PURGATORIO" or "PURGATORY" => "Purgatorio",
        "PARADISO"  or "PARADISE"  => "Paradiso",
        _                           => upper,
    };

    private static string NormCanto(string raw)
    {
        var m = Regex.Match(raw, @"([IVXLCDM]+)\.?\s*$", RegexOptions.IgnoreCase);
        return m.Success ? $"Canto {m.Groups[1].Value.ToUpper()}" : raw.Trim();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Generic prose parser
    // ─────────────────────────────────────────────────────────────────────────

    // Chapter keywords across 15+ European languages
    private static readonly Regex ChapterRx = new(
        @"^(?:Chapter|Chapitre|Kapitel|Cap[ií]tulo|Capitolo|Hoofdstuk|Rozdzia[łl]|Fejezet|Capitolul|Глава|Розділ|Luku|Kapittelet?)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Part/Book/Volume keywords
    private static readonly Regex PartRx = new(
        @"^(?:Part|Partie|Teil|Parte|Deel|Band|Buch|Libro|Część|Rész|Partea|Часть|Частина|Osa|Del)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static List<CanticleContent> ParseProse(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return new();

        var lines = NormaliseLines(raw);
        int start = ContentStart(lines), end = ContentEnd(lines);

        var segments    = new List<(string Part, string Chapter, List<string> Paras)>();
        string curPart  = "";
        string curChap  = "";
        List<string>? curParas = null;
        bool seenChap   = false;

        for (int i = start; i < end; i++)
        {
            var line = lines[i].Trim();
            if (line.StartsWith("***")) continue;

            if (PartRx.IsMatch(line) && line.Length < 80)
            {
                Flush();
                curPart = line;
                curChap = "";
                continue;
            }

            if (ChapterRx.IsMatch(line) && line.Length < 80)
            {
                Flush();
                curChap  = line;
                curParas = new();
                seenChap = true;
                continue;
            }

            if (!string.IsNullOrWhiteSpace(line))
            {
                if (!seenChap) continue;        // skip prologue
                curParas ??= new List<string>();
                curParas.Add(line);
            }
        }
        Flush();

        if (segments.Count == 0)
            return ParseProseFallback(lines, start, end);

        bool hasParts = segments.Any(s => !string.IsNullOrEmpty(s.Part));
        if (!hasParts)
        {
            var cantos = segments.Select((s, i) =>
                new CantoContent(string.IsNullOrEmpty(s.Chapter) ? $"Section {i + 1}" : s.Chapter, s.Paras)
            ).ToList();
            return new List<CanticleContent> { new("I", cantos) };
        }

        // Group by part
        var partOrder = new List<string>();
        var grouped   = new Dictionary<string, List<(string, List<string>)>>();
        foreach (var seg in segments)
        {
            if (!grouped.ContainsKey(seg.Part))
            {
                grouped[seg.Part] = new();
                partOrder.Add(seg.Part);
            }
            grouped[seg.Part].Add((seg.Chapter, seg.Paras));
        }
        return partOrder.Select((p, pi) => new CanticleContent(
            string.IsNullOrEmpty(p) ? $"Part {pi + 1}" : p,
            grouped[p].Select((ch, ci) =>
                new CantoContent(string.IsNullOrEmpty(ch.Item1) ? $"Section {ci + 1}" : ch.Item1, ch.Item2)
            ).ToList()
        )).ToList();

        void Flush()
        {
            if (curParas != null && curParas.Count > 0)
                segments.Add((curPart, curChap, new List<string>(curParas)));
            curParas = null;
            curChap  = string.IsNullOrEmpty(curPart) ? curChap : "";
        }
    }

    private static List<CanticleContent> ParseProseFallback(string[] lines, int start, int end)
    {
        const int Section = 40;
        var paras = new List<string>();
        for (int i = start; i < end; i++)
        {
            var t = lines[i].Trim();
            if (!string.IsNullOrWhiteSpace(t) && !t.StartsWith("***"))
                paras.Add(t);
        }
        if (paras.Count == 0)
            return new List<CanticleContent> { new("I", new List<CantoContent> { new("1", new()) }) };

        var cantos = new List<CantoContent>();
        for (int i = 0; i < paras.Count; i += Section)
            cantos.Add(new CantoContent(
                $"Section {cantos.Count + 1}",
                paras.GetRange(i, Math.Min(Section, paras.Count - i))));
        return new List<CanticleContent> { new("I", cantos) };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Shared helpers
    // ─────────────────────────────────────────────────────────────────────────

    private static string[] NormaliseLines(string raw) =>
        raw.Replace("\r\n", "\n").Replace("\r", "\n").Split('\n');

    private static int ContentStart(string[] lines)
    {
        for (int i = 0; i < lines.Length; i++)
            if (lines[i].Contains("*** START OF", StringComparison.OrdinalIgnoreCase))
                return i + 2;
        return 0;
    }

    private static int ContentEnd(string[] lines)
    {
        for (int i = lines.Length - 1; i >= 0; i--)
            if (lines[i].Contains("*** END OF", StringComparison.OrdinalIgnoreCase)
                || lines[i].Contains("End of the Project Gutenberg", StringComparison.OrdinalIgnoreCase)
                || lines[i].Contains("End of Project Gutenberg", StringComparison.OrdinalIgnoreCase))
                return i;
        return lines.Length;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Alignment (pad shorter side with empty strings)
    // ─────────────────────────────────────────────────────────────────────────

    private static void AlignBooks(List<CanticleContent> original, List<CanticleContent> english)
    {
        int n = Math.Max(original.Count, english.Count);
        for (int c = 0; c < n; c++)
        {
            if (c >= original.Count)
                original.Add(new CanticleContent(c < english.Count ? english[c].Name : $"Part {c + 1}", new()));
            if (c >= english.Count)
                english.Add(new CanticleContent(original[c].Name, new()));

            int k = Math.Max(original[c].Cantos.Count, english[c].Cantos.Count);
            for (int j = 0; j < k; j++)
            {
                if (j >= original[c].Cantos.Count)
                    original[c].Cantos.Add(new CantoContent($"Section {j + 1}", new()));
                if (j >= english[c].Cantos.Count)
                    english[c].Cantos.Add(new CantoContent($"Section {j + 1}", new()));

                var orig = original[c].Cantos[j].Lines;
                var eng  = english[c].Cantos[j].Lines;
                int mx   = Math.Max(orig.Count, eng.Count);
                while (orig.Count < mx) orig.Add("");
                while (eng.Count < mx) eng.Add("");
            }
        }
    }

    private static CantoLinesResponse Empty(string canticle, string canto) =>
        new(canticle, canto, new List<string>(), new List<string>());
}
