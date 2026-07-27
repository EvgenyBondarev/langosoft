namespace LangoSoft.API.Models;

public record TextLine(string Text, int CanticleIndex, int CantoIndex, int LineIndex);

public record CantoContent(string Name, List<string> Lines);

public record CanticleContent(string Name, List<CantoContent> Cantos);

public record ParallelTextResponse(
    List<CanticleContent> Italian,
    List<CanticleContent> English
);

public record CantoLinesResponse(
    string CanticleName,
    string CantoName,
    List<string> Italian,
    List<string> English
);
