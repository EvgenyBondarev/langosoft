import { useState, useRef } from 'react';

const LANGUAGES = [
  { code: 'it-IT', label: 'Italian' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'pt-PT', label: 'Portuguese' },
  { code: 'ru-RU', label: 'Russian' },
  { code: 'nl-NL', label: 'Dutch' },
  { code: 'sv-SE', label: 'Swedish' },
  { code: 'no-NO', label: 'Norwegian' },
  { code: 'pl-PL', label: 'Polish' },
  { code: 'cs-CZ', label: 'Czech' },
  { code: 'hu-HU', label: 'Hungarian' },
  { code: 'ro-RO', label: 'Romanian' },
  { code: 'bg-BG', label: 'Bulgarian' },
  { code: 'uk-UA', label: 'Ukrainian' },
  { code: 'fi-FI', label: 'Finnish' },
  { code: 'da-DK', label: 'Danish' },
  { code: 'el-GR', label: 'Greek' },
];

export default function AccentBuilder() {
  const [text, setText]     = useState('');
  const [lang, setLang]     = useState('it-IT');
  const [rate, setRate]     = useState(1.0);
  const [playing, setPlaying] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const play = () => {
    if (!text.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.onend  = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    utterRef.current = u;
    setPlaying(true);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  const rateLabel = rate >= 1
    ? '1× (normal)'
    : `${rate.toFixed(2)}× — ${(1 / rate).toFixed(1)}× slower`;

  return (
    <div className="accent-builder">
      <div>
        <div className="conj-label">Text to speak</div>
        <textarea
          className="accent-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.stopPropagation()}
          placeholder="Type or paste words / phrases here…"
          rows={4}
        />
      </div>

      <div className="accent-controls">
        <div>
          <div className="conj-label">Language</div>
          <select className="conj-select" value={lang} onChange={e => setLang(e.target.value)}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        <div>
          <div className="conj-label">Speed: {rateLabel}</div>
          <div className="accent-slider-row">
            <span className="accent-rate-edge">slow</span>
            <input
              type="range"
              className="accent-slider"
              min={0.1}
              max={1.0}
              step={0.05}
              value={rate}
              onChange={e => setRate(Number(e.target.value))}
            />
            <span className="accent-rate-edge">1×</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="accent-play-btn" onClick={play} disabled={playing || !text.trim()}>
          ▶ Play
        </button>
        <button className="accent-stop-btn" onClick={stop} disabled={!playing}>
          ■ Stop
        </button>
      </div>

      <p className="accent-tip">
        Move the slider left to slow speech down up to 10× for accent drilling.
        Browser TTS rate range is 0.1–1.0; voice availability depends on your OS.
      </p>
    </div>
  );
}
