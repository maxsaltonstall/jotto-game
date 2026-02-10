/**
 * Welcome screen for setting player name
 */

import { useState } from 'react';

interface WelcomeScreenProps {
  onNameSubmit: (name: string) => void;
}

export function WelcomeScreen({ onNameSubmit }: WelcomeScreenProps) {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onNameSubmit(name.trim());
    }
  };

  return (
    <div className="welcome-screen">
      <h1>Welcome to Jotto!</h1>
      <p>Choose a display name to get started</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="playerName">Your Name:</label>
          <input
            id="playerName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            autoComplete="name"
            autoFocus
            maxLength={20}
          />
        </div>
        <button type="submit" disabled={!name.trim()}>
          Start Playing
        </button>
      </form>
    </div>
  );
}
