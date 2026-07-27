import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppMode, CantoData, Feature, ConjMode, BookInfo, Structure } from './types';
import type { TextPanelHandle } from './components/TextPanel';
import {
  fetchCanto, fetchStructure, fetchStatus, fetchBooks,
  translateText, askQuestion, grammarBreakdown,
} from './services/api';
import { useSpeech } from './hooks/useSpeech';
import { useNavigation } from './hooks/useNavigation';
import TextPanel from './components/TextPanel';
import AIModal from './components/AIModal';
import StatusBar from './components/StatusBar';
import Sidebar from './components/Sidebar';
import TranslationQuiz from './components/TranslationQuiz';
import AccentBuilder from './components/AccentBuilder';
import './App.css';

function wordsOf(line: string) {
  return line.split(/\s+/).filter(Boolean);
}

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let r = '';
  for (let i = 0; i < vals.length; i++)
    while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
  return r;
}

const SPEECH_LOCALE: Record<string, string> = {
  it: 'it-IT', fr: 'fr-FR', de: 'de-DE', es: 'es-ES',
  ru: 'ru-RU', pt: 'pt-PT', nl: 'nl-NL', sv: 'sv-SE',
  no: 'nb-NO', pl: 'pl-PL', cs: 'cs-CZ', hu: 'hu-HU',
  ro: 'ro-RO', bg: 'bg-BG', uk: 'uk-UA', fi: 'fi-FI',
  da: 'da-DK', el: 'el-GR', en: 'en-US',
};

const DANTE_FALLBACK: BookInfo = {
  id: 'dante', title: 'La Divina Commedia', author: 'Dante Alighieri',
  language: 'Italian', langCode: 'it', supported: true,
};

const EMPTY_STRUCTURE: Structure = { canticleCount: 0, cantosPerCanticle: [], canticleNames: [] };

