import { useState } from 'react';
import { conjugateVerb } from '../services/api';

const LANGUAGES = [
  'Bulgarian', 'Czech', 'Danish', 'Dutch', 'Finnish', 'French',
  'German', 'Greek', 'Hungarian', 'Italian', 'Norwegian', 'Polish',
  'Portuguese', 'Romanian', 'Russian', 'Spanish', 'Swedish', 'Ukrainian',
];

export default function VerbForms() {
  const [lang, setLang]       = useState('Italian');
  const [verb, setVerb]       = useState('');
  const [result, setResult]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!verb.trim() || loading) return;
    setLoading(true);
    setResult('');
    setResult(await conjugateVerb(lang, verb.trim()));
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
        <div className="conj-label">Verb (infinitive)</div>
        <input
          className="conj-input"
          value={verb}
          onChange={e => setVerb(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handle(); e.stopPropagation(); }}
          placeholder="e.g. essere, avoir, sein…"
        />
      </div>
      <button className="conj-btn" onClick={handle} disabled={loading || !verb.trim()}>
        {loading ? 'Working…' : 'Conjugate'}
      </button>
      {result && <pre className="conj-result">{result}</pre>}
    </div>
  );
}
