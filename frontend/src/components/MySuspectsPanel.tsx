/**
 * My Suspects Panel - Manual letter hypothesis tracking
 * Allows players to organize letters by their suspicions
 */

import { useState, useCallback } from 'react';
import '../styles/MySuspectsPanel.css';

interface MySuspectsPanelProps {
  onClose?: () => void;
}

type Category = 'inWord' | 'notInWord' | 'needToTest' | 'possible' | 'unused';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function MySuspectsPanel({ onClose }: MySuspectsPanelProps) {
  // Initialize all letters as unused
  const [letterStates, setLetterStates] = useState<Map<string, Category>>(
    new Map(ALPHABET.map(letter => [letter, 'unused' as Category]))
  );

  const [draggedLetter, setDraggedLetter] = useState<string | null>(null);

  // Handle drag start
  const handleDragStart = useCallback((letter: string) => {
    setDraggedLetter(letter);
  }, []);

  // Handle drag over (allow drop)
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Handle drop into category
  const handleDrop = useCallback((category: Category) => {
    if (draggedLetter) {
      setLetterStates(prev => {
        const next = new Map(prev);
        next.set(draggedLetter, category);
        return next;
      });
      setDraggedLetter(null);
    }
  }, [draggedLetter]);

  // Click to cycle through categories
  const handleLetterClick = useCallback((letter: string) => {
    setLetterStates(prev => {
      const next = new Map(prev);
      const current = prev.get(letter) || 'unused';

      // Cycle: unused -> needToTest -> inWord -> notInWord -> possible -> unused
      const cycle: Category[] = ['unused', 'needToTest', 'inWord', 'notInWord', 'possible'];
      const currentIndex = cycle.indexOf(current);
      const nextCategory = cycle[(currentIndex + 1) % cycle.length];

      next.set(letter, nextCategory);
      return next;
    });
  }, []);

  // Get letters by category
  const getLettersByCategory = (category: Category): string[] => {
    return ALPHABET.filter(letter => letterStates.get(letter) === category);
  };

  // Clear all annotations
  const handleClear = () => {
    setLetterStates(new Map(ALPHABET.map(letter => [letter, 'unused' as Category])));
  };

  // Reset specific category
  const handleClearCategory = (category: Category) => {
    setLetterStates(prev => {
      const next = new Map(prev);
      getLettersByCategory(category).forEach(letter => {
        next.set(letter, 'unused');
      });
      return next;
    });
  };

  const inWord = getLettersByCategory('inWord');
  const notInWord = getLettersByCategory('notInWord');
  const needToTest = getLettersByCategory('needToTest');
  const possible = getLettersByCategory('possible');
  const unused = getLettersByCategory('unused');

  return (
    <div className="my-suspects-panel">
      <div className="panel-header">
        <h3>🔍 My Suspects</h3>
        <div className="panel-actions">
          <button onClick={handleClear} className="clear-all-btn" title="Clear all">
            Clear All
          </button>
          {onClose && (
            <button onClick={onClose} className="close-btn" title="Close panel">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="panel-help">
        <p>Click letters to cycle through categories, or drag them into zones below.</p>
      </div>

      <div className="suspects-categories">
        {/* In The Word */}
        <div
          className="category-zone in-word"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('inWord')}
        >
          <div className="category-header">
            <span className="category-icon">✓</span>
            <span className="category-title">In The Word</span>
            {inWord.length > 0 && (
              <button
                onClick={() => handleClearCategory('inWord')}
                className="clear-category-btn"
                title="Clear this category"
              >
                ×
              </button>
            )}
          </div>
          <div className="category-letters">
            {inWord.length === 0 ? (
              <span className="empty-hint">Drag letters here or click to mark</span>
            ) : (
              inWord.map(letter => (
                <span
                  key={letter}
                  className="letter letter-in-word"
                  draggable
                  onDragStart={() => handleDragStart(letter)}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Need To Test */}
        <div
          className="category-zone need-to-test"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('needToTest')}
        >
          <div className="category-header">
            <span className="category-icon">🎯</span>
            <span className="category-title">Need To Test</span>
            {needToTest.length > 0 && (
              <button
                onClick={() => handleClearCategory('needToTest')}
                className="clear-category-btn"
                title="Clear this category"
              >
                ×
              </button>
            )}
          </div>
          <div className="category-letters">
            {needToTest.length === 0 ? (
              <span className="empty-hint">Letters you want to try next</span>
            ) : (
              needToTest.map(letter => (
                <span
                  key={letter}
                  className="letter letter-need-test"
                  draggable
                  onDragStart={() => handleDragStart(letter)}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Possible */}
        <div
          className="category-zone possible"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('possible')}
        >
          <div className="category-header">
            <span className="category-icon">🤔</span>
            <span className="category-title">Possible</span>
            {possible.length > 0 && (
              <button
                onClick={() => handleClearCategory('possible')}
                className="clear-category-btn"
                title="Clear this category"
              >
                ×
              </button>
            )}
          </div>
          <div className="category-letters">
            {possible.length === 0 ? (
              <span className="empty-hint">Maybe in the word?</span>
            ) : (
              possible.map(letter => (
                <span
                  key={letter}
                  className="letter letter-possible"
                  draggable
                  onDragStart={() => handleDragStart(letter)}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Not In Word */}
        <div
          className="category-zone not-in-word"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('notInWord')}
        >
          <div className="category-header">
            <span className="category-icon">✕</span>
            <span className="category-title">Not In Word</span>
            {notInWord.length > 0 && (
              <button
                onClick={() => handleClearCategory('notInWord')}
                className="clear-category-btn"
                title="Clear this category"
              >
                ×
              </button>
            )}
          </div>
          <div className="category-letters">
            {notInWord.length === 0 ? (
              <span className="empty-hint">Ruled out letters</span>
            ) : (
              notInWord.map(letter => (
                <span
                  key={letter}
                  className="letter letter-not-in-word"
                  draggable
                  onDragStart={() => handleDragStart(letter)}
                  onClick={() => handleLetterClick(letter)}
                >
                  {letter}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Unused Letters Pool */}
        <div
          className="category-zone unused"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop('unused')}
        >
          <div className="category-header">
            <span className="category-icon">📝</span>
            <span className="category-title">Available Letters</span>
          </div>
          <div className="category-letters letters-pool">
            {unused.map(letter => (
              <span
                key={letter}
                className="letter letter-unused"
                draggable
                onDragStart={() => handleDragStart(letter)}
                onClick={() => handleLetterClick(letter)}
              >
                {letter}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-footer">
        <div className="stats">
          <span>✓ {inWord.length} In Word</span>
          <span>🎯 {needToTest.length} To Test</span>
          <span>✕ {notInWord.length} Ruled Out</span>
        </div>
      </div>
    </div>
  );
}
