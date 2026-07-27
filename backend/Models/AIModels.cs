namespace LangoSoft.API.Models;

public record TranslateRequest(string Text, string FromLang = "it", string ToLang = "en");
public record QuestionRequest(string Question, string Context);
public record GrammarRequest(string Word, string Context, string Language, string BookTitle);
public record ConjugateRequest(string Language, string Verb);
public record NounPhraseRequest(string Language, string Noun, string Gender, string Number, string Article, string Adjective = "");
public record QuizRequest(string Language, string Mode = "random", string FromLanguage = "English");
public record AIResponse(string Answer);
public record QuizItem(string Prompt, string Answer, string Note);
