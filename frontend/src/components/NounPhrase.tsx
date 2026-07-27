import { useState } from 'react';
import { buildNounPhrase } from '../services/api';

const LANGUAGES = [
  'Bulgarian', 'Czech', 'Danish', 'Dutch', 'Finnish', 'French',
  'German', 'Greek', 'Hungarian', 'Italian', 'Norwegian', 'Polish',
  'Portuguese', 'Romanian', 'Russian', 'Spanish', 'Swedish', 'Ukrainian',
];

export default function NounPhrase() {
  const [lang, setLang]           = useState('Italian');
  const [noun, setNoun]           = useState('');
  const [gender, setGender]       = useState('Masculine');
  const [plurality, setPlurality] = useState('Singular');
  const [article, setArticle]     = useState('Definite');
  const [adjective, setAdjective] = useState('');
  const [result, setResult]       = useState('');
  const [loading, setLoading]     = useState(false);

  const handle = async () => {
    if (!noun.trim() || loading) return;
    setLoading(true);
    setResult('');
    setResult(await buildNounPhrase(lang, noun.trim(), gender, plurality, article, adjective.trim()));
    setLoading(false);
  };

  return (
    <div className="conj-form">
      <div>
        <div className="conj-label">Language</div>
        <select className="conj-select" value={lang} onChange={e => setLang(e.target.value)}>
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
      <button className="conj-btn" onClick={handle} disabled={loading || !noun.trim()}>
        {loading ? 'Working…' : 'Build Phrase'}
      </button>
      {result && <pre className="conj-result">{result}</pre>}
    </div>
  );
}
