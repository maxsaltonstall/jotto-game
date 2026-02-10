/**
 * ETag utility for HTTP caching
 * Generates ETags based on game state to enable 304 Not Modified responses
 */

import type { Game, Guess } from '../models/types.js';

/**
 * Generate an ETag from game state
 * Combines game updatedAt timestamp and number of guesses for uniqueness
 */
export function generateETag(game: Game, guesses: Guess[]): string {
  const gameTimestamp = new Date(game.updatedAt).getTime();
  const guessCount = guesses.length;

  // Create a simple hash combining timestamp and guess count
  const hash = `${gameTimestamp}-${guessCount}`;

  // Return as quoted string per HTTP spec
  return `"${hash}"`;
}

/**
 * Parse If-None-Match header value
 */
export function parseIfNoneMatch(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  // Remove quotes if present
  return header.replace(/^"|"$/g, '');
}

/**
 * Check if ETags match
 */
export function etagsMatch(etag1: string, etag2: string | null): boolean {
  if (!etag2) {
    return false;
  }

  // Normalize both by removing quotes
  const normalized1 = etag1.replace(/^"|"$/g, '');
  const normalized2 = etag2.replace(/^"|"$/g, '');

  return normalized1 === normalized2;
}
