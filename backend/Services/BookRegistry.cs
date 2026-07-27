using LangoSoft.API.Models;

namespace LangoSoft.API.Services;

public static class BookRegistry
{
    private static string U(int id) =>
        $"https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt";

    public static readonly IReadOnlyList<BookInfo> Books = new BookInfo[]
    {
        // Italian — special multi-file Dante parser (OriginalUrls/EnglishUrls handled separately)
        new("dante",       "La Divina Commedia",        "Dante Alighieri",            "Italian",    "it", true),

        // French — Madame Bovary
        new("bovary",      "Madame Bovary",              "Gustave Flaubert",           "French",     "fr", true,
            OriginalUrls: new[] { U(14287) },
            EnglishUrls:  new[] { U(2413)  }),

        // German — Faust Part I
        new("faust",       "Faust Part I",               "Johann Wolfgang von Goethe", "German",     "de", true,
            OriginalUrls: new[] { U(2229)  },
            EnglishUrls:  new[] { U(14591) }),

        // Spanish — Don Quixote Part I
        new("quixote",     "Don Quixote",                "Miguel de Cervantes",        "Spanish",    "es", true,
            OriginalUrls: new[] { U(2000)  },
            EnglishUrls:  new[] { U(5901)  }),

        // Russian — Anna Karenina
        new("karenina",    "Anna Karenina",              "Leo Tolstoy",                "Russian",    "ru", true,
            OriginalUrls: new[] { U(17679) },
            EnglishUrls:  new[] { U(1399)  }),

        // Portuguese — O Crime do Padre Amaro
        new("padre-amaro", "O Crime do Padre Amaro",     "Eça de Queirós",             "Portuguese", "pt", true,
            OriginalUrls: new[] { U(36296) },
            EnglishUrls:  null),

        // Dutch — Max Havelaar
        new("havelaar",    "Max Havelaar",               "Multatuli",                  "Dutch",      "nl", true,
            OriginalUrls: new[] { U(36500) },
            EnglishUrls:  new[] { U(36500) }),

        // Swedish — Röda rummet
        new("roda-rummet", "Röda rummet",                "August Strindberg",          "Swedish",    "sv", true,
            OriginalUrls: new[] { U(28620) },
            EnglishUrls:  null),

        // Norwegian — Peer Gynt (EN Archer translation; no reliable NO original on PG)
        new("peer-gynt",   "Peer Gynt",                  "Henrik Ibsen",               "Norwegian",  "no", true,
            OriginalUrls: null,
            EnglishUrls:  new[] { U(32582) }),

        // Polish — Lalka
        new("lalka",       "Lalka (The Doll)",           "Bolesław Prus",              "Polish",     "pl", true,
            OriginalUrls: new[] { U(32060) },
            EnglishUrls:  null),

        // Czech — Good Soldier Švejk (EN Sadlon translation)
        new("svejk",       "The Good Soldier Švejk",     "Jaroslav Hašek",             "Czech",      "cs", true,
            OriginalUrls: null,
            EnglishUrls:  new[] { U(35590) }),

        // Hungarian — The Paul Street Boys
        new("paul-street", "The Paul Street Boys",       "Ferenc Molnár",              "Hungarian",  "hu", true,
            OriginalUrls: null,
            EnglishUrls:  new[] { U(26807) }),

        // Romanian — Mara
        new("mara",        "Mara",                       "Ioan Slavici",               "Romanian",   "ro", true,
            OriginalUrls: new[] { U(55453) },
            EnglishUrls:  null),

        // Bulgarian — Under the Yoke
        new("under-yoke",  "Under the Yoke",             "Ivan Vazov",                 "Bulgarian",  "bg", true,
            OriginalUrls: null,
            EnglishUrls:  new[] { U(16581) }),

        // Ukrainian — Kobzar
        new("kobzar",      "Kobzar",                     "Taras Shevchenko",           "Ukrainian",  "uk", true,
            OriginalUrls: new[] { U(59058) },
            EnglishUrls:  null),

        // Finnish — Seven Brothers
        new("seven-bros",  "Seven Brothers",             "Aleksis Kivi",               "Finnish",    "fi", true,
            OriginalUrls: new[] { U(11940) },
            EnglishUrls:  null),

        // Danish — Niels Lyhne
        new("niels-lyhne", "Niels Lyhne",                "J.P. Jacobsen",              "Danish",     "da", true,
            OriginalUrls: null,
            EnglishUrls:  new[] { U(26588) }),

        // Greek — Cavafy Selected Poems (EN Dalven translation)
        new("cavafy",      "Selected Poems",             "C.P. Cavafy",                "Greek",      "el", true,
            OriginalUrls: null,
            EnglishUrls:  null),
    };
}
