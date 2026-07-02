/**
 * Main App component with React Router
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { GameBoard } from './components/GameBoard';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InstallPrompt } from './components/InstallPrompt';
import { ThemeToggle } from './components/ThemeToggle';
import { InviteLink } from './components/InviteLink';
import { api } from './api/client';
import { Admin } from './pages/Admin';
import './styles/theme.css';
import './styles/layout.css';
import './styles/Home.css';
import './App.css';

// Create a QueryClient instance with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,          // Consider data fresh for 30 seconds
      gcTime: 5 * 60 * 1000,     // Keep unused data in cache for 5 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on tab focus (WebSocket handles this)
      refetchOnReconnect: false,   // Don't refetch on reconnect (WebSocket handles this)
      retry: 1,                    // Only retry failed requests once
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineIndicator />
      <InstallPrompt />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:gameId" element={<Game />} />
            <Route path="/join/:gameId" element={<Game />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, userId } = useAuth();
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | null>(null);
  const [mode, setMode] = useState<'menu' | 'friend' | 'ai' | 'waiting'>('menu');
  const [secretWord, setSecretWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdGameId, setCreatedGameId] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    let id = localStorage.getItem('jotto-player-id');
    let name = localStorage.getItem('jotto-player-name');

    if (!id) {
      id = `player-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('jotto-player-id', id);
    }
    setPlayerId(id);

    if (!name) {
      setShowWelcome(true);
    } else {
      setPlayerName(name);
    }
  }, []);

  const handleNameSubmit = (name: string) => {
    localStorage.setItem('jotto-player-name', name);
    setPlayerName(name);
    setShowWelcome(false);
  };

  const handleCreateFriendGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secretWord.length !== 5) return;
    setLoading(true);
    setError('');
    try {
      const game = await api.createGame(playerId, playerName, secretWord.toLowerCase(), userId || undefined);
      setCreatedGameId(game.gameId);
      setMode('waiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAIGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (secretWord.length !== 5) return;
    setLoading(true);
    setError('');
    try {
      const game = await api.createAIGame(playerId, playerName, secretWord.toLowerCase(), userId || undefined);
      navigate(`/game/${game.gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = () => {
    if (joinCode.trim()) {
      const normalized = joinCode.trim().toLowerCase().replace(/[\s_]+/g, '-');
      navigate(`/game/${normalized}`);
    }
  };

  if (!playerId) {
    return <div className="app">Loading...</div>;
  }

  if (showWelcome) {
    return (
      <div className="app">
        <header className="home-header">
          <h1>JOTTO</h1>
          <p className="tagline">The 5-letter word duel</p>
        </header>
        <main>
          <WelcomeScreen onNameSubmit={handleNameSubmit} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="home-header">
        <h1>JOTTO</h1>
        <p className="tagline">The 5-letter word duel</p>
        <div className="header-actions">
          <span className="player-name">{playerName}</span>
          <ThemeToggle />
          {isAuthenticated ? (
            <button onClick={logout} className="auth-button">Logout</button>
          ) : (
            <button onClick={() => setShowAuthModal('login')} className="auth-button">Login / Register</button>
          )}
        </div>
      </header>

      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {showAuthModal === 'login' ? (
              <LoginForm
                onSuccess={() => setShowAuthModal(null)}
                onCancel={() => setShowAuthModal(null)}
                onSwitchToRegister={() => setShowAuthModal('register')}
              />
            ) : (
              <RegisterForm
                onSuccess={() => setShowAuthModal(null)}
                onCancel={() => setShowAuthModal(null)}
              />
            )}
          </div>
        </div>
      )}

      <main>
        <div className="card">
          {mode === 'menu' && (
            <>
              <div className="home-paths">
                <button className="home-path-card" onClick={() => { setMode('friend'); setSecretWord(''); setError(''); }}>
                  <div className="path-icon">&#x1F91D;</div>
                  <div className="path-title">Play a Friend</div>
                  <div className="path-subtitle">Create a game and share the link</div>
                </button>
                <button className="home-path-card ai" onClick={() => { setMode('ai'); setSecretWord(''); setError(''); }}>
                  <div className="path-icon">&#x1F916;</div>
                  <div className="path-title">Play the AI</div>
                  <div className="path-subtitle">Challenge the computer</div>
                </button>
              </div>
              <div className="home-join">
                <p className="join-label">Have a game code? Join here:</p>
                <div className="join-row">
                  <input
                    type="text"
                    placeholder="snake-table-grant"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
                  />
                  <button onClick={handleJoinByCode}>Join</button>
                </div>
              </div>
            </>
          )}

          {(mode === 'friend' || mode === 'ai') && (
            <div className="home-secret-form">
              <h2>{mode === 'friend' ? 'Play a Friend' : 'Play the AI'}</h2>
              <p>Choose your secret 5-letter word:</p>
              <form onSubmit={mode === 'friend' ? handleCreateFriendGame : handleCreateAIGame}>
                <div className="form-row">
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="SECRET"
                    value={secretWord}
                    onChange={(e) => setSecretWord(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                    autoFocus
                  />
                  <button type="submit" disabled={secretWord.length !== 5 || loading}>
                    {loading ? 'Creating...' : 'Start Game'}
                  </button>
                </div>
              </form>
              {error && <p className="error">{error}</p>}
              <button className="back-link" onClick={() => setMode('menu')}>Back</button>
            </div>
          )}

          {mode === 'waiting' && (
            <div>
              <h2>Waiting for opponent...</h2>
              <InviteLink gameId={createdGameId} />
              <div className="waiting-indicator" />
              <button className="back-link" onClick={() => navigate(`/game/${createdGameId}`)}>
                Go to game board
              </button>
            </div>
          )}
        </div>
      </main>

      <p className="home-footer">Guess your opponent's 5-letter word. After each guess, you'll see how many letters match.</p>
    </div>
  );
}

function Game() {
  const { gameId: rawGameId } = useParams<{ gameId: string }>();
  const gameId = rawGameId ? rawGameId.toLowerCase().replace(/[\s_]+/g, '-') : rawGameId;
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');

  // Load player data from localStorage
  useEffect(() => {
    const id = localStorage.getItem('jotto-player-id');
    const name = localStorage.getItem('jotto-player-name');

    if (!id || !name) {
      // Redirect to home if player data is missing
      navigate('/');
      return;
    }

    setPlayerId(id);
    setPlayerName(name);
  }, [navigate]);

  const handleLeaveGame = () => {
    navigate('/');
  };

  if (!playerId || !playerName || !gameId) {
    return <div className="app">Loading...</div>;
  }

  return (
    <div className="app">
      <main>
        <GameBoard gameId={gameId} playerId={playerId} playerName={playerName} userId={userId || undefined} onLeaveGame={handleLeaveGame} />
      </main>
    </div>
  );
}

export default App;
