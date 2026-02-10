import { describe, it, expect } from 'vitest';
import { countCommonLetters, isValidWord, normalizeWord } from '../src/utils/letterMatcher';

describe('countCommonLetters', () => {
  it('counts exact matches correctly', () => {
    expect(countCommonLetters('CHARM', 'CHARM')).toBe(5);
  });

  it('counts partial matches correctly', () => {
    expect(countCommonLetters('BREAD', 'CHARM')).toBe(2); // R, A
    expect(countCommonLetters('BEAST', 'CHARM')).toBe(1); // A
  });

  it('handles duplicate letters correctly', () => {
    expect(countCommonLetters('SPEED', 'CREEP')).toBe(3); // P (1), E (2) = 3 total
    expect(countCommonLetters('LOOKS', 'BOOKS')).toBe(4); // O, O, K, S
  });

  it('returns 0 for no matches', () => {
    expect(countCommonLetters('ABCDE', 'FGHIJ')).toBe(0);
  });

  it('is case insensitive', () => {
    expect(countCommonLetters('charm', 'CHARM')).toBe(5);
    expect(countCommonLetters('BrEaD', 'ChArM')).toBe(2);
  });

  it('handles repeated letters in guess', () => {
    expect(countCommonLetters('EERIE', 'BREAD')).toBe(2); // E, E (only 2 E's in BREAD)
  });
});

describe('isValidWord', () => {
  it('accepts valid 5-letter words', () => {
    expect(isValidWord('CHARM')).toBe(true);
    expect(isValidWord('BREAD')).toBe(true);
    expect(isValidWord('hello')).toBe(true);
  });

  it('rejects non-5-letter words', () => {
    expect(isValidWord('CAT')).toBe(false);
    expect(isValidWord('TOOLONG')).toBe(false);
    expect(isValidWord('')).toBe(false);
  });

  it('rejects words with non-letters', () => {
    expect(isValidWord('12345')).toBe(false);
    expect(isValidWord('HEL O')).toBe(false);
    expect(isValidWord('TEST!')).toBe(false);
  });

  it('rejects invalid inputs', () => {
    expect(isValidWord(null as any)).toBe(false);
    expect(isValidWord(undefined as any)).toBe(false);
    expect(isValidWord(123 as any)).toBe(false);
  });

  it('handles whitespace', () => {
    expect(isValidWord(' CHARM ')).toBe(true);
    expect(isValidWord('  HI  ')).toBe(false);
  });
});

describe('normalizeWord', () => {
  it('converts to uppercase', () => {
    expect(normalizeWord('charm')).toBe('CHARM');
    expect(normalizeWord('BrEaD')).toBe('BREAD');
  });

  it('trims whitespace', () => {
    expect(normalizeWord('  CHARM  ')).toBe('CHARM');
    expect(normalizeWord('\tBREAD\n')).toBe('BREAD');
  });

  it('handles already normalized words', () => {
    expect(normalizeWord('CHARM')).toBe('CHARM');
  });
});
