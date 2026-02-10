/**
 * Word list loader for AI opponent
 */

import { words } from './words.js';

export function getCommonWords(): string[] {
  return words.common.map(w => w.toUpperCase());
}

export function getValidWords(): string[] {
  return words.valid.map(w => w.toUpperCase());
}

export function isValidDictionaryWord(word: string): boolean {
  const normalized = word.toUpperCase();
  return words.valid.includes(normalized);
}
