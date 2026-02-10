/**
 * Core Jotto game logic: counts common letters between guess and secret word
 *
 * Example:
 *   secret = "CHARM", guess = "BREAD"
 *   Common letters: R (1), A (1) = 2 matches
 */
export function countCommonLetters(guess: string, secret: string): number {
  const guessLetters = guess.toUpperCase().split('');
  const secretLetters = secret.toUpperCase().split('');

  // Build frequency map of secret word letters
  const secretFreq = new Map<string, number>();
  for (const letter of secretLetters) {
    secretFreq.set(letter, (secretFreq.get(letter) || 0) + 1);
  }

  // Count matches from guess, consuming letters from frequency map
  let commonCount = 0;
  for (const letter of guessLetters) {
    const count = secretFreq.get(letter) || 0;
    if (count > 0) {
      commonCount++;
      secretFreq.set(letter, count - 1);
    }
  }

  return commonCount;
}

/**
 * Validates that a word is suitable for Jotto gameplay
 */
export function isValidWord(word: string): boolean {
  if (!word || typeof word !== 'string') {
    return false;
  }

  const normalized = word.trim().toUpperCase();

  // Must be exactly 5 letters
  if (normalized.length !== 5) {
    return false;
  }

  // Must contain only letters A-Z
  return /^[A-Z]{5}$/.test(normalized);
}

/**
 * Normalizes a word for consistent storage and comparison
 */
export function normalizeWord(word: string): string {
  return word.trim().toUpperCase();
}
