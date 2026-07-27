import { useState, useRef } from 'react';
import { conjugateVerb, buildNounPhrase, fetchQuiz } from '../services/api';
import type { QuizItem } from '../types';

type ConjTab = 'verb' | 'noun' | 'quiz';
type QuizResult = 'idle' | 'correct' | 'wrong';

const LANGUAGES = [
  'Italian', 'French', 'Spanish', 'German', 'Portuguese',
  'Russian', 'Dutch', 'Swedish', 'Norwegian', 'Polish',
  'Czech', 'Hungarian', 'Romanian', 'Bulgarian', 'Ukrainian',
  'Finnish', 'Danish', 'Greek',
];

function speakText(text: string) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

export default function Conjugator() {
  const [tab, setTab] = useState<ConjTab>('verb');

  // ── Verb Forms ──────────────────────────────────────────────────────────────
  const [verbLang, setVerbLang]       = useState('Italian');
  const [verb, setVerb]               = useState('');
  const [verbResult, setVerbResult]   = useState('');
  const [verbLoading, setVerbLoading] = useState(false);

  // ── Noun Phrase ─────────────────────────────────────────────────────────────
  const [nounLang, setNounLang]       = useState('Italian');
  const [noun, setNoun]               = useState('');
  const [gender, setGender]           = useState('Masculine');
  const [plurality, setPlurality]     = useState('Singular');
  const [article, setArticle]         = useState('Definite');
  const [adjective, setAdjective]     = useState('');
  const [nounResult, setNounResult]   = useState('');
  const [nounLoading, setNounLoading] = useState(false);

  // ── Quiz ────────────────────────────────────────────────────────────────────
  const [quizLang, setQuizLang]       = useState('Italian');
  const [quizMode, setQuizMode]       = useState<'verb' | 'noun' | 'random'>('random');
  const [currentQuiz, setCurrentQuiz] = useState<QuizItem | null>(null);
  const [userAnswer, setUserAnswer]   = useState('');
  const [quizResult, setQuizResult]   = useState<QuizResult>('idle');
  const [quizLoading, setQuizLoading] = useState(false);
  const answerRef = useRef<HTMLInputElement>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleConjugate = async () => {
    if (!verb.trim() || verbLoading) return;
    setVerbLoading(true);
    setVerbResult('');
    setVerbResult(await conjugateVerb(verbLang, verb.trim()));
    setVerbLoading(false);
  };

  const handleNounPhrase = async () => {
    if (!noun.trim() || nounLoading) return;
    setNounLoading(true);
    setNounResult('');
    setNounResult(await buildNounPhrase(nounLang, noun.trim(), gender, plurality, article, adjective.trim()));
    setNounLoading(false);
  };

  const handleGenerateQuiz = async () => {
    setQuizLoading(true);
    setCurrentQuiz(null);
    setUserAnswer('');
    setQuizResult('idle');
    try {
      const quiz = await fetchQuiz(quizLang, quizMode);
      setCurrentQuiz(quiz);
      setTimeout(() => answerRef.current?.focus(), 50);
    } catch {
      setCurrentQuiz({ prompt: 'Could not generate question — please try again.', answer: '', note: '' });
    }
    setQuizLoading(false);
  };

  const handleCheckAnswer = () => {
    if (!currentQuiz?.answer || !userAnswer.trim()) return;
    const correct = userAnswer.trim().toLowerCase() === currentQuiz.answer.trim().toLowerCase();
    setQuizResult(correct ? 'correct' : 'wrong');
    if (correct) {
      speakText('Correct!');
    } else {
      speakText(`Incorrect. The answer is ${currentQuiz.answer}.`);
    }
  };

  const handleNextQuiz = () => handleGenerateQuiz();

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="conj-tabs">
        <button className={`conj-tab ${tab === 'verb' ? 'conj-tab--active' : ''}`} onClick={() => setTab('verb')}>
          Verb Forms
        </button>
        <button className={`conj-tab ${tab === 'noun' ? 'conj-tab--active' : ''}`} onClick={() => setTab('noun')}>
          Noun Phrase
        </button>
        <button className={`conj-tab ${tab === 'quiz' ? 'conj-tab--active' : ''}`} onClick={() => setTab('quiz')}>
          Quiz
        </button>
      </div>

      {tab === 'verb' && (
        <div className="conj-form">
          <div>
            <div className="conj-label">Language</div>
            <select className="conj-select" value={verbLang} onChange={e => setVerbLang(e.target.value)}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="conj-label">Verb (infinitive)</div>
            <input
              className="conj-input"
              value={verb}
              onChange={e => setVerb(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConjugate(); e.stopPropagation(); }}
              placeholder="e.g. essere, avoir, sein…"
            />
          </div>
          <button className="conj-btn" onClick={handleConjugate} disabled={verbLoading || !verb.trim()}>
            {verbLoading ? 'Working…' : 'Conjugate'}
          </button>
          {verbResult && <pre className="conj-result">{verbResult}</pre>}
        </div>
      )}

      {tab === 'noun' && (
        <div className="conj-form">
          <div>
            <div className="conj-label">Language</div>
            <select className="conj-select" value={nounLang} onChange={e => setNounLang(e.target.value)}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <div className="conj-label">Noun</div>
            <input
              className="conj-input"
              value={noun}
              onChange={e => setNoun(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="e.g. libro, homme, Buch…"
            />
          </div>
          <div className="conj-row">
            <div style={{ flex: 1 }}>
              <div className="conj-label">Gender</div>
              <select className="conj-select conj-select--full" value={gender} onChange={e => setGender(e.target.value)}>
                <option>Masculine</option>
                <option>Feminine</option>
                <option>Neuter</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div className="conj-label">Number</div>
              <select className="conj-select conj-select--full" value={plurality} onChange={e => setPlurality(e.target.value)}>
                <option>Singular</option>
                <option>Plural</option>
              </select>
            </div>
          </div>
          <div>
            <div className="conj-label">Article</div>
            <select className="conj-select" value={article} onChange={e => setArticle(e.target.value)}>
              <option>Definite</option>
              <option>Indefinite</option>
              <option>Demonstrative</option>
              <option>Possessive</option>
              <option>None</option>
            </select>
          </div>
          <div>
            <div className="conj-label">Adjective (optional)</div>
            <input
              className="conj-input"
              value={adjective}
              onChange={e => setAdjective(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              placeholder="e.g. grande, beau, schön…"
            />
          </div>
          <button className="conj-btn" onClick={handleNounPhrase} disabled={nounLoading || !noun.trim()}>
            {nounLoading ? 'Working…' : 'Build Phrase'}
          </button>
          {nounResult && <pre className="conj-result">{nounResult}</pre>}
        </div>
      )}

      {tab === 'quiz' && (
        <div className="conj-form">
          <div className="conj-row">
            <div style={{ flex: 2 }}>
              <div className="conj-label">Language</div>
              <select className="conj-select conj-select--full" value={quizLang} onChange={e => setQuizLang(e.target.value)}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <div className="conj-label">Mode</div>
              <select className="conj-select conj-select--full" value={quizMode} onChange={e => setQuizMode(e.target.value as typeof quizMode)}>
                <option value="random">Random</option>
                <option value="verb">Verb Conjugation</option>
                <option value="noun">Noun Phrase</option>
              </select>
            </div>
          </div>

          <button className="conj-btn" onClick={handleGenerateQuiz} disabled={quizLoading}>
            {quizLoading ? 'Generating…' : currentQuiz ? 'New Question' : 'Generate Question'}
          </button>

          {currentQuiz && currentQuiz.answer && (
            <div className="quiz-card">
              <div className="quiz-prompt">{currentQuiz.prompt}</div>

              <input
                ref={answerRef}
                className={`conj-input quiz-answer-input ${
                  quizResult === 'correct' ? 'quiz-input--correct' :
                  quizResult === 'wrong'   ? 'quiz-input--wrong'   : ''
                }`}
                value={userAnswer}
                onChange={e => { setUserAnswer(e.target.value); setQuizResult('idle'); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    quizResult !== 'idle' ? handleNextQuiz() : handleCheckAnswer();
                  }
                  e.stopPropagation();
                }}
                placeholder="Your answer…"
                disabled={quizResult !== 'idle'}
              />

              {quizResult === 'idle' && (
                <button className="conj-btn" onClick={handleCheckAnswer} disabled={!userAnswer.trim()}>
                  Check
                </button>
              )}

              {quizResult === 'correct' && (
                <div>
                  <div className="quiz-result-correct">Correct!</div>
                  <div className="quiz-correct-note">{currentQuiz.note}</div>
                  <button className="conj-btn" onClick={handleNextQuiz}>Next</button>
                </div>
              )}

              {quizResult === 'wrong' && (
                <div>
                  <div className="quiz-result-wrong">Incorrect.</div>
                  <div className="quiz-correct-answer">Answer: {currentQuiz.answer}</div>
                  <div className="quiz-correct-note">{currentQuiz.note}</div>
                  <button className="conj-btn" onClick={handleNextQuiz}>Next</button>
                </div>
              )}
            </div>
          )}

          {currentQuiz && !currentQuiz.answer && (
            <div className="quiz-card">
              <div className="quiz-prompt">{currentQuiz.prompt}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
