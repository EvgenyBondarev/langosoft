import { useState, useRef, useEffect } from 'react';
import { fetchQuiz } from '../services/api';
import type { QuizItem, ConjMode } from '../types';

interface Props { mode: ConjMode }

const LANGUAGES = [
  'Bulgarian', 'Czech', 'Danish', 'Dutch', 'English', 'Finnish',
  'French', 'German', 'Greek', 'Hungarian', 'Italian', 'Norwegian',
  'Polish', 'Portuguese', 'Romanian', 'Russian', 'Spanish', 'Swedish', 'Ukrainian',
];

const LANG_LOCALE: Record<string, string> = {
  Bulgarian: 'bg-BG', Czech: 'cs-CZ', Danish: 'da-DK', Dutch: 'nl-NL',
  English: 'en-US', Finnish: 'fi-FI', French: 'fr-FR', German: 'de-DE',
  Greek: 'el-GR', Hungarian: 'hu-HU', Italian: 'it-IT', Norwegian: 'nb-NO',
  Polish: 'pl-PL', Portuguese: 'pt-PT', Romanian: 'ro-RO', Russian: 'ru-RU',
  Spanish: 'es-ES', Swedish: 'sv-SE', Ukrainian: 'uk-UA',
};

const MODE_LABEL: Record<ConjMode, string> = {
  'pronoun-verb': 'Pronoun + Verb',
  'id-adj-noun':  'Identifier + Adjective + Noun',
};

interface Progress { correct: number; total: number }

function pKey(from: string, to: string, mode: ConjMode) { return `tquiz_${mode}_${from}_${to}`; }

function loadProg(from: string, to: string, mode: ConjMode): Progress {
  try { const r = localStorage.getItem(pKey(from, to, mode)); return r ? JSON.parse(r) : { correct: 0, total: 0 }; }
  catch { return { correct: 0, total: 0 }; }
}

function saveProg(from: string, to: string, mode: ConjMode, p: Progress) {
  localStorage.setItem(pKey(from, to, mode), JSON.stringify(p));
}

