using LangoSoft.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace LangoSoft.API.Controllers;

[ApiController]
[Route("api/text")]
public class TextController(TextService textService) : ControllerBase
{
    [HttpGet("books")]
    public IActionResult GetBooks() => Ok(BookRegistry.Books);

    [HttpGet("status")]
    public IActionResult Status([FromQuery] string book = "dante") =>
        Ok(new { ready = textService.IsBookLoaded(book) });

    [HttpGet("structure")]
    public async Task<IActionResult> GetStructure([FromQuery] string book = "dante")
    {
        await textService.EnsureBookLoadedAsync(book);
        int count  = textService.GetCanticleCount(book);
        var cantos = Enumerable.Range(0, count).Select(c => textService.GetCantoCount(book, c)).ToArray();
        var names  = Enumerable.Range(0, count).Select(c => textService.GetCanticleName(book, c)).ToArray();
        return Ok(new { canticleCount = count, cantosPerCanticle = cantos, canticleNames = names });
    }

    [HttpGet("canto")]
    public async Task<IActionResult> GetCanto(
        [FromQuery] string book = "dante",
        [FromQuery] int canticle = 0,
        [FromQuery] int canto = 0)
    {
        await textService.EnsureBookLoadedAsync(book);
        return Ok(textService.GetCanto(book, canticle, canto));
    }
}
