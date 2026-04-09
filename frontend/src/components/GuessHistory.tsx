import type { Guess } from '../api/client';

interface GuessHistoryProps {
  guesses: Guess[];
}

export function GuessHistory({ guesses }: GuessHistoryProps) {
  if (guesses.length === 0) {
    return <p className="guess-empty">No guesses yet</p>;
  }

  return (
    <div className="guess-list">
      {guesses.map((g, i) => (
        <div key={i} className={`guess-row ${g.isWinningGuess ? 'guess-winner' : ''}`}>
          <div className="guess-tiles">
            {g.guessWord.split('').map((letter, j) => (
              <span key={j} className="guess-tile">{letter}</span>
            ))}
          </div>
          <div className={`guess-badge ${g.matchCount === 5 ? 'guess-badge-win' : ''}`}>
            {g.matchCount}
          </div>
        </div>
      ))}
    </div>
  );
}
