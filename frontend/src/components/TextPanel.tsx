import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { Panel } from '../types';

export type TextPanelHandle = { setScrollTop: (top: number) => void };

interface Props {
  lines: string[];
  lang: Panel;
  label: string;
  activePanel: Panel;
  lineIndex: number;
  wordIndex: number;
  letterIndex: number;
  selectionMode: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
  onScroll?: (top: number) => void;
}

const TextPanel = forwardRef<TextPanelHandle, Props>(function TextPanel({
  lines, lang, label, activePanel,
  lineIndex, wordIndex, letterIndex,
  selectionMode, selectionStart, selectionEnd,
  onScroll,
}, ref) {
  const lineRef      = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const isActive     = lang === activePanel;

  useImperativeHandle(ref, () => ({
    setScrollTop: (top) => {
      if (!containerRef.current) return;
      isSyncingRef.current = true;
      containerRef.current.scrollTop = top;
      isSyncingRef.current = false;
    },
  }));

  useEffect(() => {
    lineRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [lineIndex]);

  const handleScroll = onScroll
    ? (e: React.UIEvent<HTMLDivElement>) => {
        if (!isSyncingRef.current) onScroll(e.currentTarget.scrollTop);
      }
    : undefined;

  return (
    <div className={`text-panel ${isActive ? 'text-panel--active' : ''}`}>
      <div className="panel-label">
        {label}
        {isActive && <span className="panel-active-badge"> ▶ ACTIVE</span>}
      </div>
      <div className="panel-lines" ref={containerRef} onScroll={handleScroll}>
        {lines.map((line, li) => {
          const isCurrent = li === lineIndex;
          if (!isCurrent) {
            return (
              <div key={li} className="line">
                {line || <span className="empty-line">—</span>}
              </div>
            );
          }

          const words = line.split(/(\s+)/);
          let wordCounter = 0;

          return (
            <div key={li} className="line line--current" ref={lineRef}>
              {words.map((chunk, ci) => {
                if (/^\s+$/.test(chunk)) return <span key={ci}>{chunk}</span>;

                const wi = wordCounter++;
                const isCurrentWord = isActive && wi === wordIndex;
                const isSelected = selectionMode &&
                  selectionStart !== null &&
                  selectionEnd !== null &&
                  wi >= Math.min(selectionStart, selectionEnd) &&
                  wi <= Math.max(selectionStart, selectionEnd);

                if (isCurrentWord) {
                  const letters = chunk.split('');
                  return (
                    <span key={ci} className={`word word--current ${isSelected ? 'word--selected' : ''}`}>
                      {letters.map((ch, li2) => (
                        <span key={li2} className={isActive && li2 === letterIndex ? 'letter--current' : ''}>
                          {ch}
                        </span>
                      ))}
                    </span>
                  );
                }

                return (
                  <span key={ci} className={`word ${isSelected ? 'word--selected' : ''}`}>
                    {chunk}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default TextPanel;
