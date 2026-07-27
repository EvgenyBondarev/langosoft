import type { BookInfo, QuizItem } from '../types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000/api';

export interface CantoResponse {
  canticleName: string;
  cantoName: string;
  italian: string[];
  english: string[];
}

export interface StructureResponse {
  canticleCount: number;
  cantosPerCanticle: number[];
  canticleNames: string[];
}

export async function fetchCanto(book: string, canticle: number, canto: number): Promise<CantoResponse> {
  const r = await fetch(`${BASE}/text/canto?book=${book}&canticle=${canticle}&canto=${canto}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchStatus(book = 'dante'): Promise<{ ready: boolean }> {
  const r = await fetch(`${BASE}/text/status?book=${book}`);
  return r.json();
}

export async function fetchStructure(book: string): Promise<StructureResponse> {
  const r = await fetch(`${BASE}/text/structure?book=${book}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchBooks(): Promise<BookInfo[]> {
  const r = await fetch(`${BASE}/text/books`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchQuiz(language: string, mode: string, fromLanguage = 'English'): Promise<QuizItem> {
  const r = await fetch(`${BASE}/ai/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, mode, fromLanguage }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function translateText(text: string, from: string, to: string): Promise<string> {
  const r = await fetch(`${BASE}/ai/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, fromLang: from, toLang: to }),
  });
  const data = await r.json();
  return data.answer as string;
}

export async function askQuestion(question: string, context: string): Promise<string> {
  const r = await fetch(`${BASE}/ai/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, context }),
  });
  const data = await r.json();
  return data.answer as string;
}

export async function grammarBreakdown(word: string, context: string, language: string, bookTitle: string): Promise<string> {
  const r = await fetch(`${BASE}/ai/grammar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word, context, language, bookTitle }),
  });
  const data = await r.json();
  return data.answer as string;
}

export async function conjugateVerb(language: string, verb: string): Promise<string> {
  const r = await fetch(`${BASE}/ai/conjugate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, verb }),
  });
  const data = await r.json();
  return data.answer as string;
}

export async function buildNounPhrase(
  language: string, noun: string, gender: string,
  number: string, article: string, adjective: string
): Promise<string> {
  const r = await fetch(`${BASE}/ai/nounphrase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language, noun, gender, number, article, adjective }),
  });
  const data = await r.json();
  return data.answer as string;
}
