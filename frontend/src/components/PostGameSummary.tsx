import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Confetti } from './Confetti';
import type { Game } from '../api/client';
import '../styles/animations.css';
import '../styles/PostGameSummary.css';

interface PostGameSummaryProps {
  game: Game;
  playerId: string;
  guessCount: number;
  onPlayAgain: () => void;
}

export function PostGameSummary({ game, playerId, guessCount, onPlayAgain }: PostGameSummaryProps) {
  const { isAuthenticated, stats } = useAuth();
  const [shareMsg, setShareMsg] = useState('');
  const isWinner = game.winnerId === playerId;
  const opponentName = game.player1Id === playerId ? game.player2Name : game.player1Name;
  const isAI = opponentName?.includes('AI') || opponentName?.includes('🤖');

  const handleShare = async () => {
    const text = isWinner
      ? `Jotto — Won in ${guessCount} guesses! Can you beat me? ${window.location.origin}`
      : `Jotto — Lost this round, but I'll get them next time! ${window.location.origin}`;
    await navigator.clipboard.writeText(text);
    setShareMsg('Copied!');
    setTimeout(() => setShareMsg(''), 2000);
  };

  return (
    <div className="post-game-summary">
      {isWinner && <Confetti />}

      <div className="summary-card">
        <h3>{isWinner ? 'You Won!' : 'You Lost'}</h3>

        {isWinner ? (
          <p className="guess-count">Solved it in <strong>{guessCount} guesses</strong></p>
        ) : (
          <p className="loser-reveal">
            {isAI ? `The AI got it in fewer guesses` : `${opponentName || 'Opponent'} got it first`}
          </p>
        )}

        {isAuthenticated && stats && (
          <div className="user-stats">
            <div className="stats-grid">
              <div className="stat">
                <span className="stat-value">{stats.totalWins}</span>
                <span className="stat-label">Wins</span>
              </div>
              <div className="stat">
                <span className="stat-value">{stats.totalGames}</span>
                <span className="stat-label">Games</span>
              </div>
              <div className="stat">
                <span className="stat-value">{stats.averageGuessesToWin.toFixed(1)}</span>
                <span className="stat-label">Avg Guesses</span>
              </div>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <p className="auth-prompt">Register an account to track your stats across games!</p>
        )}

        <div className="summary-actions">
          <button className="btn-primary" onClick={onPlayAgain}>Play Again</button>
          {!isAI && (
            <button className="btn-secondary" onClick={onPlayAgain}>Rematch</button>
          )}
          <button className="btn-share" onClick={handleShare}>Share Result</button>
        </div>
        {shareMsg && <p className="share-feedback">{shareMsg}</p>}
      </div>
    </div>
  );
}
