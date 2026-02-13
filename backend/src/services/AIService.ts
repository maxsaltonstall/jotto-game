/**
 * AI opponent service for Jotto game
 * LLM-powered using Claude API with Datadog LLM Observability
 */

import Anthropic from '@anthropic-ai/sdk';
import { GameService } from './GameService.js';
import { Guess } from '../models/types.js';
import { getCommonWords } from '../data/wordLoader.js';
import { logger } from '../utils/logger.js';
import { MetricsService } from '../utils/metrics.js';

export const AI_PLAYER_ID = 'AI_PLAYER';
export const AI_PLAYER_NAME = 'AI Bot 🤖';

const MODEL = 'claude-3-5-haiku-20241022'; // Fast and cost-effective for this task
const MAX_TOKENS = 150; // Increased for strategic reasoning

export class AIService {
  private gameService: GameService;
  private commonWords: string[];
  private anthropic: Anthropic | null;

  constructor(gameService: GameService) {
    this.gameService = gameService;
    this.commonWords = getCommonWords();

    // Initialize Anthropic client if API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      logger.info('AI Service initialized with Claude API');
    } else {
      this.anthropic = null;
      logger.warn('ANTHROPIC_API_KEY not set - AI will use fallback strategy');
    }
  }

  /**
   * Pick a random common word as AI's secret
   */
  pickSecretWord(): string {
    const randomIndex = Math.floor(Math.random() * this.commonWords.length);
    return this.commonWords[randomIndex];
  }

  /**
   * Generate AI's next guess using Claude API or fallback strategy
   * Includes natural delay for better UX
   */
  async makeAIMove(gameId: string): Promise<void> {
    const startTime = Date.now();

    try {
      // Add natural delay (500-1500ms)
      const delay = 500 + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));

      // Get game state and AI's previous guesses
      const gameState = await this.gameService.getGameState(gameId, AI_PLAYER_ID);
      const aiGuesses = gameState.guesses.filter(g => g.playerId === AI_PLAYER_ID);

      // Generate next guess
      const nextGuess = this.anthropic
        ? await this.generateLLMGuess(aiGuesses, gameId)
        : this.generateFallbackGuess(aiGuesses);

      // Make the guess
      await this.gameService.makeGuess(gameId, AI_PLAYER_ID, nextGuess);

      // Track AI move metrics
      const duration = Date.now() - startTime;
      const guessQuality = this.anthropic ? 'optimal' : 'suboptimal';
      MetricsService.trackAIMove(duration, guessQuality);

      logger.info('AI move completed', {
        gameId,
        guess: nextGuess,
        duration,
        usedLLM: !!this.anthropic
      });
    } catch (err) {
      logger.error('AI move failed', {
        gameId,
        error: (err as Error).message
      });

      // Track error
      MetricsService.trackError('ai_move_error', (err as Error).message, { gameId });
      throw err;
    }
  }

  /**
   * Use Claude API to generate strategic guess with LLM Observability
   */
  private async generateLLMGuess(previousGuesses: Guess[], gameId: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const startTime = Date.now();

    try {
      // Build context from previous guesses
      const guessHistory = previousGuesses.length > 0
        ? previousGuesses.map(g => `${g.guessWord}: ${g.matchCount} matches`).join('\n')
        : 'No guesses yet';

      // Create strategic prompt
      const prompt = this.buildLLMPrompt(guessHistory);

      logger.debug('Sending request to Claude API', {
        gameId,
        model: MODEL,
        previousGuessCount: previousGuesses.length
      });

      // Call Claude API with metadata for tracking
      const response = await this.anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.3, // Low temperature for consistent strategic play
        messages: [{
          role: 'user',
          content: prompt
        }],
        // Add metadata for tracking (Anthropic API format)
        metadata: {
          user_id: `game-${gameId}`
        }
      });

      // Extract guess from response
      const content = response.content[0];
      const guess = content.type === 'text'
        ? this.extractGuessFromResponse(content.text)
        : this.generateFallbackGuess(previousGuesses);

      // Track LLM metrics
      const latency = Date.now() - startTime;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      MetricsService.trackLLMTokens(inputTokens, outputTokens, MODEL);
      MetricsService.trackLLMLatency(latency, MODEL, true);

      logger.info('LLM guess generated', {
        gameId,
        guess,
        latency,
        inputTokens,
        outputTokens,
        stopReason: response.stop_reason
      });

      // Validate guess
      if (!this.isValidGuess(guess, previousGuesses)) {
        logger.warn('LLM generated invalid guess, using fallback', {
          gameId,
          invalidGuess: guess
        });
        return this.generateFallbackGuess(previousGuesses);
      }

      return guess;
    } catch (err) {
      const latency = Date.now() - startTime;
      MetricsService.trackLLMLatency(latency, MODEL, false);

      logger.error('LLM guess generation failed, using fallback', {
        gameId,
        error: (err as Error).message,
        latency
      });

      // Fall back to rule-based strategy
      return this.generateFallbackGuess(previousGuesses);
    }
  }

  /**
   * Build strategic prompt for Claude with enhanced game theory
   */
  private buildLLMPrompt(guessHistory: string): string {
    const guessCount = guessHistory === 'No guesses yet' ? 0 : guessHistory.split('\n').length;

    return `You are an expert Jotto player. Jotto is a word game where you guess a 5-letter secret word. After each guess, you learn how many letters match (SAME letter in SAME position).

GAME RULES:
- Secret word is a common 5-letter English word
- Each guess reveals: number of letters that match (correct letter, correct position)
- Example: Secret is BREAD, guess BREAK → 4 matches (B-R-E-A match, K doesn't)
- Example: Secret is BREAD, guess CREAM → 2 matches (only R-E-A match positions 2,3, not E at position 3)

YOUR PREVIOUS GUESSES:
${guessHistory}

STRATEGIC THINKING (apply these principles):

${guessCount === 0 ? `
FIRST GUESS - Maximize Information:
- Choose a word with 5 DIFFERENT common letters (no repeated letters)
- Best starting letters by frequency: E, T, A, O, I, N, S, H, R
- Good starts: STARE, AROSE, IRATE, STERN, LATER, STONE, HEART
- Avoid: words with repeated letters (GEESE, ALLEY) - waste information
` : guessCount === 1 ? `
SECOND GUESS - Isolate New Letters:
- Analyze first guess: ${guessHistory.split('\n')[0]}
- If 0 matches: All 5 letters are WRONG - avoid them entirely
- If 1-2 matches: Some letters are right - test NEW letters to narrow down
- If 3+ matches: You're close - try variations keeping confirmed positions
- Choose a word with mostly NEW untested letters
- Example: STARE → 2 matches? Try CLUMP (all new letters) to test more
` : guessCount < 5 ? `
MID-GAME - Constraint Satisfaction:
- Build a mental model of which letters are IN and which positions
- If guess had 0 matches: Those 5 letters are definitely NOT in the word
- If guess had matches: Those letters might be correct - keep them in same positions
- Test words that satisfy ALL previous constraints
- Eliminate contradictions (e.g., if STARE → 0, don't guess TEARS)
- Focus on untested letters in uncertain positions
` : `
LATE-GAME - Precision:
- You have ${guessCount} guesses - analyze the pattern
- Find letters that consistently appear in matching positions
- Eliminate letters that never matched
- Try words combining your highest-confidence letters
- If stuck, try common words with frequent letter patterns
`}

CRITICAL RULES:
1. NEVER repeat a previous guess
2. Choose words with DIFFERENT letters than previously tested (unless matches suggest keeping them)
3. Maximize new information per guess
4. Use common English words only
5. If a guess had 0 matches, NONE of those letters are in the secret word - avoid them!

VALID WORD LIST (choose from these): ${this.commonWords.slice(0, 30).join(', ')}, and other common 5-letter words

RESPONSE FORMAT: Reply with ONLY the uppercase 5-letter word, nothing else.

Your strategic next guess:`;
  }

  /**
   * Extract 5-letter word from LLM response
   */
  private extractGuessFromResponse(text: string): string {
    // Remove any surrounding text and extract first 5-letter word
    const match = text.match(/\b[A-Z]{5}\b/);
    if (match) {
      return match[0];
    }

    // Try case-insensitive
    const lowerMatch = text.match(/\b[a-zA-Z]{5}\b/);
    if (lowerMatch) {
      return lowerMatch[0].toUpperCase();
    }

    // Return first word if no valid word found
    const words = text.trim().split(/\s+/);
    return words[0]?.substring(0, 5).toUpperCase() || 'ABOUT';
  }

  /**
   * Validate that guess is valid and not a repeat
   */
  private isValidGuess(guess: string, previousGuesses: Guess[]): boolean {
    // Must be 5 letters
    if (!/^[A-Z]{5}$/.test(guess)) {
      return false;
    }

    // Must be in word list
    if (!this.commonWords.includes(guess)) {
      return false;
    }

    // Must not be a repeat
    const alreadyGuessed = previousGuesses.some(g => g.guessWord === guess);
    if (alreadyGuessed) {
      return false;
    }

    return true;
  }

  /**
   * Fallback rule-based strategy (original implementation)
   * Used when LLM is unavailable or fails
   */
  private generateFallbackGuess(previousGuesses: Guess[]): string {
    let possibleWords = [...this.commonWords];

    // Filter based on feedback from previous guesses
    for (const guess of previousGuesses) {
      possibleWords = possibleWords.filter(word => {
        // Don't repeat guesses
        if (word === guess.guessWord) {
          return false;
        }

        // Word is possible if it would give same matchCount
        const simulatedMatches = this.countMatches(guess.guessWord, word);
        return simulatedMatches === guess.matchCount;
      });
    }

    // Fallback if no words match constraints
    if (possibleWords.length === 0) {
      possibleWords = this.commonWords.filter(word =>
        !previousGuesses.some(g => g.guessWord === word)
      );
    }

    // If still empty, just pick any word
    if (possibleWords.length === 0) {
      possibleWords = [...this.commonWords];
    }

    // Pick randomly from top half (most common words)
    const halfwayPoint = Math.floor(possibleWords.length / 2);
    const topHalf = possibleWords.slice(0, Math.max(halfwayPoint, 1));
    const randomIndex = Math.floor(Math.random() * topHalf.length);

    return topHalf[randomIndex];
  }

  /**
   * Count matching letters between two words
   */
  private countMatches(word1: string, word2: string): number {
    let matches = 0;
    for (let i = 0; i < 5; i++) {
      if (word1[i] === word2[i]) {
        matches++;
      }
    }
    return matches;
  }
}
