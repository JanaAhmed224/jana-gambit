// Core shared types for The Jana Gambit.
// "Origin square" = the square a white (Jana) piece started the game on.
// Because chess.js doesn't track individual piece identity, we track it
// ourselves in pieceTracking.ts, keyed by origin square. That origin square
// is also the key used to look up which challenge is attached to a piece.

export type PlayerRole = 'JANA' | 'YOUSSEF';

export type ChallengeKind =
  | 'TEXT_PROMPT' // free-response prompt, just needs "done"
  | 'VOICE_NOTE' // prompts them to send a voice note outside the app, "done" to confirm
  | 'TIMED_PROMPT' // free-response prompt with a countdown
  | 'RANKING' // rank N items 1..N one at a time
  | 'WOULD_YOU_RATHER' // sequence of two-choice questions
  | 'MULTI_QUESTION' // sequence of free-response questions (AMA / Final Boss)
  | 'CHOICE' // pick one of several options
  | 'IMPERSONATION'; // timed "act it out" prompt

export interface Challenge {
  id: string;
  title: string;
  kind: ChallengeKind;
  prompt?: string;
  subPrompts?: string[]; // for MULTI_QUESTION / WOULD_YOU_RATHER
  items?: string[]; // for RANKING
  options?: string[]; // for CHOICE
  seconds?: number; // for TIMED_PROMPT / IMPERSONATION
  forbiddenWords?: string[]; // for the "compliment without these words" pawn
  flavor?: string; // small italic note shown above the prompt
}

export type AchievementId =
  | 'PAWN_COLLECTOR'
  | 'RUTHLESS'
  | 'QUEEN_SLAYER'
  | 'BIG_BRAIN'
  | 'SOFTIE_DETECTED'
  | 'GREEDY'
  | 'GRANDMASTER'
  | 'GYM_BUFF'
  | 'VALORANT_REFLEXES'
  | 'CHESS_BRAIN'
  | 'GAMBIT_SURVIVOR';

export interface ChallengeAnswer {
  challengeId: string;
  answer: string; // freeform text captured from the player (kept lightweight - see README on privacy)
  completedAt: number;
}

export interface QueuedChallenge {
  challengeId: string;
  triggeredBy: 'capture' | 'check' | 'combo' | 'checkmate' | 'finalboss' | 'manual';
  pieceOrigin?: string; // which piece triggered it, if a capture
}

export type GameStatus =
  | 'WAITING_FOR_PLAYERS'
  | 'IN_PROGRESS'
  | 'CHALLENGE_ACTIVE'
  | 'CHECKMATE_SEQUENCE'
  | 'FINAL_BOSS'
  | 'COMPLETE';

export interface RoomState {
  roomId: string;
  createdAt: number;
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  status: GameStatus;
  players: Partial<Record<PlayerRole, { joinedAt: number; connected: boolean }>>;
  whiteOriginMap: Record<string, string>; // current square -> origin square, for Jana's live pieces
  capturedJanaOrigins: string[]; // origin squares of Jana pieces captured so far
  completedChallengeIds: string[];
  challengeQueue: QueuedChallenge[]; // challenges waiting to be shown, in order
  activeChallenge: QueuedChallenge | null;
  answers: Record<string, ChallengeAnswer>; // challengeId -> answer
  achievements: AchievementId[];
  comboFlags: {
    threePawns: boolean;
    queenPlusRook: boolean;
    fiveOrMore: boolean;
  };
  checkEventShownForPly: number | null; // ply index a check popup was already offered for
  checkEventPending: boolean; // true while the optional "Attack Mode" banner should show
  lastResult: 'checkmate' | 'stalemate' | 'draw' | null;
  winner: 'w' | 'b' | null;
  finalBossAnswers: string[];
  finalRewardRevealed: boolean;
  loserRedemptionChoice: string | null;
  lastMoveAt: number;
}
