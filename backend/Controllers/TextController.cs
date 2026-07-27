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
    public IActionResult GetStructure([FromQuery] string book = "dante")
    {
        if (!textService.IsBookLoaded(book))
        {
            _ = textService.EnsureBookLoadedAsync(book);
            return Ok(new
            {
                loading = true,
                canticleCount = 0,
                cantosPerCanticle = Array.Empty<int>(),
                canticleNames = Array.Empty<string>(),
            });
        }
        int count  = textService.GetCanticleCount(book);
        var cantos = Enumerable.Range(0, count).Select(c => textService.GetCantoCount(book, c)).ToArray();
        var names  = Enumerable.Range(0, count).Select(c => textService.GetCanticleName(book, c)).ToArray();
        return Ok(new { loading = false, canticleCount = count, cantosPerCanticle = cantos, canticleNames = names });
    }

    [HttpGet("canto")]
    public IActionResult GetCanto(
        [FromQuery] string book = "dante",
        [FromQuery] int canticle = 0,
        [FromQuery] int canto = 0)
    {
        if (!textService.IsBookLoaded(book))
            return Ok(new
            {
                canticleName = "Loading…",
                cantoName    = "…",
                italian      = Array.Empty<string>(),
                english      = Array.Empty<string>(),
            });
        return Ok(textService.GetCanto(book, canticle, canto));
    }
}
