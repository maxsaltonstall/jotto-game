import { useState } from 'react';
import type { Guess } from '../api/client';
import '../styles/Alphabet.css';

interface AlphabetProps {
  guesses: Guess[];
  currentGuess?: string;
}

type LetterState = 'unused' | 'maybe' | 'confirmed' | 'eliminated' | 'pending';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CYCLE_ORDER: LetterState[] = ['unused', 'maybe', 'confirmed', 'eliminated'];

export function Alphabet({ guesses, currentGuess = '' }: AlphabetProps) {
  const [manualStates, setManualStates] = useState<Record<string, LetterState>>({});

  const getAutoState = (letter: string): LetterState => {
    let used = false;
    let excluded = false;
    let confirmed = false;

    for (const guess of guesses) {
      const word = guess.guessWord.toUpperCase();
      if (word.includes(letter)) {
        used = true;
        if (guess.matchCount === 5) confirmed = true;
        if (guess.matchCount === 0) excluded = true;
      }
    }

    if (confirmed) return 'confirmed';
    if (excluded) return 'eliminated';
    if (used) return 'maybe';
    return 'unused';
  };

  const getDisplayState = (letter: string): LetterState => {
    if (currentGuess.toUpperCase().includes(letter)) return 'pending';
    if (manualStates[letter]) return manualStates[letter];
    return getAutoState(letter);
  };

  const handleClick = (letter: string) => {
    const current = manualStates[letter] || getAutoState(letter);
    const currentIndex = CYCLE_ORDER.indexOf(current);
    const nextIndex = (currentIndex + 1) % CYCLE_ORDER.length;
    const next = CYCLE_ORDER[nextIndex];

    if (next === getAutoState(letter) && !manualStates[letter]) {
      const { [letter]: _, ...rest } = manualStates;
      setManualStates(rest);
    } else {
      setManualStates({ ...manualStates, [letter]: next });
    }
  };

  return (
    <div className="alphabet">
      <div className="alphabet-row">
        {LETTERS.map((letter) => {
          const state = getDisplayState(letter);
          return (
            <span
              key={letter}
              className={`letter letter-${state}`}
              onClick={() => handleClick(letter)}
              role="button"
              tabIndex={0}
              aria-label={`${letter}: ${state}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(letter); }}
            >
              {letter}
            </span>
          );
        })}
      </div>
      <p className="alphabet-hint">Click a letter to cycle: unused → maybe → confirmed → eliminated</p>
    </div>
  );
}