export default function App() {
  const [canto, setCanto]           = useState<CantoData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [backendReady, setBackendReady] = useState(false);
  const [structure, setStructure]   = useState<Structure>(EMPTY_STRUCTURE);
  const [feature, setFeature]       = useState<Feature>('reader');
  const [conjMode, setConjMode]     = useState<ConjMode>('pronoun-verb');
  const [books, setBooks]           = useState<BookInfo[]>([DANTE_FALLBACK]);
  const [selectedBook, setSelectedBook] = useState('dante');
  const [syncScroll, setSyncScroll] = useState(false);
  const [bookLoading, setBookLoading] = useState(false);

  const [mode, setMode]             = useState<AppMode>('normal');
  const [question, setQuestion]     = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLabel, setAiLabel]       = useState('');
  const [aiWorking, setAiWorking]   = useState(false);

  const { speak } = useSpeech();
  const nav = useNavigation();

  const syncScrollRef = useRef(syncScroll);
  syncScrollRef.current = syncScroll;
  const itPanelRef = useRef<TextPanelHandle>(null);
  const enPanelRef = useRef<TextPanelHandle>(null);

  const handlePanelScroll = useCallback((source: 'it' | 'en', top: number) => {
    if (!syncScrollRef.current) return;
    if (source === 'it') enPanelRef.current?.setScrollTop(top);
    else                 itPanelRef.current?.setScrollTop(top);
  }, []);

  // ── Load book list ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchBooks().then(setBooks).catch(() => {});
  }, []);

  // ── On book change: reset nav + fetch structure (with polling for slow loads) ─
  useEffect(() => {
    nav.setNav(s => ({
      ...s, canticle: 0, canto: 0, line: 0, word: 0, letter: 0,
      selectionMode: false, selectionStart: null, selectionEnd: null,
    }));
    setStructure(EMPTY_STRUCTURE);
    setCanto(null);
    setBackendReady(false);
    setBookLoading(false);

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const applyStructure = (s: Awaited<ReturnType<typeof fetchStructure>>) => {
      if (cancelled) return;
      if (s.loading) {
        setBookLoading(true);
        pollTimer = setTimeout(pollStatus, 4000);
      } else {
        setBookLoading(false);
        setStructure(s);
      }
    };

    const pollStatus = () => {
      fetchStatus(selectedBook)
        .then(({ ready }) => {
          if (cancelled) return;
          if (ready) fetchStructure(selectedBook).then(applyStructure).catch(() => {
            if (!cancelled) pollTimer = setTimeout(pollStatus, 4000);
          });
          else pollTimer = setTimeout(pollStatus, 4000);
        })
        .catch(() => { if (!cancelled) pollTimer = setTimeout(pollStatus, 4000); });
    };

    fetchStructure(selectedBook).then(applyStructure).catch(() => {
      if (!cancelled) {
        setBookLoading(true);
        pollTimer = setTimeout(pollStatus, 4000);
      }
    });

    return () => {
      cancelled = true;
      if (pollTimer !== null) clearTimeout(pollTimer);
    };
  // nav.setNav is stable (from useNavigation), selectedBook is the only real dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBook]);

  // ── Load canto whenever canticle/canto/book change ────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCanto(selectedBook, nav.nav.canticle, nav.nav.canto)
      .then(data => {
        if (cancelled) return;
        setCanto(data);
        setBackendReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setBackendReady(false);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedBook, nav.nav.canticle, nav.nav.canto]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const selectedBookInfo = books.find(b => b.id === selectedBook) ?? DANTE_FALLBACK;
  const bookLangCode     = selectedBookInfo.langCode;
  const origLocale       = SPEECH_LOCALE[bookLangCode] ?? 'it-IT';

  const getSelectedText = (n: ReturnType<typeof useNavigation>['nav'], lines: string[]) => {
    const line  = lines[n.line] ?? '';
    const words = wordsOf(line);
    const { selectionMode, selectionStart, selectionEnd, word } = n;
    if (selectionMode && selectionStart !== null && selectionEnd !== null) {
      const lo = Math.min(selectionStart, selectionEnd);
      const hi = Math.max(selectionStart, selectionEnd);
      return words.slice(lo, hi + 1).join(' ');
    }
    return words[word] ?? '';
  };

  // ── AI callbacks ──────────────────────────────────────────────────────────
  const doTranslate = useCallback(async (selectedText: string, panel: string) => {
    if (!selectedText || aiWorking) return;
    nav.cancelSelection();
    setAiWorking(true);
    const from   = panel === 'it' ? bookLangCode : 'en';
    const to     = panel === 'it' ? 'en' : bookLangCode;
    const toLang = panel === 'it' ? 'en-US' : origLocale;
    const result = await translateText(selectedText, from, to);
    setAiResponse(result);
    setAiLabel(`Translation of "${selectedText}"`);
    setMode('response');
    speak(result, toLang);
    setAiWorking(false);
  }, [nav, aiWorking, speak, bookLangCode, origLocale]);

  const doAskQuestion = useCallback(async () => {
    if (!question.trim() || aiWorking) return;
    setAiWorking(true);
    const n   = navRef.current;
    const ct  = cantoRef.current;
    const lines = ct ? (n.nav.panel === 'it' ? ct.italian : ct.english) : [];
    const context = `${ct?.canticleName ?? ''} ${ct?.cantoName ?? ''}, line ${n.nav.line + 1}: "${lines[n.nav.line] ?? ''}"`;
    const result = await askQuestion(question.trim(), context);
    setAiResponse(result);
    setAiLabel(`Q: ${question}`);
    setQuestion('');
    setMode('response');
    speak(result, 'en-US');
    setAiWorking(false);
  }, [question, aiWorking, speak]);

  const doGrammar = useCallback(async (word: string, context: string, language: string) => {
    if (!word || aiWorking) return;
    setAiWorking(true);
    const ct        = cantoRef.current;
    const bookTitle = ct ? `${ct.canticleName}, ${ct.cantoName}` : selectedBookInfo.title;
    const result    = await grammarBreakdown(word, context, language, bookTitle);
    setAiResponse(result);
    setAiLabel(`Grammar: "${word}"`);
    setMode('response');
    setAiWorking(false);
  }, [aiWorking, selectedBookInfo.title]);

  // ── Keyboard handler ──────────────────────────────────────────────────────
  const modeRef          = useRef(mode);
  const navRef           = useRef(nav);
  const cantoRef         = useRef(canto);
  const structureRef     = useRef(structure);
  const featureRef       = useRef(feature);
  const selectedBookRef  = useRef(selectedBook);
  const booksRef         = useRef(books);
  modeRef.current         = mode;
  navRef.current          = nav;
  cantoRef.current        = canto;
  structureRef.current    = structure;
  featureRef.current      = feature;
  selectedBookRef.current = selectedBook;
  booksRef.current        = books;

  const handleKey = useCallback((e: KeyboardEvent) => {
    const currentMode    = modeRef.current;
    const currentFeature = featureRef.current;
    const n  = navRef.current;
    const ct = cantoRef.current;
    const st = structureRef.current;

    if (currentMode === 'question') return;
    if (currentMode === 'response') { setMode('normal'); return; }
    if (currentFeature !== 'reader') return;

    const key  = e.key.toLowerCase();
    const code = e.code;
    const num  = (d: string) => key === d || code === `Numpad${d}`;

    if (['1','2','3','4','5','6','7','8','9'].some(d => num(d))) e.preventDefault();

    const selBook = selectedBookRef.current;
    const selInfo = booksRef.current.find(b => b.id === selBook);
    const langCode = n.nav.panel === 'it'
      ? (SPEECH_LOCALE[selInfo?.langCode ?? 'it'] ?? 'it-IT')
      : 'en-US';

    const lines = ct ? (n.nav.panel === 'it' ? ct.italian : ct.english) : [];
    const line  = lines[n.nav.line] ?? '';
    const words = wordsOf(line);
    const word  = words[n.nav.word] ?? '';

    if (key === 'f') { n.togglePanel(); return; }

    if (num('8')) { speak(line, langCode); return; }
    if (num('5')) { speak(word, langCode); return; }
    if (num('2')) { speak(word[n.nav.letter] ?? '', langCode); return; }

    if (num('9')) {
      if (n.nav.line < lines.length - 1) {
        const nextText = lines[n.nav.line + 1] ?? '';
        n.nextLine(lines.length - 1);
        speak(nextText, langCode);
      } else {
        const maxCanto    = (st.cantosPerCanticle[n.nav.canticle] ?? 1) - 1;
        const maxCanticle = st.canticleCount - 1;
        n.nextCanto(maxCanto, maxCanticle);
      }
      return;
    }

    if (num('7')) {
      if (n.nav.line > 0) { const prevText = lines[n.nav.line - 1] ?? ''; n.prevLine(); speak(prevText, langCode); }
      else n.prevCanto();
      return;
    }

    if (num('6')) {
      if (n.nav.selectionMode && n.nav.selectionStart !== null) {
        const curEnd = n.nav.selectionEnd ?? n.nav.selectionStart;
        const newEnd = Math.min(curEnd + 1, words.length - 1);
        n.nextWord(Math.max(words.length - 1, 0));
        const lo = Math.min(n.nav.selectionStart, newEnd);
        const hi = Math.max(n.nav.selectionStart, newEnd);
        speak(words.slice(lo, hi + 1).join(' '), langCode);
      } else {
        const nextWord = words[Math.min(n.nav.word + 1, words.length - 1)] ?? '';
        n.nextWord(Math.max(words.length - 1, 0));
        speak(nextWord, langCode);
      }
      return;
    }

    if (num('4')) {
      if (n.nav.selectionMode && n.nav.selectionStart !== null) {
        const curEnd = n.nav.selectionEnd ?? n.nav.selectionStart;
        const newEnd = Math.max(curEnd - 1, n.nav.selectionStart);
        n.prevWord();
        const lo = Math.min(n.nav.selectionStart, newEnd);
        const hi = Math.max(n.nav.selectionStart, newEnd);
        speak(words.slice(lo, hi + 1).join(' '), langCode);
      } else {
        const prevWord = words[Math.max(n.nav.word - 1, 0)] ?? '';
        n.prevWord();
        speak(prevWord, langCode);
      }
      return;
    }

    if (num('3')) {
      const nextLetter = word[Math.min(n.nav.letter + 1, word.length - 1)] ?? '';
      n.nextLetter(Math.max(word.length - 1, 0));
      speak(nextLetter, langCode);
      return;
    }

    if (num('1')) {
      const prevLetter = word[Math.max(n.nav.letter - 1, 0)] ?? '';
      n.prevLetter();
      speak(prevLetter, langCode);
      return;
    }

    if (key === 'a') { n.startSelection(); return; }
    if (key === 'escape') { n.cancelSelection(); return; }

    if (key === 'd') {
      const text = getSelectedText(n.nav, lines);
      doTranslate(text, n.nav.panel);
      return;
    }

    if (key === 'g') {
      const target = getSelectedText(n.nav, lines) || word;
      if (target) {
        const selBook2 = selectedBookRef.current;
        const selInfo2 = booksRef.current.find(b => b.id === selBook2);
        const language = n.nav.panel === 'it'
          ? (selInfo2?.language ?? 'Italian')
          : 'English';
        doGrammar(target, line, language);
      }
      return;
    }

    if (key === 's') { setMode('question'); return; }
  }, [speak, doTranslate, doGrammar, getSelectedText]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // ── Render ────────────────────────────────────────────────────────────────
  const { nav: n } = nav;
  const hasText = structure.canticleCount > 0;

  const origLabel = `${selectedBookInfo.language} original`;
  const enLabel   = 'English translation';

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">langosoft</h1>

        {feature === 'reader' && (
          <nav className="top-nav">
            <select className="nav-select" value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
              {books.map(b => (
                <option key={b.id} value={b.id}>{b.language} — {b.title}</option>
              ))}
            </select>

            {hasText && (
              <>
                <select
                  className="nav-select"
                  value={n.canticle}
                  onChange={e => {
                    const c = Number(e.target.value);
                    nav.setNav(s => ({ ...s, canticle: c, canto: 0, line: 0, word: 0, letter: 0, selectionMode: false, selectionStart: null, selectionEnd: null }));
                  }}
                >
                  {structure.canticleNames.map((name, i) => <option key={i} value={i}>{name}</option>)}
                </select>

                <select
                  className="nav-select"
                  value={n.canto}
                  onChange={e => {
                    const c = Number(e.target.value);
                    nav.setNav(s => ({ ...s, canto: c, line: 0, word: 0, letter: 0, selectionMode: false, selectionStart: null, selectionEnd: null }));
                  }}
                >
                  {Array.from({ length: structure.cantosPerCanticle[n.canticle] ?? 0 }, (_, i) => (
                    <option key={i} value={i}>{toRoman(i + 1)}</option>
                  ))}
                </select>
              </>
            )}
          </nav>
        )}

        {feature === 'reader' && (
          <label className="sync-label">
            <input type="checkbox" checked={syncScroll} onChange={e => setSyncScroll(e.target.checked)} />
            Sync scroll
          </label>
        )}

        {loading && feature === 'reader' && <span className="ai-working">Loading…</span>}
        {aiWorking && <span className="ai-working">AI thinking…</span>}
      </header>

      <div className="app-body">
        <Sidebar
            activeFeature={feature}
            conjMode={conjMode}
            onFeatureChange={setFeature}
            onConjModeChange={setConjMode}
          />

        <div className="main-content">
          {feature === 'reader' && hasText && (
            <main className="panels">
              <TextPanel
                ref={itPanelRef}
                lines={canto?.italian ?? []}
                lang="it"
                label={origLabel}
                activePanel={n.panel}
                lineIndex={n.line}
                wordIndex={n.word}
                letterIndex={n.letter}
                selectionMode={n.selectionMode}
                selectionStart={n.selectionStart}
                selectionEnd={n.selectionEnd}
                onScroll={top => handlePanelScroll('it', top)}
              />
              <div className="panel-divider" />
              <TextPanel
                ref={enPanelRef}
                lines={canto?.english ?? []}
                lang="en"
                label={enLabel}
                activePanel={n.panel}
                lineIndex={n.line}
                wordIndex={n.word}
                letterIndex={n.letter}
                selectionMode={n.selectionMode}
                selectionStart={n.selectionStart}
                selectionEnd={n.selectionEnd}
                onScroll={top => handlePanelScroll('en', top)}
              />
            </main>
          )}

          {feature === 'reader' && !hasText && bookLoading && (
            <div className="coming-soon">
              <div className="coming-soon-icon">⏳</div>
              <div className="coming-soon-title">Downloading {selectedBookInfo.title}…</div>
              <p className="coming-soon-msg">Fetching text from Project Gutenberg (first load only).</p>
            </div>
          )}

          {feature === 'reader' && !hasText && !bookLoading && loading && (
            <div className="coming-soon">
              <div className="coming-soon-icon">⏳</div>
              <div className="coming-soon-title">Loading {selectedBookInfo.title}…</div>
              <p className="coming-soon-msg">Please wait.</p>
            </div>
          )}

          {feature === 'reader' && !hasText && !bookLoading && !loading && (
            <div className="coming-soon">
              <div className="coming-soon-icon">📚</div>
              <div className="coming-soon-title">{selectedBookInfo.title}</div>
              <div className="coming-soon-sub">{selectedBookInfo.author} · {selectedBookInfo.language}</div>
              <p className="coming-soon-msg">
                Text not available yet — the book may be loading or the source URL may need updating.
              </p>
            </div>
          )}

          {feature === 'conjugator' && (
            <div className="feature-panel">
              <TranslationQuiz mode={conjMode} />
            </div>
          )}

          {feature === 'accent' && (
            <div className="feature-panel">
              <AccentBuilder />
            </div>
          )}
        </div>
      </div>

      <StatusBar
        nav={n}
        canticleName={canto?.canticleName ?? (hasText ? structure.canticleNames[n.canticle] ?? '…' : '…')}
        cantoName={canto?.cantoName ?? '…'}
        loading={loading}
        backendReady={backendReady}
      />

      <AIModal
        mode={mode}
        question={question}
        response={aiResponse}
        responseLabel={aiLabel}
        onQuestionChange={setQuestion}
        onSubmit={doAskQuestion}
        onClose={() => { setMode('normal'); setQuestion(''); }}
      />
    </div>
  );
}
