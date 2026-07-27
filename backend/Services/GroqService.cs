using LangoSoft.API.Models;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LangoSoft.API.Services;

public class GroqService
{
    private readonly IHttpClientFactory _factory;
    private readonly IConfiguration _config;
    private readonly ILogger<GroqService> _logger;

    private const string BaseUrl = "https://api.groq.com/openai/v1/chat/completions";

    public GroqService(IHttpClientFactory factory, IConfiguration config, ILogger<GroqService> logger)
    {
        _factory = factory;
        _config  = config;
        _logger  = logger;
    }

    public Task<string> TranslateAsync(string text, string from, string to)
    {
        var prompt =
            $"Translate this {LangName(from)} text to {LangName(to)}. " +
            $"Respond with ONLY the translation, nothing else.\n\nText: {text}";
        return ChatAsync(prompt, 256);
    }

    public Task<string> AnswerAsync(string question, string context)
    {
        var prompt =
            $"You are a language-learning assistant. Context: \"{context}\"\n\n" +
            $"Question: {question}\n\n" +
            $"Answer in exactly 2 sentences. Be concise and educational.";
        return ChatAsync(prompt, 512);
    }

    public Task<string> GrammarAsync(string word, string context, string language, string bookTitle)
    {
        var prompt =
            $"You are a linguistics tutor. The student is learning {language} through \"{bookTitle}\".\n" +
            $"Sentence: \"{context}\"\n" +
            $"Analyze the word: \"{word}\"\n\n" +
            $"Provide:\n" +
            $"• Part of speech\n" +
            $"• For verbs: infinitive, tense, mood, person, number, regular/irregular\n" +
            $"• For nouns: gender, number, case (if applicable)\n" +
            $"• For adjectives: degree, gender/number agreement\n" +
            $"• One sentence on why this matters for a learner\n\n" +
            $"Maximum 6 bullet points. Be concise.";
        return ChatAsync(prompt, 400);
    }

    public Task<string> ConjugateAsync(string language, string verb)
    {
        var prompt =
            $"Conjugate the {language} verb \"{verb}\".\n\n" +
            $"Plain-text table — columns: Person | Present | Imperfect | Preterite | Future | Conditional | Subj.Present | Imperative\n" +
            $"Rows: 1sg / 2sg / 3sg / 1pl / 2pl / 3pl, then Infinitive / Gerund / Past Participle.\n\n" +
            $"End with one sentence: regular or irregular, conjugation class.";
        return ChatAsync(prompt, 700);
    }

    public Task<string> NounPhraseAsync(string language, string noun, string gender, string number, string article, string adjective)
    {
        var adjPart = string.IsNullOrWhiteSpace(adjective) ? "none" : adjective;
        var prompt =
            $"Build a {language} noun phrase.\n" +
            $"Noun: {noun} | Gender: {gender} | Number: {number} | Article: {article} | Adjective(s): {adjPart}\n\n" +
            $"Show:\n" +
            $"1. The complete noun phrase.\n" +
            $"2. Breakdown: explain each word's form and agreement rule.\n" +
            $"Max 5 bullet points.";
        return ChatAsync(prompt, 400);
    }

    public async Task<QuizItem> QuizAsync(string language, string mode, string fromLanguage = "English")
    {
        string prompt;

        if (mode == "translate")
        {
            prompt =
                $"Generate one translation exercise for a {language} learner.\n" +
                $"Give a natural {fromLanguage} sentence (2–8 words, everyday vocabulary, unambiguous meaning).\n\n" +
                $"Return a JSON object with exactly these keys:\n" +
                $"- \"prompt\": the {fromLanguage} sentence\n" +
                $"- \"answer\": the most natural {language} translation\n" +
                $"- \"note\": one grammar tip (max 10 words)\n\n" +
                $"Example: {{\"prompt\":\"he knows the answer\",\"answer\":\"conosce la risposta\",\"note\":\"conoscere = knowing a thing, sapere = knowing a fact\"}}\n" +
                $"Return ONLY the JSON object, nothing else.";
        }
        else
        {
            var modeDesc = mode switch
            {
                "verb" => $"a verb conjugation exercise (pick a common {language} verb, specify person + tense, ask for the conjugated form)",
                "noun" => $"a noun phrase exercise (pick a common {language} noun, specify gender/number/article, ask for the full noun phrase with article)",
                _      => $"either a verb conjugation or a noun phrase exercise — your choice"
            };

            prompt =
                $"Generate one language drill exercise for a student learning {language}.\n" +
                $"Type: {modeDesc}\n\n" +
                $"Return a JSON object with exactly these keys:\n" +
                $"- \"prompt\": what to show the student (be specific: include the base form and what is asked)\n" +
                $"- \"answer\": the single correct answer string\n" +
                $"- \"note\": one grammar note (max 10 words) explaining the answer\n\n" +
                $"Example: {{\"prompt\":\"1sg present indicative of 'essere' (Italian)\",\"answer\":\"sono\",\"note\":\"Irregular verb; memorise all 6 present forms\"}}\n" +
                $"Return ONLY the JSON object, nothing else.";
        }

        var raw = await ChatAsync(prompt, 250, jsonMode: true);

        try
        {
            using var doc = JsonDocument.Parse(raw);
            var r = doc.RootElement;
            return new QuizItem(
                r.GetProperty("prompt").GetString() ?? "—",
                r.GetProperty("answer").GetString() ?? "",
                r.GetProperty("note").GetString()   ?? "");
        }
        catch
        {
            _logger.LogWarning("Quiz JSON parse failed: {Raw}", raw);
            return new QuizItem("Could not generate question — please try again.", "", "");
        }
    }

    // ── Core HTTP call ─────────────────────────────────────────────────────────

    private async Task<string> ChatAsync(string userMessage, int maxTokens = 256, bool jsonMode = false)
    {
        var apiKey = _config["Groq:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GROQ_API_KEY")
            ?? "";

        if (string.IsNullOrWhiteSpace(apiKey))
            return "[Groq API key not configured.]";

        var model = _config["Groq:Model"] ?? "llama-3.3-70b-versatile";

        var body = new Dictionary<string, object>
        {
            ["model"]     = model,
            ["max_tokens"] = maxTokens,
            ["messages"]  = new[] { new { role = "user", content = userMessage } },
        };
        if (jsonMode)
            body["response_format"] = new { type = "json_object" };

        var json = JsonSerializer.Serialize(body);
        using var request = new HttpRequestMessage(HttpMethod.Post, BaseUrl)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var client = _factory.CreateClient();
        var response = await client.SendAsync(request);
        var bodyStr  = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Groq error {Status}: {Body}", response.StatusCode, bodyStr);
            return $"[Groq error {response.StatusCode}]";
        }

        using var doc = JsonDocument.Parse(bodyStr);
        return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "";
    }

    private static string LangName(string code) => code switch
    {
        "it" => "Italian",   "en" => "English",    "fr" => "French",
        "de" => "German",    "es" => "Spanish",    "ru" => "Russian",
        "pt" => "Portuguese","nl" => "Dutch",      "sv" => "Swedish",
        "no" => "Norwegian", "pl" => "Polish",     "cs" => "Czech",
        "hu" => "Hungarian", "ro" => "Romanian",   "bg" => "Bulgarian",
        "uk" => "Ukrainian", "fi" => "Finnish",    "da" => "Danish",
        "el" => "Greek",     _    => code
    };
}
