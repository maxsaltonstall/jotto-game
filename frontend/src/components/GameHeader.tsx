import { ThemeToggle } from './ThemeToggle';

interface GameHeaderProps {
  opponentName: string;
  turnCount: number;
  isMyTurn: boolean;
  onLeave: () => void;
}

export function GameHeader({ opponentName, turnCount, isMyTurn, onLeave }: GameHeaderProps) {
  return (
    <div className="game-top-bar">
      <div className="game-top-left">
        <span className="game-opponent">vs <strong>{opponentName}</strong></span>
      </div>
      <div className="game-top-center">
        <span className="game-title">JOTTO</span>
      </div>
      <div className="game-top-right">
        <span className="game-turn">
          {isMyTurn ? 'Your turn' : 'Opponent\'s turn'} · #{turnCount}
        </span>
        <ThemeToggle />
        <button className="game-leave" onClick={onLeave} aria-label="Leave game">✕</button>
      </div>
    </div>
  );
}
