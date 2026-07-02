import type { Guess } from '../api/client';

interface OpponentProgressProps {
  guesses: Guess[];
  opponentName: string;
}

export function OpponentProgress({ guesses, opponentName }: OpponentProgressProps) {
  return (
    <div className="opponent-section">
      <div className="section-label">{opponentName}</div>
      <div className="card">
        {guesses.length === 0 ? (
          <p className="guess-empty">No guesses yet</p>
        ) : (
          <div className="opponent-list">
            {guesses.map((g, i) => (
              <div key={i} className={`opponent-row ${g.isWinningGuess ? 'opponent-winner' : ''}`}>
                <span className="opponent-word">{g.guessWord}</span>
                <span className="opponent-badge">{g.matchCount}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
