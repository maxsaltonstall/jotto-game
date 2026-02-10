/**
 * Component for submitting a guess
 */

import { useState } from 'react';

interface GuessInputProps {
  onSubmit: (word: string) => Promise<void>;
  disabled: boolean;
  onGuessChange?: (guess: string) => void;
}

export function GuessInput({ onSubmit, disabled, onGuessChange }: GuessInputProps) {
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (guess.length !== 5) {
      setError('Guess must be exactly 5 letters');
      return;
    }

    if (!/^[a-zA-Z]+$/.test(guess)) {
      setError('Guess must contain only letters');
      return;
    }

    setLoading(true);

    try {
      await onSubmit(guess);
      setGuess('');
      onGuessChange?.('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit guess');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="guess-input">
      <input
        type="text"
        value={guess}
        onChange={(e) => {
          const newGuess = e.target.value.toUpperCase();
          setGuess(newGuess);
          onGuessChange?.(newGuess);
        }}
        maxLength={5}
        placeholder="Enter your guess"
        disabled={disabled || loading}
        autoComplete="off"
      />
      <button type="submit" disabled={disabled || loading || guess.length !== 5}>
        {loading ? 'Submitting...' : 'Guess'}
      </button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
