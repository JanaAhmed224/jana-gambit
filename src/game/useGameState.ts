import { useCallback, useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { ref, onValue, runTransaction, set, get } from 'firebase/database';
import { db } from '../firebase';
import type { AchievementId, ChallengeAnswer, PlayerRole, QueuedChallenge, RoomState } from './types';
import { applyMoveToOriginMap, categoryForOrigin, initialWhiteOriginMap } from './pieceTracking';
import {
  checkAttackChallenges,
  comboHighRollerChallenge,
  comboThreePawnsChallenge,
  finalBossChallenge,
  kingAmaChallenge,
  pieceChallenges,
  queenReverseChallenge,
} from '../config/challenges';
import { gameConfig } from '../config/gameConfig';

const roleColor: Record<PlayerRole, 'w' | 'b'> = { JANA: 'w', YOUSSEF: 'b' };

function randomRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${gameConfig.roomCodePrefix}-${code}`;
}

function newRoomState(roomId: string): RoomState {
  const chess = new Chess();
  return {
    roomId,
    createdAt: Date.now(),
    fen: chess.fen(),
    pgn: '',
    turn: 'w',
    status: 'WAITING_FOR_PLAYERS',
    players: {},
    whiteOriginMap: initialWhiteOriginMap(),
    capturedJanaOrigins: [],
    completedChallengeIds: [],
    challengeQueue: [],
    activeChallenge: null,
    answers: {},
    achievements: [],
    comboFlags: { threePawns: false, queenPlusRook: false, fiveOrMore: false },
    checkEventShownForPly: null,
    checkEventPending: false,
    lastResult: null,
    winner: null,
    finalBossAnswers: [],
    finalRewardRevealed: false,
    loserRedemptionChoice: null,
    lastMoveAt: Date.now(),
  };
}

function addAchievement(list: AchievementId[], id: AchievementId): AchievementId[] {
  return list.includes(id) ? list : [...list, id];
}

function pieceValue(category: string): number {
  switch (category) {
    case 'pawn':
      return 1;
    case 'knight':
    case 'bishop':
      return 3;
    case 'rook':
      return 5;
    case 'queen':
      return 9;
    default:
      return 0;
  }
}

/** Pops the next queued challenge into activeChallenge, if any, and sets status accordingly. */
function advanceQueue(state: RoomState): RoomState {
  if (state.challengeQueue.length > 0) {
    const [next, ...rest] = state.challengeQueue;
    return { ...state, activeChallenge: next, challengeQueue: rest, status: 'CHALLENGE_ACTIVE' };
  }
  if (state.lastResult === 'checkmate' && (state.finalRewardRevealed || state.winner === 'w')) {
    return { ...state, activeChallenge: null, status: 'COMPLETE' };
  }
  if (state.lastResult === 'stalemate' || state.lastResult === 'draw') {
    return { ...state, activeChallenge: null, status: 'COMPLETE' };
  }
  return { ...state, activeChallenge: null, status: 'IN_PROGRESS' };
}

function enqueue(state: RoomState, item: QueuedChallenge): RoomState {
  return { ...state, challengeQueue: [...state.challengeQueue, item] };
}

export function useGameState(roomId: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsub = onValue(
      roomRef,
      (snapshot) => {
        setRoom(snapshot.val());
        setLoading(false);
        setConnectionError(null);
      },
      (err) => {
        setConnectionError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [roomId]);

  return { room, loading, connectionError };
}

export async function createRoom(role: PlayerRole): Promise<string> {
  let roomId = randomRoomCode();
  // Vanishingly unlikely to collide, but check once anyway.
  for (let attempt = 0; attempt < 3; attempt++) {
    const snap = await get(ref(db, `rooms/${roomId}`));
    if (!snap.exists()) break;
    roomId = randomRoomCode();
  }
  const state = newRoomState(roomId);
  state.players[role] = { joinedAt: Date.now(), connected: true };
  await set(ref(db, `rooms/${roomId}`), state);
  return roomId;
}

export async function joinRoom(roomId: string, role: PlayerRole): Promise<{ ok: true } | { ok: false; error: string }> {
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  if (!snap.exists()) return { ok: false, error: 'That room code does not exist. Double-check it and try again.' };

  const result = await runTransaction(roomRef, (current: RoomState | null) => {
    if (!current) return current;
    if (current.players[role]?.connected) {
      // Someone is already connected as this role - treat as a reconnect only
      // if it's the same tab reloading is out of scope here, so just refuse.
      return current;
    }
    current.players[role] = { joinedAt: Date.now(), connected: true };
    if (current.players.JANA && current.players.YOUSSEF) {
      current.status = 'IN_PROGRESS';
    }
    return current;
  });

  if (!result.committed) return { ok: false, error: 'Could not join that room right now. Try again.' };
  const finalState: RoomState = result.snapshot.val();
  if (!finalState) return { ok: false, error: 'That room no longer exists.' };
  return { ok: true };
}

export async function markConnected(roomId: string, role: PlayerRole, connected: boolean) {
  const roomRef = ref(db, `rooms/${roomId}/players/${role}/connected`);
  await set(roomRef, connected);
}

interface MoveResult {
  ok: boolean;
  reason?: string;
}

export async function makeMove(
  roomId: string,
  role: PlayerRole,
  from: string,
  to: string,
  promotion?: string
): Promise<MoveResult> {
  const roomRef = ref(db, `rooms/${roomId}`);
  let outcome: MoveResult = { ok: false, reason: 'Move rejected.' };

  await runTransaction(roomRef, (current: RoomState | null) => {
    if (!current) return current;
    if (current.status !== 'IN_PROGRESS') {
      outcome = { ok: false, reason: 'The board is frozen until the current challenge is resolved.' };
      return current;
    }
    if (current.turn !== roleColor[role]) {
      outcome = { ok: false, reason: "It's not your turn." };
      return current;
    }

    const chess = new Chess(current.fen);
    let move;
    try {
      move = chess.move({ from, to, promotion: promotion ?? 'q' });
    } catch {
      move = null;
    }
    if (!move) {
      outcome = { ok: false, reason: 'Illegal move.' };
      return current;
    }

    let next: RoomState = {
      ...current,
      fen: chess.fen(),
      pgn: chess.pgn(),
      turn: chess.turn(),
      lastMoveAt: Date.now(),
    };

    const { map, capturedOrigin } = applyMoveToOriginMap(current.whiteOriginMap, {
      from: move.from,
      to: move.to,
      color: move.color,
      captured: move.captured,
      flags: move.flags,
      promotion: move.promotion,
    });
    next.whiteOriginMap = map;

    if (capturedOrigin) {
      next.capturedJanaOrigins = [...next.capturedJanaOrigins, capturedOrigin];
      const category = categoryForOrigin(capturedOrigin);

      if (category === 'queen') {
        next = enqueue(next, { challengeId: 'queen-d1', triggeredBy: 'capture', pieceOrigin: capturedOrigin });
      } else {
        const challenge = pieceChallenges[capturedOrigin];
        if (challenge) {
          next = enqueue(next, { challengeId: challenge.id, triggeredBy: 'capture', pieceOrigin: capturedOrigin });
        }
      }

      // --- Achievements & combos, evaluated on Jana-piece captures ---
      const pawnCaptures = next.capturedJanaOrigins.filter((o) => categoryForOrigin(o) === 'pawn').length;
      const totalCaptures = next.capturedJanaOrigins.length;
      const hasQueen = next.capturedJanaOrigins.some((o) => categoryForOrigin(o) === 'queen');
      const hasRook = next.capturedJanaOrigins.some((o) => categoryForOrigin(o) === 'rook');

      if (pawnCaptures >= 3) next.achievements = addAchievement(next.achievements, 'PAWN_COLLECTOR');
      if (totalCaptures >= 5) next.achievements = addAchievement(next.achievements, 'RUTHLESS');
      if (hasQueen) next.achievements = addAchievement(next.achievements, 'QUEEN_SLAYER');

      if (pawnCaptures === 3 && !next.comboFlags.threePawns) {
        next.comboFlags = { ...next.comboFlags, threePawns: true };
        next = enqueue(next, { challengeId: comboThreePawnsChallenge.id, triggeredBy: 'combo' });
      }
      if (hasQueen && hasRook && !next.comboFlags.queenPlusRook) {
        next.comboFlags = { ...next.comboFlags, queenPlusRook: true };
        next = enqueue(next, { challengeId: comboHighRollerChallenge.id, triggeredBy: 'combo' });
      }
      if (totalCaptures >= 5 && !next.comboFlags.fiveOrMore) {
        next.comboFlags = { ...next.comboFlags, fiveOrMore: true };
      }

      // Flavor achievement: castling anywhere in the game so far = "big brain" chess habit.
      if (move.flags.includes('k') || move.flags.includes('q')) {
        next.achievements = addAchievement(next.achievements, 'CHESS_BRAIN');
      }
    }

    // --- Check / checkmate / draw detection ---
    if (chess.isCheckmate()) {
      next.lastResult = 'checkmate';
      next.winner = move.color;
      // The color that just moved delivered mate.
      if (move.color === 'b') {
        next.achievements = addAchievement(next.achievements, 'GRANDMASTER');
        // Material-down win check for BIG_BRAIN: did Youssef (black) win while
        // having captured LESS total piece value than Jana captured of his?
        const janaLostValue = next.capturedJanaOrigins.reduce((sum, o) => sum + pieceValue(categoryForOrigin(o)), 0);
        // We don't track Youssef's captured-piece identities (no challenges attached),
        // so approximate using chess.js's remaining board material instead.
        const board = chess.board();
        let whiteMaterial = 0;
        let blackMaterial = 0;
        for (const row of board) {
          for (const sq of row) {
            if (!sq) continue;
            const v = pieceValue(
              sq.type === 'p' ? 'pawn' : sq.type === 'n' ? 'knight' : sq.type === 'b' ? 'bishop' : sq.type === 'r' ? 'rook' : sq.type === 'q' ? 'queen' : 'king'
            );
            if (sq.color === 'w') whiteMaterial += v;
            else blackMaterial += v;
          }
        }
        if (blackMaterial < whiteMaterial || janaLostValue < 9) {
          next.achievements = addAchievement(next.achievements, 'BIG_BRAIN');
        }
        next = enqueue(next, { challengeId: kingAmaChallenge.id, triggeredBy: 'checkmate' });
      } else {
        // Jana delivered mate - Youssef lost the chess game. This skips the
        // King/Final Boss narrative (that's reserved for Youssef winning,
        // per section 18 of the brief) and goes straight to Loser's
        // Redemption once the queue (if any) is empty - see advanceQueue.
      }
    } else if (chess.isStalemate() || chess.isDraw()) {
      next.lastResult = chess.isStalemate() ? 'stalemate' : 'draw';
    } else if (chess.isCheck() && move.color === 'b') {
      const ply = chess.history().length;
      if (next.checkEventShownForPly !== ply) {
        next.checkEventPending = true;
        next.checkEventShownForPly = ply;
      }
    }

    next = advanceQueue(next);
    // advanceQueue may have reset status to IN_PROGRESS even when we're mid
    // checkmate sequence with nothing queued yet - that's fine, the queue
    // items above were already pushed before this call.

    outcome = { ok: true };
    return next;
  });

  return outcome;
}

export async function completeActiveChallenge(roomId: string, answerText: string): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (current: RoomState | null) => {
    if (!current || !current.activeChallenge) return current;
    const challengeId = current.activeChallenge.challengeId;

    const answer: ChallengeAnswer = { challengeId, answer: answerText, completedAt: Date.now() };
    let next: RoomState = {
      ...current,
      answers: { ...current.answers, [challengeId]: answer },
      completedChallengeIds: current.completedChallengeIds.includes(challengeId)
        ? current.completedChallengeIds
        : [...current.completedChallengeIds, challengeId],
    };

    if (challengeId === 'queen-d1') {
      next = enqueue(next, { challengeId: queenReverseChallenge.id, triggeredBy: 'capture' });
    }
    if (challengeId === 'king-ama') {
      next = enqueue(next, { challengeId: finalBossChallenge.id, triggeredBy: 'finalboss' });
    }
    if (challengeId === 'final-boss') {
      next.finalRewardRevealed = true;
      next.achievements = addAchievement(next.achievements, 'GAMBIT_SURVIVOR');
    }

    next.activeChallenge = null;
    next = advanceQueue(next);
    return next;
  });
}

export async function resolveCheckEvent(roomId: string, choice: 'keep' | 'attack'): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (current: RoomState | null) => {
    if (!current) return current;
    let next: RoomState = { ...current, checkEventPending: false };
    if (choice === 'attack') {
      const pick = checkAttackChallenges[Math.floor(Math.random() * checkAttackChallenges.length)];
      next = enqueue(next, { challengeId: pick.id, triggeredBy: 'check' });
      next = advanceQueue(next);
    }
    return next;
  });
}

export async function markMoment(roomId: string, achievementId: AchievementId): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (current: RoomState | null) => {
    if (!current) return current;
    return { ...current, achievements: addAchievement(current.achievements, achievementId) };
  });
}

export async function setLoserRedemptionChoice(roomId: string, choice: string): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}/loserRedemptionChoice`);
  await set(roomRef, choice);
}

export async function resetRoomForRematch(roomId: string): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);
  await runTransaction(roomRef, (current: RoomState | null) => {
    if (!current) return current;
    const fresh = newRoomState(roomId);
    fresh.players = current.players;
    fresh.createdAt = current.createdAt;
    return fresh;
  });
}
