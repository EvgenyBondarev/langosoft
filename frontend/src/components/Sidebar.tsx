import type { Feature } from '../types';

interface Props {
  activeFeature: Feature;
  onFeatureChange: (f: Feature) => void;
}

const ITEMS: { id: Feature; icon: string; label: string }[] = [
  { id: 'reader',     icon: '📖', label: 'Parallel Texts' },
  { id: 'conjugator', icon: '🔤', label: 'Conjugator' },
  { id: 'accent',     icon: '🎵', label: 'Accent Builder' },
];

export default function Sidebar({ activeFeature, onFeatureChange }: Props) {
  return (
    <aside className="sidebar">
      {ITEMS.map(({ id, icon, label }) => (
        <button
          key={id}
          className={`sidebar-btn ${activeFeature === id ? 'sidebar-btn--active' : ''}`}
          onClick={() => onFeatureChange(id)}
        >
          <span className="sidebar-icon">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </aside>
  );
}
