import { useState, useCallback } from 'react';
import type { NavState } from '../types';

const INIT: NavState = {
  panel: 'en',
  canticle: 0,
  canto: 0,
  line: 0,
  word: 0,
  letter: 0,
  selectionMode: false,
  selectionStart: null,
  selectionEnd: null,
};

export function useNavigation() {
  const [nav, setNav] = useState<NavState>(INIT);

  const togglePanel = useCallback(() =>
    setNav(s => ({ ...s, panel: s.panel === 'it' ? 'en' : 'it' })), []);

  const nextLine = useCallback((max: number) =>
    setNav(s => ({
      ...s,
      line: Math.min(s.line + 1, max),
      word: 0, letter: 0,
      selectionMode: false, selectionStart: null, selectionEnd: null,
    })), []);

  const prevLine = useCallback(() =>
    setNav(s => ({
      ...s,
      line: Math.max(s.line - 1, 0),
      word: 0, letter: 0,
      selectionMode: false, selectionStart: null, selectionEnd: null,
    })), []);

  const nextWord = useCallback((maxWord: number) =>
    setNav(s => {
      if (s.selectionMode && s.selectionStart !== null) {
        const next = Math.min((s.selectionEnd ?? s.selectionStart) + 1, maxWord);
        return { ...s, selectionEnd: next };
      }
      return { ...s, word: Math.min(s.word + 1, maxWord), letter: 0 };
    }), []);

  const prevWord = useCallback(() =>
    setNav(s => {
      if (s.selectionMode && s.selectionStart !== null) {
        const prev = Math.max((s.selectionEnd ?? s.selectionStart) - 1, s.selectionStart);
        return { ...s, selectionEnd: prev };
      }
      return { ...s, word: Math.max(s.word - 1, 0), letter: 0 };
    }), []);

  const nextLetter = useCallback((maxLetter: number) =>
    setNav(s => ({ ...s, letter: Math.min(s.letter + 1, maxLetter) })), []);

  const prevLetter = useCallback(() =>
    setNav(s => ({ ...s, letter: Math.max(s.letter - 1, 0) })), []);

  const startSelection = useCallback(() =>
    setNav(s => ({
      ...s,
      selectionMode: true,
      selectionStart: s.word,
      selectionEnd: s.word,
    })), []);

  const cancelSelection = useCallback(() =>
    setNav(s => ({
      ...s,
      selectionMode: false,
      selectionStart: null,
      selectionEnd: null,
    })), []);

  const nextCanto = useCallback((maxCanto: number, maxCanticle: number) =>
    setNav(s => {
      const reset = { line: 0, word: 0, letter: 0, selectionMode: false as const, selectionStart: null, selectionEnd: null };
      if (s.canto < maxCanto) return { ...s, ...reset, canto: s.canto + 1 };
      if (s.canticle < maxCanticle) return { ...s, ...reset, canticle: s.canticle + 1, canto: 0 };
      return s;
    }), []);

  const prevCanto = useCallback(() =>
    setNav(s => {
      const reset = { line: 0, word: 0, letter: 0, selectionMode: false as const, selectionStart: null, selectionEnd: null };
      if (s.canto > 0) return { ...s, ...reset, canto: s.canto - 1 };
      if (s.canticle > 0) return { ...s, ...reset, canticle: s.canticle - 1, canto: 0 };
      return s;
    }), []);

  return {
    nav, setNav,
    togglePanel,
    nextLine, prevLine,
    nextWord, prevWord,
    nextLetter, prevLetter,
    startSelection, cancelSelection,
    nextCanto, prevCanto,
  };
}
