/**
 * AI opponent service for Jotto game
 * Implements moderate difficulty strategy
 */

import { GameService } from './GameService.js';
import { Guess } from '../models/types.js';
import { getCommonWords } from '../data/wordLoader.js';
import { countCommonLetters } from '../utils/letterMatcher.js';

export const AI_PLAYER_ID = 'AI_PLAYER';
export const AI_PLAYER_NAME = 'AI Bot 🤖';

export class AIService {
  private gameService: GameService;
  private commonWords: string[];

  constructor(gameService: GameService) {
    this.gameService = gameService;
    this.commonWords = getCommonWords();
  }

  /**
   * Pick a random common word as AI's secret
   */
  pickSecretWord(): string {
    const randomIndex = Math.floor(Math.random() * this.commonWords.length);
    return this.commonWords[randomIndex];
  }

  /**
   * Generate AI's next guess based on game history
   * Includes 1-2 second delay for natural feeling
   */
  async makeAIMove(gameId: string): Promise<void> {
    // Add 1-2 second delay for natural feeling
    const delay = 1000 + Math.random() * 1000; // 1000-2000ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Get game state and AI's previous guesses
    const gameState = await this.gameService.getGameState(gameId, AI_PLAYER_ID);
    const aiGuesses = gameState.guesses.filter(g => g.playerId === AI_PLAYER_ID);

    // Calculate next guess
    const nextGuess = this.calculateNextGuess(aiGuesses);

    // Make the guess
    await this.gameService.makeGuess(gameId, AI_PLAYER_ID, nextGuess);
  }

  /**
   * AI strategy: Filter possible words based on feedback
   * Moderate difficulty - uses feedback but makes occasional mistakes
   */
  private calculateNextGuess(previousGuesses: Guess[]): string {
    let possibleWords = [...this.commonWords];

    // Filter based on feedback from previous guesses
    for (const guess of previousGuesses) {
      possibleWords = possibleWords.filter(word => {
        // Word is possible if it would give same matchCount vs unknown secret
        // We simulate: if this word WERE the secret, would guess get same matches?
        const simulatedMatches = countCommonLetters(guess.guessWord, word);
        return simulatedMatches === guess.matchCount;
      });
    }

    // Fallback if no words match constraints (shouldn't happen)
    if (possibleWords.length === 0) {
      possibleWords = [...this.commonWords];
    }

    // 70% pick from common half, 30% pick random (add mistakes)
    const useCommon = Math.random() < 0.7;

    if (useCommon && possibleWords.length > 20) {
      // Pick from top half most common words
      const halfwayPoint = Math.floor(possibleWords.length / 2);
      possibleWords = possibleWords.slice(0, halfwayPoint);
    }

    // Random selection from filtered list
    const randomIndex = Math.floor(Math.random() * possibleWords.length);
    return possibleWords[randomIndex];
  }
}
