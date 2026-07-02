/**
 * Generate memorable game codes using three 5-letter words
 */

// List of common, easy-to-spell 5-letter words
const WORDS = [
  // A
  'angel', 'ankle', 'apple', 'arena', 'arrow', 'audio',
  // B
  'badge', 'baker', 'basic', 'beach', 'beast', 'berry', 'birch', 'black', 'blade', 'blank',
  'blast', 'blaze', 'blend', 'bloom', 'bonus', 'boost', 'bound', 'brain', 'brave', 'bread',
  'break', 'brick', 'bring', 'brisk', 'brook', 'brush', 'build',
  // C
  'cable', 'candy', 'canoe', 'cargo', 'catch', 'cause', 'cedar', 'chain', 'chair', 'chalk',
  'charm', 'cheap', 'cheek', 'cheer', 'chess', 'chest', 'chief', 'china', 'cider', 'claim',
  'clean', 'clear', 'climb', 'clock', 'close', 'cloud', 'coach', 'coast', 'color', 'coral',
  'count', 'cover', 'craft', 'crash', 'crisp', 'cross', 'crown',
  // D
  'daisy', 'dance', 'debut', 'delta', 'depth', 'drama', 'drawn', 'dream', 'drink', 'dwarf',
  // E
  'eagle', 'early', 'earth', 'elbow', 'elite', 'ember', 'equal', 'essay', 'event', 'extra',
  // F
  'fable', 'fairy', 'faith', 'fancy', 'fever', 'fiber', 'field', 'finch', 'first', 'flame',
  'flare', 'flash', 'fleet', 'flesh', 'flint', 'float', 'flora', 'flour', 'flute', 'forge',
  'forte', 'forum', 'found', 'frame', 'frank', 'fresh', 'front', 'fruit', 'fudge', 'funny',
  // G
  'gecko', 'glass', 'gleam', 'globe', 'gloom', 'gloss', 'glove', 'goose', 'grace', 'grain',
  'grant', 'grass', 'green', 'gusto',
  // H
  'habit', 'handy', 'happy', 'hardy', 'haven', 'hazel', 'heart', 'hedge', 'herbs', 'heron',
  'honey', 'honor', 'horse', 'house', 'humid', 'humor', 'husky',
  // I
  'image', 'index', 'inner', 'input', 'intro', 'ivory',
  // J
  'jelly', 'jewel', 'juice', 'juicy', 'jumbo',
  // K
  'karma', 'knife', 'knoll', 'known',
  // L
  'label', 'lance', 'laser', 'learn', 'leash', 'lemon', 'level', 'light', 'liver', 'local',
  'lodge', 'lover', 'lucky', 'lunar', 'lyric',
  // M
  'magic', 'manor', 'maple', 'march', 'marsh', 'match', 'mayor', 'melon', 'mercy', 'merit',
  'metal', 'might', 'model', 'moist', 'money', 'month', 'moose', 'moral', 'motor', 'mound',
  'mount', 'mouth', 'muddy', 'mural', 'music',
  // N
  'niche', 'night', 'noble', 'north', 'novel', 'nurse',
  // O
  'ocean', 'olive', 'orbit', 'order', 'organ', 'otter', 'outer',
  // P
  'paint', 'panda', 'panic', 'paper', 'party', 'patch', 'patio', 'pause', 'peace', 'peach',
  'pearl', 'penny', 'perch', 'petal', 'piano', 'pilot', 'place', 'plain', 'plane', 'plant',
  'plate', 'plaza', 'point', 'poker', 'porch', 'pound', 'power', 'prank', 'pride', 'probe',
  'pulse', 'punch', 'purse',
  // Q
  'queen', 'quest', 'quick', 'quiet',
  // R
  'radio', 'rally', 'ranch', 'raven', 'reach', 'ready', 'realm', 'ridge', 'rival', 'river',
  'roast', 'robin', 'rocky', 'rover', 'royal', 'ruler', 'rusty',
  // S
  'salad', 'sandy', 'sauce', 'scale', 'scent', 'scope', 'score', 'scout', 'serve', 'shade',
  'shape', 'share', 'sharp', 'shear', 'sheep', 'shelf', 'shell', 'shift', 'shine', 'shiny',
  'shirt', 'shore', 'short', 'shout', 'shrub', 'sight', 'silly', 'skill', 'skull', 'sleep',
  'slide', 'slope', 'sloth', 'smart', 'smile', 'smoke', 'snake', 'snail', 'snare', 'sneak',
  'solar', 'solid', 'solve', 'sound', 'south', 'space', 'spark', 'spawn', 'speed', 'spell',
  'spine', 'sport', 'stage', 'stale', 'stalk', 'stamp', 'stand', 'stark', 'start', 'stash',
  'state', 'steak', 'steam', 'stern', 'sting', 'stock', 'stomp', 'stone', 'storm', 'story',
  'stout', 'strap', 'straw', 'study', 'stump', 'style', 'sugar', 'sunny', 'surge', 'sweet',
  'swamp', 'swear', 'sweat', 'sweep', 'swell', 'swift', 'swing', 'swipe',
  // T
  'table', 'talon', 'tangy', 'tense', 'thorn', 'thumb', 'thyme', 'tidal', 'tiger', 'timid',
  'toast', 'tonic', 'totem', 'trace', 'track', 'train', 'treat', 'trend', 'trial', 'tribe',
  'trick', 'trout', 'trove', 'trunk', 'trust', 'truth',
  // U
  'ultra', 'unity', 'urban', 'usher', 'utter',
  // V
  'value', 'valor', 'vault', 'vigor', 'viral', 'vista', 'vital', 'vivid', 'vixen', 'vocal',
  'voice', 'voter',
  // W
  'wacky', 'waltz', 'waste', 'watch', 'water', 'weary', 'weave', 'wedge', 'weird', 'whale',
  'wheat', 'wheel', 'while', 'whirl', 'windy', 'wispy', 'witch', 'witty', 'world', 'wound',
  'wrath', 'wreck', 'wrong',
  // Y
  'yacht', 'yearn', 'yield', 'young', 'youth', 'yummy',
  // Z
  'zebra', 'zippy',
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
