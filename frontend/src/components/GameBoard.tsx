import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useOptimizedGameState } from '../hooks/useOptimizedGameState';
import { GameHeader } from './GameHeader';
import { GuessHistory } from './GuessHistory';
import { OpponentProgress } from './OpponentProgress';
import { GuessInput } from './GuessInput';
import { Alphabet } from './Alphabet';
import { PostGameSummary } from './PostGameSummary';
import { InviteLink } from './InviteLink';
import { useAuth } from '../contexts/AuthContext';
import { incrementGamesPlayed } from './InstallPrompt';
import { RUMTracking } from '../utils/datadog-rum';
import '../styles/GameBoard.css';
import '../styles/GuessHistory.css';

interface GameBoardProps {
  gameId: string;
  playerId: string;
  playerName: string;
  userId?: string;
  onLeaveGame: () => void;
}

export function GameBoard({ gameId, playerId, playerName, userId, onLeaveGame }: GameBoardProps) {
  const { gameState, loading, error, isOnline, refetch } = useOptimizedGameState(gameId, playerId, playerName);
  const { refreshStats } = useAuth();
  const [joinSecretWord, setJoinSecretWord] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<'mine' | 'opponent'>('mine');

  useEffect(() => {
    RUMTracking.setUser(playerId, playerName);
  }, [playerId, playerName]);

  useEffect(() => {
    if (gameState?.game.status === 'COMPLETED' && !showSummary) {
      setShowSummary(true);
      refreshStats().catch(console.error);
      incrementGamesPlayed();
      const myGuesses = gameState.guesses.filter((g) => g.playerId === playerId);
      const won = gameState.game.winnerId === playerId;
      RUMTracking.trackGameCompleted(gameId, won, myGuesses.length);
    }
  }, [gameState?.game.status, showSummary, refreshStats, gameState?.guesses, gameState?.game.winnerId, gameId, playerId]);

  if (loading && !gameState) return <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>Loading game...</div>;
  if (error) return <div className="card"><p className="error">{error}</p><button onClick={onLeaveGame}>Back</button></div>;
  if (!gameState) return <div className="card">Game not found</div>;

  const { game, guesses, myTurn } = gameState;
  const myGuesses = guesses.filter((g) => g.playerId === playerId);
  const opponentGuesses = guesses.filter((g) => g.playerId !== playerId);
  const opponentName = game.player1Id === playerId ? (game.player2Name || 'Opponent') : game.player1Name;
  const turnCount = myGuesses.length + 1;

  if (game.status === 'WAITING' && game.player1Id !== playerId) {
    const handleJoin = async (e: React.FormEvent) => {
      e.preventDefault();
      setJoinError(null);
      if (joinSecretWord.length !== 5) { setJoinError('Secret word must be exactly 5 letters'); return; }
      try {
        await api.joinGame(gameId, playerId, playerName, joinSecretWord, userId);
        await refetch();
        RUMTracking.trackGameJoined(gameId);
      } catch (err) {
        setJoinError(err instanceof Error ? err.message : 'Failed to join game');
      }
    };
    return (
      <div className="card game-join-form">
        <h2>Join Game</h2>
        <form onSubmit={handleJoin}>
          <label htmlFor="joinSecret">Your Secret Word (5 letters):</label>
          <input id="joinSecret" type="text" value={joinSecretWord} onChange={(e) => setJoinSecretWord(e.target.value.toUpperCase())} maxLength={5} placeholder="BREAD" autoComplete="off" />
          {joinError && <div className="error">{joinError}</div>}
          <button type="submit" disabled={joinSecretWord.length !== 5}>Join Game</button>
          <button type="button" className="secondary" onClick={onLeaveGame}>Cancel</button>
        </form>
      </div>
    );
  }

  if (game.status === 'WAITING') {
    return (
      <div className="card game-waiting">
        <h2>Waiting for Opponent</h2>
        <InviteLink gameId={gameId} />
        <div className="waiting-indicator">
          <p>Waiting for opponent to join...</p>
          <div className="waiting-bar"><div className="waiting-bar-fill" /></div>
        </div>
        <button className="btn-cancel" onClick={onLeaveGame}>Cancel Game</button>
      </div>
    );
  }

  const handleGuess = async (word: string) => {
    const result = await api.makeGuess(gameId, playerId, word);
    await refetch();
    RUMTracking.trackGuess(gameId, result.matchCount, result.isWinningGuess || false);
  };

  const iAmPlayer1 = game.player1Id === playerId;
  const iCompleted = iAmPlayer1 ? game.player1Completed : game.player2Completed;

  return (
    <div>
      <GameHeader opponentName={opponentName} turnCount={turnCount} isMyTurn={myTurn} onLeave={onLeaveGame} />

      <div className="game-tabs">
        <button className={`game-tab ${activeTab === 'mine' ? 'active' : ''}`} onClick={() => setActiveTab('mine')}>Your Guesses</button>
        <button className={`game-tab ${activeTab === 'opponent' ? 'active' : ''}`} onClick={() => setActiveTab('opponent')}>Opponent ({opponentGuesses.length})</button>
      </div>

      <div className="game-columns">
        <div className={`game-main ${activeTab === 'opponent' ? 'hidden' : ''}`}>
          <div className="section-label">Your Guesses</div>
          <div className="card">
            <GuessHistory guesses={myGuesses} />

            {game.status === 'ACTIVE' && !iCompleted && (
              <div>
                {!isOnline && <p className="turn-indicator" style={{ color: 'var(--color-error)' }}>You are offline. Viewing cached game state.</p>}
                {myTurn ? (
                  <>
                    <p className="turn-indicator">Your turn!</p>
                    <GuessInput onSubmit={handleGuess} disabled={!isOnline} onGuessChange={setCurrentGuess} />
                  </>
                ) : (
                  <p className="turn-indicator">Waiting for opponent...</p>
                )}
              </div>
            )}

            {game.status === 'ACTIVE' && iCompleted && (
              <p className="turn-indicator" style={{ color: 'var(--color-success)' }}>You've finished! Waiting for opponent...</p>
            )}
          </div>
        </div>

        <div className={`game-sidebar ${activeTab === 'opponent' ? 'visible' : ''}`}>
          <OpponentProgress guesses={opponentGuesses} opponentName={opponentName} />
        </div>
      </div>

      {game.status === 'ACTIVE' && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <Alphabet guesses={myGuesses} currentGuess={currentGuess} />
        </div>
      )}

      {game.status === 'COMPLETED' && showSummary && (
        <PostGameSummary game={game} playerId={playerId} guessCount={myGuesses.length} onPlayAgain={onLeaveGame} />
      )}
    </div>
  );
}