function tts(text: string, lang = 'en-US') {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

function ttsSequence(items: Array<{ text: string; lang: string }>) {
  window.speechSynthesis.cancel();
  for (const { text, lang } of items) {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  }
}

export default function TranslationQuiz({ mode }: Props) {
  const [fromLang, setFromLang] = useState('English');
  const [toLang,   setToLang]   = useState('Italian');
  const [quiz,     setQuiz]     = useState<QuizItem | null>(null);
  const [answer,   setAnswer]   = useState('');
  const [result,   setResult]   = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState<Progress>({ correct: 0, total: 0 });
  const [lastPrompt, setLastPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset when language pair or mode changes
  useEffect(() => {
    setProgress(loadProg(fromLang, toLang, mode));
    setQuiz(null);
    setAnswer('');
    setResult('idle');
    setLastPrompt('');
  }, [fromLang, toLang, mode]);

  const generate = async () => {
    setLoading(true);
    setAnswer('');
    setResult('idle');
    setQuiz(null);
    try {
      const q = await fetchQuiz(toLang, mode, fromLang, lastPrompt);
      setQuiz(q);
      setLastPrompt(q.prompt);
      setTimeout(() => inputRef.current?.focus(), 60);
    } catch {
      setQuiz({ prompt: 'Error generating. Try again.', answer: '', note: '' });
    }
    setLoading(false);
  };

  // Keep a stable ref to generate so the keydown handler below doesn't stale-close over it
  const generateRef = useRef(generate);
  generateRef.current = generate;

  // Enter key when result !== 'idle' → next question
  useEffect(() => {
    if (result === 'idle') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !loading) {
        e.stopPropagation();
        generateRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [result, loading]);

  const check = () => {
    if (!quiz?.answer || !answer.trim()) return;
    const ok = answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase();
    const np: Progress = { correct: progress.correct + (ok ? 1 : 0), total: progress.total + 1 };
    setProgress(np);
    saveProg(fromLang, toLang, mode, np);
    setResult(ok ? 'correct' : 'wrong');
    if (ok) {
      tts('Correct!', 'en-US');
    } else {
      ttsSequence([
        { text: 'Incorrect. The answer is:', lang: 'en-US' },
        { text: quiz.answer, lang: LANG_LOCALE[toLang] ?? 'en-US' },
      ]);
    }
  };

  const acceptAnyway = () => {
    const np: Progress = { correct: progress.correct + 1, total: progress.total };
    setProgress(np);
    saveProg(fromLang, toLang, mode, np);
    setResult('correct');
    tts('Accepted!', 'en-US');
  };

  const swapLangs = () => { const t = fromLang; setFromLang(toLang); setToLang(t); };

  const pct   = progress.total > 0 ? Math.round((progress.correct / progress.total) * 100) : 0;
  const ready = !!(quiz?.answer);

  return (
    <div className="tquiz">

      {/* Mode label */}
      <div className="tquiz-mode-label">{MODE_LABEL[mode]}</div>

      {/* Language pair */}
      <div className="tquiz-langs">
        <select
          className="conj-select tquiz-lang-select"
          value={fromLang}
          onChange={e => { if (e.target.value !== toLang) setFromLang(e.target.value); }}
        >
          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
        </select>

        <button className="tquiz-swap" onClick={swapLangs} title="Swap">⇄</button>

        <select
          className="conj-select tquiz-lang-select"
          value={toLang}
          onChange={e => { if (e.target.value !== fromLang) setToLang(e.target.value); }}
        >
          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Progress */}
      <div className="tquiz-progress">
        <span className="tquiz-progress-label">
          {progress.total > 0 ? `${progress.correct} / ${progress.total} correct — ${pct}%` : 'No attempts yet'}
        </span>
        <div className="tquiz-progress-track">
          <div className="tquiz-progress-fill" style={{ width: progress.total > 0 ? `${pct}%` : '0%' }} />
        </div>
      </div>

      {/* Jumbotron */}
      <div className={`tquiz-jumbotron ${result === 'correct' ? 'tquiz-jumbotron--correct' : result === 'wrong' ? 'tquiz-jumbotron--wrong' : ''} ${!ready ? 'tquiz-jumbotron--empty' : ''}`}>
        {ready ? (
          <>
            <div className="tquiz-from-label">{fromLang}</div>
            <div className="tquiz-prompt">{quiz!.prompt}</div>
            <div className="tquiz-to-label">→ {toLang}</div>
          </>
        ) : (
          <div className="tquiz-empty-msg">
            {loading ? 'Generating…' : `Press Start · ${fromLang} → ${toLang}`}
          </div>
        )}
      </div>

      {/* Answer input */}
      {ready && (
        <input
          ref={inputRef}
          className={`conj-input tquiz-answer ${result === 'correct' ? 'quiz-input--correct' : result === 'wrong' ? 'quiz-input--wrong' : ''}`}
          value={answer}
          onChange={e => { setAnswer(e.target.value); if (result !== 'idle') setResult('idle'); }}
          onKeyDown={e => { if (e.key === 'Enter') result === 'idle' ? check() : generate(); e.stopPropagation(); }}
          placeholder={`Type in ${toLang}…`}
          disabled={result !== 'idle'}
          autoComplete="off"
        />
      )}

      {/* Actions */}
      {result === 'idle' && ready && (
        <div className="tquiz-actions">
          <button className="conj-btn" onClick={check} disabled={!answer.trim()}>Check</button>
        </div>
      )}

      {result === 'correct' && (
        <div className="tquiz-feedback tquiz-feedback--correct">
          <span className="quiz-result-correct">Correct!</span>
          {quiz!.note && <span className="tquiz-note">{quiz!.note}</span>}
          <button className="conj-btn" onClick={generate} disabled={loading}>Next</button>
        </div>
      )}

      {result === 'wrong' && (
        <div className="tquiz-feedback tquiz-feedback--wrong">
          <span className="quiz-result-wrong">Incorrect</span>
          <span className="tquiz-correct-answer">Answer: <strong>{quiz!.answer}</strong></span>
          {quiz!.note && <span className="tquiz-note">{quiz!.note}</span>}
          <div className="tquiz-actions">
            <button className="conj-btn" onClick={generate} disabled={loading}>Next</button>
            <button className="tquiz-accept-btn" onClick={acceptAnyway}>Accept as correct</button>
          </div>
        </div>
      )}

      {!ready && (
        <button className="conj-btn tquiz-start-btn" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : 'Start'}
        </button>
      )}

    </div>
  );
}
