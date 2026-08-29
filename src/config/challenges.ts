import type { Challenge } from '../game/types';

// ---------------------------------------------------------------------------
// EDIT ME. Every challenge Youssef can unlock lives here, keyed by the
// square Jana's piece started the game on (see game/pieceTracking.ts).
// Swap wording freely - just keep the `id` and `kind` fields intact unless
// you also update the component that renders that kind in ChallengeModal.tsx.
// ---------------------------------------------------------------------------

export const pieceChallenges: Record<string, Challenge> = {
  // --- Pawns (8) ---
  a2: {
    id: 'pawn-a2',
    title: 'Pawn Captured',
    kind: 'TIMED_PROMPT',
    seconds: 3,
    prompt: "Say the first three things that come to mind when I say 'Jana'.",
  },
  b2: {
    id: 'pawn-b2',
    title: 'Pawn Captured',
    kind: 'TIMED_PROMPT',
    seconds: 30,
    prompt: "Roast Jana for 30 seconds. You can't reuse anything you've already said.",
  },
  c2: {
    id: 'pawn-c2',
    title: 'Pawn Captured',
    kind: 'VOICE_NOTE',
    prompt: 'Send a completely ridiculous voice note in your most serious news-anchor voice.',
    flavor: 'Suggested line: "لقد ارتفعت أسعار البطاطس بشكل مقلق."',
  },
  d2: {
    id: 'pawn-d2',
    title: 'Pawn Captured',
    kind: 'TEXT_PROMPT',
    prompt: 'Choose one song that reminds you of Jana - it cannot be a love song.',
  },
  e2: {
    id: 'pawn-e2',
    title: 'Pawn Captured',
    kind: 'TEXT_PROMPT',
    prompt: "Tell Jana the first memory of you two that you remember, but you're not sure she does.",
  },
  f2: {
    id: 'pawn-f2',
    title: 'Pawn Captured',
    kind: 'TEXT_PROMPT',
    prompt: 'Predict one thing that will happen between you two in the next year.',
  },
  g2: {
    id: 'pawn-g2',
    title: 'Pawn Captured',
    kind: 'TEXT_PROMPT',
    prompt: 'Give Jana a compliment without using any of these words:',
    forbiddenWords: ['pretty', 'beautiful', 'cute', 'smart', 'kind'],
  },
  h2: {
    id: 'pawn-h2',
    title: 'Pawn Captured',
    kind: 'IMPERSONATION',
    seconds: 60,
    prompt: 'Impersonate Jana for one full minute.',
  },

  // --- Knights (2) ---
  b1: {
    id: 'knight-b1',
    title: 'Knight Captured',
    kind: 'RANKING',
    prompt: 'Rank each of these 1-5 before you see the next one.',
    items: ['Valorant', 'Chess', 'Gym', 'Music', 'Jana'],
  },
  g1: {
    id: 'knight-g1',
    title: 'Knight Captured',
    kind: 'WOULD_YOU_RATHER',
    prompt: 'Quick choices. Game-show voice optional.',
    subPrompts: [
      'Would you rather lose all your ranked games or all your music for one month?',
      'Would you rather live a week without your phone or a week without the gym?',
      'Would you rather always lose to Jana at chess or never beat her at anything again?',
      'Would you rather have one extra hour with Jana every day or one extra hour of sleep?',
      'Would you rather Jana read your texts to your friends or your friends read your texts to Jana?',
    ],
  },

  // --- Bishops (2) ---
  c1: {
    id: 'bishop-c1',
    title: 'Bishop Captured',
    kind: 'TEXT_PROMPT',
    prompt: 'Tell Jana one thing you do automatically that she probably notices, even though you never think about it.',
    flavor: "If you're stuck, you get three guesses.",
  },
  f1: {
    id: 'bishop-f1',
    title: 'Bishop Captured',
    kind: 'TEXT_PROMPT',
    prompt: 'What is one thing you hope Jana keeps doing, even many years from now?',
  },

  // --- Rooks (2) ---
  a1: {
    id: 'rook-a1',
    title: 'Rook Captured',
    kind: 'TIMED_PROMPT',
    seconds: 20,
    prompt: "What's something you sometimes want to tell Jana but hold back, because you're worried it might cause a problem?",
    flavor: '"I don\'t know" doesn\'t count. Take a moment.',
  },
  h1: {
    id: 'rook-h1',
    title: 'Rook Captured',
    kind: 'TEXT_PROMPT',
    prompt: 'If you could make one change to improve your relationship, what would it be?',
    flavor: '"Nothing" doesn\'t count.',
  },

  // --- Queen (special, two-part) ---
  d1: {
    id: 'queen-d1',
    title: 'The Queen Has Fallen',
    kind: 'TEXT_PROMPT',
    prompt: 'Tell Jana about one moment you realized you were actually falling for her - one she does NOT already know about.',
    flavor: "Not the first 'I love you.' Something smaller, and true.",
  },
};

