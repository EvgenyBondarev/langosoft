import { useEffect, useRef } from 'react';
import type { AppMode } from '../types';

interface Props {
  mode: AppMode;
  question: string;
  response: string;
  responseLabel: string;
  onQuestionChange: (q: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export default function AIModal({
  mode, question, response, responseLabel,
  onQuestionChange, onSubmit, onClose,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'question') inputRef.current?.focus();
  }, [mode]);

  if (mode === 'normal') return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {mode === 'question' && (
          <>
            <div className="modal-title">Ask a question (S)</div>
            <div className="modal-hint">Type your question and press Enter</div>
            <input
              ref={inputRef}
              className="modal-input"
              value={question}
              onChange={e => onQuestionChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSubmit();
                if (e.key === 'Escape') onClose();
                e.stopPropagation();
              }}
              placeholder="e.g. What does 'selva' mean?"
            />
          </>
        )}
        {mode === 'response' && (
          <>
            <div className="modal-title">{responseLabel}</div>
            <div className="modal-response">{response}</div>
            <div className="modal-hint">Press any key or Escape to close</div>
          </>
        )}
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}
