export type Panel = 'it' | 'en';
export type AppMode = 'normal' | 'question' | 'response';
export type Feature = 'reader' | 'verb' | 'noun' | 'quiz' | 'accent';

export interface CantoData {
  canticleName: string;
  cantoName: string;
  italian: string[];
  english: string[];
}

export interface NavState {
  panel: Panel;
  canticle: number;
  canto: number;
  line: number;
  word: number;
  letter: number;
  selectionMode: boolean;
  selectionStart: number | null;
  selectionEnd: number | null;
}

export interface BookInfo {
  id: string;
  title: string;
  author: string;
  language: string;
  langCode: string;
  supported: boolean;
}

export interface Structure {
  canticleCount: number;
  cantosPerCanticle: number[];
  canticleNames: string[];
}

export interface QuizItem {
  prompt: string;
  answer: string;
  note: string;
}
