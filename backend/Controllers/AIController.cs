using LangoSoft.API.Models;
using LangoSoft.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace LangoSoft.API.Controllers;

[ApiController]
[Route("api/ai")]
public class AIController(GroqService groqService) : ControllerBase
{
    [HttpPost("translate")]
    public async Task<IActionResult> Translate([FromBody] TranslateRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Text)) return BadRequest("Text required");
        return Ok(new AIResponse(await groqService.TranslateAsync(req.Text, req.FromLang, req.ToLang)));
    }

    [HttpPost("question")]
    public async Task<IActionResult> Question([FromBody] QuestionRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Question)) return BadRequest("Question required");
        return Ok(new AIResponse(await groqService.AnswerAsync(req.Question, req.Context ?? "")));
    }

    [HttpPost("grammar")]
    public async Task<IActionResult> Grammar([FromBody] GrammarRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Word)) return BadRequest("Word required");
        return Ok(new AIResponse(await groqService.GrammarAsync(req.Word, req.Context ?? "", req.Language, req.BookTitle)));
    }

    [HttpPost("conjugate")]
    public async Task<IActionResult> Conjugate([FromBody] ConjugateRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Verb)) return BadRequest("Verb required");
        return Ok(new AIResponse(await groqService.ConjugateAsync(req.Language, req.Verb)));
    }

    [HttpPost("nounphrase")]
    public async Task<IActionResult> NounPhrase([FromBody] NounPhraseRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Noun)) return BadRequest("Noun required");
        return Ok(new AIResponse(await groqService.NounPhraseAsync(req.Language, req.Noun, req.Gender, req.Number, req.Article, req.Adjective)));
    }

    [HttpPost("quiz")]
    public async Task<IActionResult> Quiz([FromBody] QuizRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Language)) return BadRequest("Language required");
        return Ok(await groqService.QuizAsync(req.Language, req.Mode));
    }
}
