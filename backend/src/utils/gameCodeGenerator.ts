/**
 * Generate memorable game codes using three 5-letter words
 */

// List of common, easy-to-spell 5-letter words
const WORDS = [
  'apple', 'beach', 'brain', 'bread', 'brick', 'chair', 'charm', 'chest', 'clock', 'cloud',
  'crown', 'dance', 'dream', 'drink', 'earth', 'field', 'flame', 'flash', 'flour', 'fruit',
  'glass', 'globe', 'grace', 'grain', 'grant', 'grass', 'green', 'heart', 'horse', 'house',
  'light', 'magic', 'metal', 'money', 'month', 'music', 'night', 'north', 'ocean', 'paint',
  'paper', 'peace', 'pearl', 'piano', 'plant', 'plate', 'point', 'power', 'pride', 'quest',
  'queen', 'quick', 'quiet', 'radio', 'river', 'robin', 'scale', 'shine', 'shirt', 'sight',
  'skill', 'sleep', 'smile', 'snake', 'sound', 'south', 'space', 'spark', 'sport', 'stage',
  'stamp', 'stand', 'start', 'state', 'stone', 'storm', 'story', 'sweet', 'table', 'tiger',
  'train', 'truth', 'trust', 'unity', 'value', 'voice', 'water', 'wheat', 'wheel', 'world',
  'youth', 'beach', 'blend', 'brave', 'bring', 'build', 'catch', 'cause', 'chain', 'chief'
];

/**
 * Generate a random memorable game code
 * Format: word-word-word (e.g., "snake-table-grant")
 */
export function generateGameCode(): string {
  const word1 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const word2 = WORDS[Math.floor(Math.random() * WORDS.length)];
  const word3 = WORDS[Math.floor(Math.random() * WORDS.length)];

  return `${word1}-${word2}-${word3}`;
}
