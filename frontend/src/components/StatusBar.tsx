import type { NavState } from '../types';

interface Props {
  nav: NavState;
  canticleName: string;
  cantoName: string;
  loading: boolean;
  backendReady: boolean;
}

const CANTICLE_EMOJI = ['🔥', '🌿', '✨'];

export default function StatusBar({ nav, canticleName, cantoName, loading, backendReady }: Props) {
  const emoji = CANTICLE_EMOJI[nav.canticle] ?? '📖';
  return (
    <div className="status-bar">
      <span className="status-pos">
        {emoji} {canticleName} · {cantoName} · Line {nav.line + 1} · Word {nav.word + 1} · Letter {nav.letter + 1}
      </span>
      <span className="status-panel">
        Panel: <strong>{nav.panel === 'it' ? 'Italiano' : 'English'}</strong>
      </span>
      {nav.selectionMode && (
        <span className="status-selection">
          🔲 Selecting words {(nav.selectionStart ?? 0) + 1}–{(nav.selectionEnd ?? nav.selectionStart ?? 0) + 1}
        </span>
      )}
      {loading && <span className="status-loading">Loading…</span>}
      {!backendReady && !loading && (
        <span className="status-error">Backend not ready — check http://localhost:5000</span>
      )}
      <span className="status-shortcuts">
        F=panel · 8=line · 5=word · 2=letter · 4/6=word · 7/9=line · A=select · D=translate · G=grammar · S=ask
      </span>
    </div>
  );
}
