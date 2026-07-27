import type { Feature, ConjMode } from '../types';

interface Props {
  activeFeature: Feature;
  conjMode: ConjMode;
  onFeatureChange: (f: Feature) => void;
  onConjModeChange: (m: ConjMode) => void;
}

export default function Sidebar({ activeFeature, conjMode, onFeatureChange, onConjModeChange }: Props) {
  return (
    <aside className="sidebar">
      <button
        className={`sidebar-btn ${activeFeature === 'reader' ? 'sidebar-btn--active' : ''}`}
        onClick={() => onFeatureChange('reader')}
      >
        <span className="sidebar-icon">📖</span>
        <span>Parallel Texts</span>
      </button>

      <button
        className={`sidebar-btn ${activeFeature === 'conjugator' ? 'sidebar-btn--active' : ''}`}
        onClick={() => onFeatureChange('conjugator')}
      >
        <span className="sidebar-icon">🔤</span>
        <span>Conjugator</span>
      </button>

      {activeFeature === 'conjugator' && (
        <div className="sidebar-subitems">
          <button
            className={`sidebar-sub-btn ${conjMode === 'pronoun-verb' ? 'sidebar-sub-btn--active' : ''}`}
            onClick={() => onConjModeChange('pronoun-verb')}
          >
            Pronoun + Verb
          </button>
          <button
            className={`sidebar-sub-btn ${conjMode === 'id-adj-noun' ? 'sidebar-sub-btn--active' : ''}`}
            onClick={() => onConjModeChange('id-adj-noun')}
          >
            Identifier + Adjective + Noun
          </button>
        </div>
      )}

      <button
        className={`sidebar-btn ${activeFeature === 'accent' ? 'sidebar-btn--active' : ''}`}
        onClick={() => onFeatureChange('accent')}
      >
        <span className="sidebar-icon">🎵</span>
        <span>Accent Builder</span>
      </button>
    </aside>
  );
}
