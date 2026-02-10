import { useState, useEffect } from 'react';
import '../styles/InstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const GAMES_PLAYED_KEY = 'jotto-games-played';
const INSTALL_DISMISSED_KEY = 'jotto-install-dismissed';
const GAMES_THRESHOLD = 2; // Show prompt after 2 games

/**
 * InstallPrompt Component
 *
 * Shows a PWA installation prompt after the user has played a few games.
 * Respects user preferences and doesn't show again if dismissed or already installed.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt
    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY);
    if (dismissed === 'true') {
      return;
    }

    // Check if user has played enough games
    const gamesPlayed = parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0', 10);
    if (gamesPlayed < GAMES_THRESHOLD) {
      return;
    }

    // Check if already installed (display-mode is standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();

      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowPrompt(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="install-prompt">
      <div className="install-content">
        <div className="install-icon">📱</div>
        <div className="install-text">
          <h3>Install Jotto</h3>
          <p>Install the app for a better experience and offline play!</p>
        </div>
        <div className="install-actions">
          <button onClick={handleInstall} className="install-button">
            Install
          </button>
          <button onClick={handleDismiss} className="dismiss-button">
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Utility function to increment games played count
 * Call this when a game completes
 */
export function incrementGamesPlayed(): void {
  const current = parseInt(localStorage.getItem(GAMES_PLAYED_KEY) || '0', 10);
  localStorage.setItem(GAMES_PLAYED_KEY, (current + 1).toString());
}
