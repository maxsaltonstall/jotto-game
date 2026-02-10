/**
 * Main App component with React Router
 */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CreateGame } from './components/CreateGame';
import { PlayAI } from './components/PlayAI';
import { GameList } from './components/GameList';
import { GameBoard } from './components/GameBoard';
import { JoinGame } from './components/JoinGame';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { OfflineIndicator } from './components/OfflineIndicator';
import { InstallPrompt } from './components/InstallPrompt';
import './App.css';

function App() {
  return (
    <>
      <OfflineIndicator />
      <InstallPrompt />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:gameId" element={<Game />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </>
  );
}

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, userId } = useAuth();
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | null>(null);

  // Load player data from localStorage
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

  const handleGameCreated = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  const handleJoinGame = (gameId: string) => {
    navigate(`/game/${gameId}`);
  };

  if (!playerId) {
    return <div className="app">Loading...</div>;
  }

  if (showWelcome) {
    return (
      <div className="app">
        <header>
          <h1>Jotto</h1>
          <p className="subtitle">A Word Guessing Game</p>
        </header>
        <main>
          <WelcomeScreen onNameSubmit={handleNameSubmit} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>Jotto</h1>
        <p className="subtitle">A Word Guessing Game</p>
        <div className="header-user">
          <p className="player-id">Player: {playerName}</p>
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
        <div className="menu">
          <CreateGame playerId={playerId} playerName={playerName} userId={userId || undefined} onGameCreated={handleGameCreated} />
          <div className="divider">OR</div>
          <PlayAI playerId={playerId} playerName={playerName} userId={userId || undefined} onGameCreated={handleGameCreated} />
          <div className="divider">OR</div>
          <JoinGame onJoinGame={handleJoinGame} />
          <div className="divider">OR</div>
          <GameList playerId={playerId} onJoinGame={handleJoinGame} />
        </div>
      </main>

      <footer>
        <p>How to play: Guess your opponent's 5-letter word. After each guess, you'll see how many letters match (regardless of position).</p>
      </footer>
    </div>
  );
}

function Game() {
  const { gameId } = useParams<{ gameId: string }>();
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
      <header>
        <h1>Jotto</h1>
        <p className="subtitle">A Word Guessing Game</p>
        <p className="player-id">Player: {playerName}</p>
      </header>

      <main>
        <GameBoard gameId={gameId} playerId={playerId} playerName={playerName} userId={userId || undefined} onLeaveGame={handleLeaveGame} />
      </main>

      <footer>
        <p>How to play: Guess your opponent's 5-letter word. After each guess, you'll see how many letters match (regardless of position).</p>
      </footer>
    </div>
  );
}

export default App;
