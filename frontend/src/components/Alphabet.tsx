/**
 * Alphabet component - shows letter usage and status
 */

import { Guess } from '../api/client';

interface AlphabetProps {
  guesses: Guess[];
  currentGuess?: string;
}

type LetterState = 'unused' | 'used' | 'excluded' | 'confirmed' | 'pending';

export function Alphabet({ guesses, currentGuess = '' }: AlphabetProps) {
  // Desktop: 2 rows
  const desktopRows = [
    'ABCDEFGHIJKLM'.split(''),
    'NOPQRSTUVWXYZ'.split('')
  ];

  // Mobile: 6 rows of 4-5 letters each
  const mobileRows = [
    'ABCD'.split(''),
    'EFGH'.split(''),
    'IJKL'.split(''),
    'MNOP'.split(''),
    'QRSTU'.split(''),
    'VWXYZ'.split('')
  ];

  // Calculate the state and usage count of each letter
  const getLetterInfo = (letter: string): { state: LetterState; count: number } => {
    let count = 0;
    let excluded = false;
    let confirmed = false;

    // Check if this letter is in the current guess being typed
    const isInCurrentGuess = currentGuess.toUpperCase().includes(letter);

    for (const guess of guesses) {
      const guessWord = guess.guessWord.toUpperCase();

      // Count occurrences of this letter in the guess
      for (const char of guessWord) {
        if (char === letter) {
          count++;
        }
      }

      if (guessWord.includes(letter)) {
        // If this guess had 5 matches (winning guess), these letters are confirmed
        if (guess.matchCount === 5) {
          confirmed = true;
        }

        // If this guess had 0 matches, all letters in it are excluded
        if (guess.matchCount === 0) {
          excluded = true;
        }
      }
    }

    let state: LetterState = 'unused';
    if (confirmed) state = 'confirmed';
    else if (excluded) state = 'excluded';
    else if (count > 0) state = 'used';

    // Override with pending state if currently being typed
    if (isInCurrentGuess && !confirmed) {
      state = 'pending';
    }

    return { state, count };
  };

  const renderLetter = (letter: string) => {
    const { state, count } = getLetterInfo(letter);
    const displayDots = Math.min(count, 5); // Max 5 dots

    return (
      <span key={letter} className={`letter letter-${state}`} data-letter={letter}>
        <span className="letter-char">{letter}</span>
        {count > 0 && (
          <span className="letter-dots">
            {Array.from({ length: displayDots }).map((_, i) => (
              <span key={i} className="dot" />
            ))}
          </span>
        )}
      </span>
    );
  };

  return (
    <>
      {/* Desktop layout - 2 rows */}
      <div className="alphabet alphabet-desktop">
        {desktopRows.map((row, i) => (
          <div key={`desktop-${i}`} className="alphabet-row">
            {row.map(renderLetter)}
          </div>
        ))}
      </div>

      {/* Mobile layout - 6 rows */}
      <div className="alphabet alphabet-mobile">
        {mobileRows.map((row, i) => (
          <div key={`mobile-${i}`} className="alphabet-row">
            {row.map(renderLetter)}
          </div>
        ))}
      </div>
    </>
  );
}
