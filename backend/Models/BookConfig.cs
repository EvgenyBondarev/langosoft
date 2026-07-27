namespace LangoSoft.API.Models;

public record BookInfo(
    string Id,
    string Title,
    string Author,
    string Language,
    string LangCode,
    bool Supported,
    string[]? OriginalUrls = null,
    string[]? EnglishUrls = null
);