// The second half of the queen event - "The Reverse". Shown right after
// queen-d1 is answered. The specific moment is picked from gameConfig.reverseMoments.
export const queenReverseChallenge: Challenge = {
  id: 'queen-reverse',
  title: 'The Reverse',
  kind: 'TEXT_PROMPT',
  prompt: 'Jana picked a real moment. Describe what you were actually feeling, in it, at the time.',
};

// Fires on checkmate, in place of a literal "king capture" (which never
// happens in real chess - the game ends at checkmate first).
export const kingAmaChallenge: Challenge = {
  id: 'king-ama',
  title: 'Ask Me Anything',
  kind: 'MULTI_QUESTION',
  prompt: 'You have exactly three questions. Jana has to answer honestly.',
  subPrompts: ['Question 1...', 'Question 2...', 'Question 3...'],
};

export const finalBossChallenge: Challenge = {
  id: 'final-boss',
  title: 'Final Boss: Our Future',
  kind: 'MULTI_QUESTION',
  subPrompts: [
    "If you met me again ten years from now, what's the one thing you'd hope is still the same between us?",
    "What's something you hope we've learned about each other by then?",
    'If you could write one sentence about this year, for us to read years from now, what would it say?',
  ],
};

export const comboThreePawnsChallenge: Challenge = {
  id: 'combo-three-pawns',
  title: 'Combo Unlocked',
  kind: 'TEXT_PROMPT',
  prompt: 'Name three things you genuinely enjoy about your life right now.',
};

export const comboHighRollerChallenge: Challenge = {
  id: 'combo-high-roller',
  title: 'High Roller',
  kind: 'CHOICE',
  prompt: 'Queen and a rook, both gone. Choose one:',
  options: ['A deep question', 'An embarrassing challenge', 'An activity for both of you'],
};

export const checkAttackChallenges: Challenge[] = [
  {
    id: 'check-1',
    title: 'Attack Mode',
    kind: 'TEXT_PROMPT',
    prompt: 'Choose one thing about Jana you genuinely appreciate.',
  },
  {
    id: 'check-2',
    title: 'Attack Mode',
    kind: 'TEXT_PROMPT',
    prompt: 'Ask Jana one question you think she might try to dodge.',
  },
  {
    id: 'check-3',
    title: 'Attack Mode',
    kind: 'TEXT_PROMPT',
    prompt: 'Say one thing you think Jana does when she is anxious.',
  },
];

export const loserRedemptionOptions = [
  '🎧 Choose a song we listen to together',
  '🎮 Choose a game we play together',
  '💬 Choose a topic we talk about',
  '😂 Give Jana a challenge',
  '❤️ Jana chooses',
];

// Flat lookup so the UI can go from a queued challengeId back to full content
// regardless of which of the arrays/records above it lives in.
export function getChallengeById(id: string): Challenge | undefined {
  const all: Challenge[] = [
    ...Object.values(pieceChallenges),
    queenReverseChallenge,
    kingAmaChallenge,
    finalBossChallenge,
    comboThreePawnsChallenge,
    comboHighRollerChallenge,
    ...checkAttackChallenges,
  ];
  return all.find((c) => c.id === id);
}

export const achievementInfo: Record<
  string,
  { icon: string; label: string; description: string }
> = {
  PAWN_COLLECTOR: { icon: '♟️', label: 'Pawn Collector', description: 'Captured 3 pawns.' },
  RUTHLESS: { icon: '⚔️', label: 'Ruthless', description: 'Captured 5 pieces. This is getting personal.' },
  QUEEN_SLAYER: { icon: '👑', label: 'Queen Slayer', description: 'Captured the queen.' },
  BIG_BRAIN: { icon: '🧠', label: 'Big Brain', description: 'Won while down on material.' },
  SOFTIE_DETECTED: { icon: '❤️', label: 'Softie Detected', description: 'Gave an unexpectedly sweet answer.' },
  GREEDY: { icon: '💀', label: 'Greedy', description: 'Captured a piece and immediately regretted it.' },
  GRANDMASTER: { icon: '🏆', label: 'Grandmaster', description: 'Delivered checkmate.' },
  GYM_BUFF: { icon: '💪', label: 'Jana Gym Buff', description: 'Ten moves deep and still locked in.' },
  VALORANT_REFLEXES: { icon: '🎯', label: 'Valorant Reflexes Detected', description: 'Moved the instant it became your turn.' },
  CHESS_BRAIN: { icon: '♞', label: 'Chess Brain Activated', description: 'Castled like you meant it.' },
  GAMBIT_SURVIVOR: { icon: '🏆', label: 'You Survived The Jana Gambit', description: 'Made it all the way through.' },
};

export const winnerRedemptionOptions = [
  '🎧 Pick tonight\'s playlist',
  '🍿 Pick what we watch next',
  '💬 Pick the next deep-talk topic',
  '😂 Give Youssef a challenge',
  '❤️ Youssef chooses',
];
