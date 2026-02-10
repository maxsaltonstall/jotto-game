/**
 * Post-game summary component - shows stats after game ends
 */

import { useAuth } from '../contexts/AuthContext';
import type { Game } from '../api/client';

interface PostGameSummaryProps {
  game: Game;
  playerId: string;
  guessCount: number;
  onPlayAgain: () => void;
}

export function PostGameSummary({ game, playerId, guessCount, onPlayAgain }: PostGameSummaryProps) {
  const { isAuthenticated, stats } = useAuth();
  const isWinner = game.winnerId === playerId;
  const opponentName = game.player1Id === playerId ? game.player2Name : game.player1Name;

  return (
    <div className="post-game-summary">
      <div className="summary-card">
        <h3>{isWinner ? '🎉 You Won!' : '😔 You Lost'}</h3>

        {isWinner && (
          <div className="winner-stats">
            <p className="guess-count">You solved it in <strong>{guessCount} guesses</strong>!</p>

            {isAuthenticated && stats && (
              <div className="user-stats">
                <h4>Your Stats:</h4>
                <div className="stats-grid">
                  <div className="stat">
                    <span className="stat-value">{stats.totalWins}</span>
                    <span className="stat-label">Total Wins</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{stats.totalGames}</span>
                    <span className="stat-label">Total Games</span>
                  </div>
                  <div className="stat highlight">
                    <span className="stat-value">{stats.averageGuessesToWin.toFixed(1)}</span>
                    <span className="stat-label">Avg Guesses/Win</span>
                  </div>
                </div>
              </div>
            )}

            {!isAuthenticated && (
              <p className="auth-prompt">
                💡 <strong>Register an account</strong> to track your stats across games!
              </p>
            )}
          </div>
        )}

        {!isWinner && (
          <div className="loser-stats">
            <p>Better luck next time! {opponentName || 'Your opponent'} won this round.</p>
          </div>
        )}

        <button onClick={onPlayAgain} className="play-again-button">
          Play Again
        </button>
      </div>
    </div>
  );
}
