/**
 * Main game board component
 */

import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useOptimizedGameState } from '../hooks/useOptimizedGameState';
import { GuessInput } from './GuessInput';
import { Alphabet } from './Alphabet';
import { PostGameSummary } from './PostGameSummary';
import { useAuth } from '../contexts/AuthContext';
import { incrementGamesPlayed } from './InstallPrompt';

interface GameBoardProps {
  gameId: string;
  playerId: string;
  playerName: string;
  userId?: string;
  onLeaveGame: () => void;
}

export function GameBoard({ gameId, playerId, playerName, userId, onLeaveGame }: GameBoardProps) {
  // Use optimized game state with React Query caching + WebSocket real-time updates
  const { gameState, loading, error, isOnline, refetch } = useOptimizedGameState(gameId, playerId, playerName);
  const { refreshStats } = useAuth();
  const [joinSecretWord, setJoinSecretWord] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [showSummary, setShowSummary] = useState(false);

  // Refresh stats when game ends
  useEffect(() => {
    if (gameState?.game.status === 'COMPLETED' && !showSummary) {
      setShowSummary(true);
      refreshStats().catch(console.error);
      // Increment games played for install prompt tracking
      incrementGamesPlayed();
    }
  }, [gameState?.game.status, showSummary, refreshStats]);

  if (loading && !gameState) {
    return <div className="game-board">Loading game...</div>;
  }

  if (error) {
    return (
      <div className="game-board error">
        <p>Error: {error}</p>
        <button onClick={onLeaveGame}>Back</button>
      </div>
    );
  }

  if (!gameState) {
    return <div className="game-board">Game not found</div>;
  }

  const { game, guesses, myTurn } = gameState;

  // Player needs to join the game
  if (game.status === 'WAITING' && game.player1Id !== playerId) {
    const handleJoin = async (e: React.FormEvent) => {
      e.preventDefault();
      setJoinError(null);

      if (joinSecretWord.length !== 5) {
        setJoinError('Secret word must be exactly 5 letters');
        return;
      }

      try {
        await api.joinGame(gameId, playerId, playerName, joinSecretWord, userId);
        await refetch();
      } catch (err) {
        setJoinError(err instanceof Error ? err.message : 'Failed to join game');
      }
    };

    return (
      <div className="game-board">
        <h2>Join Game</h2>
        <form onSubmit={handleJoin}>
          <div>
            <label htmlFor="joinSecret">Your Secret Word (5 letters):</label>
            <input
              id="joinSecret"
              type="text"
              value={joinSecretWord}
              onChange={(e) => setJoinSecretWord(e.target.value.toUpperCase())}
              maxLength={5}
              placeholder="BREAD"
              autoComplete="off"
            />
          </div>
          {joinError && <div className="error">{joinError}</div>}
          <button type="submit" disabled={joinSecretWord.length !== 5}>
            Join Game
          </button>
        </form>
        <button onClick={onLeaveGame}>Cancel</button>
      </div>
    );
  }

  // Waiting for player 2
  if (game.status === 'WAITING') {
    const handleCopyGameId = () => {
      navigator.clipboard.writeText(gameId);
      alert('Game ID copied to clipboard!');
    };

    return (
      <div className="game-board">
        <h2>Waiting for Opponent</h2>
        <div className="game-id-section">
          <p className="game-id-label">Game ID:</p>
          <code className="game-id">{gameId}</code>
          <button onClick={handleCopyGameId} className="copy-button">
            📋 Copy Game ID
          </button>
        </div>
        <p className="instruction">Share this Game ID with a friend so they can join!</p>
        <button onClick={onLeaveGame}>Cancel Game</button>
      </div>
    );
  }

  const handleGuess = async (word: string) => {
    await api.makeGuess(gameId, playerId, word);
    await refetch();
  };

  // Filter guesses by player
  const myGuesses = guesses.filter((g) => g.playerId === playerId);
  const opponentGuesses = guesses.filter((g) => g.playerId !== playerId);

  const opponentName = game.player1Id === playerId ? game.player2Name : game.player1Name;
  const isAiOpponent = opponentName?.includes('🤖') || opponentName?.includes('AI Bot');

  return (
    <div className="game-board">
      <div className="game-header">
        <h2>Jotto Game</h2>
        <div className="game-info">
          <p>Game ID: {gameId}</p>
          <p>Status: {game.status}</p>
          {game.winnerId && (
            <p className="winner">
              {game.status === 'COMPLETED' ? (
                <>Winner: {game.winnerId === playerId ? 'You!' : opponentName || 'Opponent'}</>
              ) : (
                game.winnerId === playerId ? (
                  <>🎉 You finished first! Waiting for {opponentName || 'opponent'} to complete...</>
                ) : (
                  <>{opponentName || 'Opponent'} finished first! Keep guessing to complete the game.</>
                )
              )}
            </p>
          )}
        </div>
        <button onClick={onLeaveGame}>Leave Game</button>
      </div>

      <div className="game-content">
        <div className="guesses-section">
          <div className="my-guesses">
            <h3>Your Guesses</h3>
            {myGuesses.length === 0 ? (
              <p>No guesses yet</p>
            ) : (
              <ul>
                {myGuesses.map((g, i) => (
                  <li key={i} className={g.isWinningGuess ? 'winning' : ''}>
                    <span className="word">{g.guessWord}</span>
                    <span className="matches">{g.matchCount} matches</span>
                    {g.isWinningGuess && <span className="badge">Winner!</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="opponent-guesses">
            <h3>{isAiOpponent ? '🤖 ' : ''}{opponentName || 'Opponent'}'s Guesses</h3>
            {opponentGuesses.length === 0 ? (
              <p>No guesses yet</p>
            ) : (
              <ul>
                {opponentGuesses.map((g, i) => (
                  <li key={i} className={g.isWinningGuess ? 'winning' : ''}>
                    <span className="word">{g.guessWord}</span>
                    <span className="matches">{g.matchCount} matches</span>
                    {g.isWinningGuess && <span className="badge">Winner!</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {game.status === 'ACTIVE' && (() => {
          const iAmPlayer1 = game.player1Id === playerId;
          const iCompleted = iAmPlayer1 ? game.player1Completed : game.player2Completed;
          const opponentCompleted = iAmPlayer1 ? game.player2Completed : game.player1Completed;

          return (
            <div className="input-section">
              <Alphabet guesses={myGuesses} currentGuess={currentGuess} />
              {!isOnline && (
                <p className="turn-indicator" style={{ color: '#dc3545' }}>
                  You are offline. Viewing cached game state.
                </p>
              )}
              {iCompleted ? (
                <p className="turn-indicator" style={{ color: '#28a745' }}>
                  ✅ You've completed your guesses! {opponentCompleted ? 'Both players finished!' : `Waiting for ${opponentName || 'opponent'} to finish...`}
                </p>
              ) : myTurn ? (
                <>
                  <p className="turn-indicator">{isOnline ? 'Your turn!' : 'Your turn (offline - reconnect to play)'}</p>
                  <GuessInput onSubmit={handleGuess} disabled={!isOnline} onGuessChange={setCurrentGuess} />
                </>
              ) : (
                <p className="turn-indicator">Waiting for opponent...</p>
              )}
            </div>
          );
        })()}

        {game.status === 'COMPLETED' && showSummary && (
          <PostGameSummary
            game={game}
            playerId={playerId}
            guessCount={myGuesses.length}
            onPlayAgain={onLeaveGame}
          />
        )}
      </div>
    </div>
  );
}
