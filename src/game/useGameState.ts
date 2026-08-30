import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { ref, onValue, runTransaction, set, get } from 'firebase/database';
import { db } from '../firebase';
import type {
  AchievementId,
  ChallengeAnswer,
  PlayerRole,
  QueuedChallenge,
  RoomState,
} from './types';
import {
  applyMoveToOriginMap,
  categoryForOrigin,
  initialWhiteOriginMap,
} from './pieceTracking';
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

const roleColor: Record<PlayerRole, 'w' | 'b'> = {
  JANA: 'w',
  YOUSSEF: 'b',
};

function randomRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return `${gameConfig.roomCodePrefix}-${code}`;
}

/**
 * Firebase rooms can outlive code changes.
 * This makes old/incomplete room objects safe to render.
 */
function normalizeRoomState(raw: Partial<RoomState> | null, roomId: string): RoomState | null {
  if (!raw) return null;

  const chess = new Chess();

  return {
    roomId: raw.roomId ?? roomId,
    createdAt: raw.createdAt ?? Date.now(),
    fen: raw.fen ?? chess.fen(),
    pgn: raw.pgn ?? '',
    turn: raw.turn === 'b' ? 'b' : 'w',
    status: raw.status ?? 'WAITING_FOR_PLAYERS',

    players: raw.players ?? {},

    whiteOriginMap: raw.whiteOriginMap ?? initialWhiteOriginMap(),

    capturedJanaOrigins: Array.isArray(raw.capturedJanaOrigins)
      ? raw.capturedJanaOrigins
      : [],

    completedChallengeIds: Array.isArray(raw.completedChallengeIds)
      ? raw.completedChallengeIds
      : [],

    challengeQueue: Array.isArray(raw.challengeQueue)
      ? raw.challengeQueue
      : [],

    activeChallenge: raw.activeChallenge ?? null,

    answers: raw.answers ?? {},

    achievements: Array.isArray(raw.achievements)
      ? raw.achievements
      : [],

    comboFlags: {
      threePawns: raw.comboFlags?.threePawns ?? false,
      queenPlusRook: raw.comboFlags?.queenPlusRook ?? false,
      fiveOrMore: raw.comboFlags?.fiveOrMore ?? false,
    },

    checkEventShownForPly:
      typeof raw.checkEventShownForPly === 'number'
        ? raw.checkEventShownForPly
        : null,

    checkEventPending: raw.checkEventPending ?? false,

    lastResult:
      raw.lastResult === 'checkmate' ||
      raw.lastResult === 'stalemate' ||
      raw.lastResult === 'draw'
        ? raw.lastResult
        : null,

    winner:
      raw.winner === 'w' || raw.winner === 'b'
        ? raw.winner
        : null,

    finalBossAnswers: Array.isArray(raw.finalBossAnswers)
      ? raw.finalBossAnswers
      : [],

    finalRewardRevealed: raw.finalRewardRevealed ?? false,

    loserRedemptionChoice: raw.loserRedemptionChoice ?? null,

    lastMoveAt: raw.lastMoveAt ?? Date.now(),
  };
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
    comboFlags: {
      threePawns: false,
      queenPlusRook: false,
      fiveOrMore: false,
    },
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

function addAchievement(
  list: AchievementId[],
  id: AchievementId
): AchievementId[] {
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

function advanceQueue(state: RoomState): RoomState {
  const queue = Array.isArray(state.challengeQueue)
    ? state.challengeQueue
    : [];

  if (queue.length > 0) {
    const [next, ...rest] = queue;

    return {
      ...state,
      activeChallenge: next,
      challengeQueue: rest,
      status: 'CHALLENGE_ACTIVE',
    };
  }

  if (
    state.lastResult === 'checkmate' &&
    (state.finalRewardRevealed || state.winner === 'w')
  ) {
    return {
      ...state,
      activeChallenge: null,
      status: 'COMPLETE',
    };
  }

  if (
    state.lastResult === 'stalemate' ||
    state.lastResult === 'draw'
  ) {
    return {
      ...state,
      activeChallenge: null,
      status: 'COMPLETE',
    };
  }

  return {
    ...state,
    activeChallenge: null,
    status: 'IN_PROGRESS',
  };
}

function enqueue(
  state: RoomState,
  item: QueuedChallenge
): RoomState {
  return {
    ...state,
    challengeQueue: [
      ...(Array.isArray(state.challengeQueue)
        ? state.challengeQueue
        : []),
      item,
    ],
  };
}

export function useGameState(roomId: string | null) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setConnectionError(null);

    const roomRef = ref(db, `rooms/${roomId}`);

    const unsub = onValue(
      roomRef,
      (snapshot) => {
        const raw = snapshot.val();

        if (!raw) {
          setRoom(null);
        } else {
          setRoom(normalizeRoomState(raw, roomId));
        }

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

  return {
    room,
    loading,
    connectionError,
  };
}

export async function createRoom(
  role: PlayerRole
): Promise<string> {
  let roomId = randomRoomCode();

  for (let attempt = 0; attempt < 3; attempt++) {
    const snap = await get(ref(db, `rooms/${roomId}`));

    if (!snap.exists()) break;

    roomId = randomRoomCode();
  }

  const state = newRoomState(roomId);

  state.players[role] = {
    joinedAt: Date.now(),
    connected: true,
  };

  await set(ref(db, `rooms/${roomId}`), state);

  return roomId;
}

export async function joinRoom(
  roomId: string,
  role: PlayerRole
): Promise<{ ok: true } | { ok: false; error: string }> {
  const roomRef = ref(db, `rooms/${roomId}`);

  const snap = await get(roomRef);

  if (!snap.exists()) {
    return {
      ok: false,
      error:
        "That room code does not exist. Double-check it and try again.",
    };
  }

  const result = await runTransaction(
    roomRef,
    (current: RoomState | null) => {
      if (!current) return current;

      const players = current.players ?? {};

      if (players[role]?.connected) {
        return current;
      }

      const next: RoomState = {
        ...current,

        players: {
          ...players,
          [role]: {
            joinedAt: Date.now(),
            connected: true,
          },
        },
      };

      if (next.players.JANA && next.players.YOUSSEF) {
        next.status = 'IN_PROGRESS';
      }

      return next;
    }
  );

  if (!result.committed) {
    return {
      ok: false,
      error:
        'Could not join that room right now. Try again.',
    };
  }

  const finalState = normalizeRoomState(
    result.snapshot.val(),
    roomId
  );

  if (!finalState) {
    return {
      ok: false,
      error: "That room no longer exists.",
    };
  }

  return { ok: true };
}

export async function markConnected(
  roomId: string,
  role: PlayerRole,
  connected: boolean
) {
  await set(
    ref(db, `rooms/${roomId}/players/${role}/connected`),
    connected
  );
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

  let outcome: MoveResult = {
    ok: false,
    reason: 'Move rejected.',
  };

  await runTransaction(
    roomRef,
    (raw: RoomState | null) => {
      const current = normalizeRoomState(raw, roomId);

      if (!current) return raw;

      if (current.status !== 'IN_PROGRESS') {
        outcome = {
          ok: false,
          reason:
            'The board is frozen until the current challenge is resolved.',
        };

        return current;
      }

      if (current.turn !== roleColor[role]) {
        outcome = {
          ok: false,
          reason: "It's not your turn.",
        };

        return current;
      }

      const chess = new Chess(current.fen);

      let move;

      try {
        move = chess.move({
          from,
          to,
          promotion: promotion ?? 'q',
        });
      } catch {
        move = null;
      }

      if (!move) {
        outcome = {
          ok: false,
          reason: 'Illegal move.',
        };

        return current;
      }

      let next: RoomState = {
        ...current,
        fen: chess.fen(),
        pgn: chess.pgn(),
        turn: chess.turn(),
        lastMoveAt: Date.now(),
      };

      const tracking = applyMoveToOriginMap(
        current.whiteOriginMap,
        {
          from: move.from,
          to: move.to,
          color: move.color,
          captured: move.captured,
          flags: move.flags,
          promotion: move.promotion,
        }
      );

      next.whiteOriginMap = tracking.map;

      if (tracking.capturedOrigin) {
        next.capturedJanaOrigins = [
          ...next.capturedJanaOrigins,
          tracking.capturedOrigin,
        ];

        const category = categoryForOrigin(
          tracking.capturedOrigin
        );

        if (category === 'queen') {
          next = enqueue(next, {
            challengeId: 'queen-d1',
            triggeredBy: 'capture',
            pieceOrigin: tracking.capturedOrigin,
          });
        } else {
          const challenge =
            pieceChallenges[tracking.capturedOrigin];

          if (challenge) {
            next = enqueue(next, {
              challengeId: challenge.id,
              triggeredBy: 'capture',
              pieceOrigin: tracking.capturedOrigin,
            });
          }
        }

        const captured = next.capturedJanaOrigins;

        const pawnCaptures = captured.filter(
          (origin) =>
            categoryForOrigin(origin) === 'pawn'
        ).length;

        const totalCaptures = captured.length;

        const hasQueen = captured.some(
          (origin) =>
            categoryForOrigin(origin) === 'queen'
        );

        const hasRook = captured.some(
          (origin) =>
            categoryForOrigin(origin) === 'rook'
        );

        if (pawnCaptures >= 3) {
          next.achievements = addAchievement(
            next.achievements,
            'PAWN_COLLECTOR'
          );
        }

        if (totalCaptures >= 5) {
          next.achievements = addAchievement(
            next.achievements,
            'RUTHLESS'
          );
        }

        if (hasQueen) {
          next.achievements = addAchievement(
            next.achievements,
            'QUEEN_SLAYER'
          );
        }

        if (
          pawnCaptures === 3 &&
          !next.comboFlags.threePawns
        ) {
          next.comboFlags = {
            ...next.comboFlags,
            threePawns: true,
          };

          next = enqueue(next, {
            challengeId:
              comboThreePawnsChallenge.id,
            triggeredBy: 'combo',
          });
        }

        if (
          hasQueen &&
          hasRook &&
          !next.comboFlags.queenPlusRook
        ) {
          next.comboFlags = {
            ...next.comboFlags,
            queenPlusRook: true,
          };

          next = enqueue(next, {
            challengeId:
              comboHighRollerChallenge.id,
            triggeredBy: 'combo',
          });
        }

        if (
          totalCaptures >= 5 &&
          !next.comboFlags.fiveOrMore
        ) {
          next.comboFlags = {
            ...next.comboFlags,
            fiveOrMore: true,
          };
        }

        if (
          move.flags.includes('k') ||
          move.flags.includes('q')
        ) {
          next.achievements = addAchievement(
            next.achievements,
            'CHESS_BRAIN'
          );
        }
      }

      if (chess.isCheckmate()) {
        next.lastResult = 'checkmate';
        next.winner = move.color;

        if (move.color === 'b') {
          next.achievements = addAchievement(
            next.achievements,
            'GRANDMASTER'
          );

          const janaLostValue =
            next.capturedJanaOrigins.reduce(
              (sum, origin) =>
                sum +
                pieceValue(
                  categoryForOrigin(origin)
                ),
              0
            );

          const board = chess.board();

          let whiteMaterial = 0;
          let blackMaterial = 0;

          for (const row of board) {
            for (const square of row) {
              if (!square) continue;

              const value = pieceValue(
                square.type === 'p'
                  ? 'pawn'
                  : square.type === 'n'
                    ? 'knight'
                    : square.type === 'b'
                      ? 'bishop'
                      : square.type === 'r'
                        ? 'rook'
                        : square.type === 'q'
                          ? 'queen'
                          : 'king'
              );

              if (square.color === 'w') {
                whiteMaterial += value;
              } else {
                blackMaterial += value;
              }
            }
          }

          if (
            blackMaterial < whiteMaterial ||
            janaLostValue < 9
          ) {
            next.achievements = addAchievement(
              next.achievements,
              'BIG_BRAIN'
            );
          }

          next = enqueue(next, {
            challengeId: kingAmaChallenge.id,
            triggeredBy: 'checkmate',
          });
        }
      } else if (
        chess.isStalemate() ||
        chess.isDraw()
      ) {
        next.lastResult = chess.isStalemate()
          ? 'stalemate'
          : 'draw';
      } else if (
        chess.isCheck() &&
        move.color === 'b'
      ) {
        const ply = chess.history().length;

        if (next.checkEventShownForPly !== ply) {
          next.checkEventPending = true;
          next.checkEventShownForPly = ply;
        }
      }

      next = advanceQueue(next);

      outcome = { ok: true };

      return next;
    }
  );

  return outcome;
}

export async function completeActiveChallenge(
  roomId: string,
  answerText: string
): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);

  await runTransaction(
    roomRef,
    (raw: RoomState | null) => {
      const current = normalizeRoomState(raw, roomId);

      if (!current || !current.activeChallenge) {
        return current;
      }

      const challengeId =
        current.activeChallenge.challengeId;

      const answer: ChallengeAnswer = {
        challengeId,
        answer: answerText,
        completedAt: Date.now(),
      };

      let next: RoomState = {
        ...current,

        answers: {
          ...current.answers,
          [challengeId]: answer,
        },

        completedChallengeIds:
          current.completedChallengeIds.includes(
            challengeId
          )
            ? current.completedChallengeIds
            : [
                ...current.completedChallengeIds,
                challengeId,
              ],
      };

      if (challengeId === 'queen-d1') {
        next = enqueue(next, {
          challengeId: queenReverseChallenge.id,
          triggeredBy: 'capture',
        });
      }

      if (challengeId === 'king-ama') {
        next = enqueue(next, {
          challengeId: finalBossChallenge.id,
          triggeredBy: 'finalboss',
        });
      }

      if (challengeId === 'final-boss') {
        next.finalRewardRevealed = true;

        next.achievements = addAchievement(
          next.achievements,
          'GAMBIT_SURVIVOR'
        );
      }

      next.activeChallenge = null;

      return advanceQueue(next);
    }
  );
}

export async function resolveCheckEvent(
  roomId: string,
  choice: 'keep' | 'attack'
): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);

  await runTransaction(
    roomRef,
    (raw: RoomState | null) => {
      const current = normalizeRoomState(raw, roomId);

      if (!current) return current;

      let next: RoomState = {
        ...current,
        checkEventPending: false,
      };

      if (choice === 'attack') {
        if (checkAttackChallenges.length === 0) {
          return next;
        }

        const pick =
          checkAttackChallenges[
            Math.floor(
              Math.random() *
                checkAttackChallenges.length
            )
          ];

        next = enqueue(next, {
          challengeId: pick.id,
          triggeredBy: 'check',
        });

        next = advanceQueue(next);
      }

      return next;
    }
  );
}

export async function markMoment(
  roomId: string,
  achievementId: AchievementId
): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);

  await runTransaction(
    roomRef,
    (raw: RoomState | null) => {
      const current = normalizeRoomState(raw, roomId);

      if (!current) return current;

      return {
        ...current,
        achievements: addAchievement(
          current.achievements,
          achievementId
        ),
      };
    }
  );
}

export async function setLoserRedemptionChoice(
  roomId: string,
  choice: string
): Promise<void> {
  await set(
    ref(db, `rooms/${roomId}/loserRedemptionChoice`),
    choice
  );
}

export async function resetRoomForRematch(
  roomId: string
): Promise<void> {
  const roomRef = ref(db, `rooms/${roomId}`);

  await runTransaction(
    roomRef,
    (raw: RoomState | null) => {
      const current = normalizeRoomState(raw, roomId);

      if (!current) return current;

      const fresh = newRoomState(roomId);

      fresh.players = current.players;
      fresh.createdAt = current.createdAt;

      return fresh;
    }
  );
}