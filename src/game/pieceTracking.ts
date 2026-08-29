// chess.js only knows piece TYPES ("this move captured a pawn"), not piece
// IDENTITY ("this move captured Jana's b-pawn specifically"). Since every one
// of Jana's pieces has its own hidden challenge, we track identity ourselves
// by following each white piece from its starting square across moves.
//
// The "origin square" (a2, e1, d1, ...) is a stable ID for a piece for the
// whole game and is also the key used in config/challenges.ts.

export function initialWhiteOriginMap(): Record<string, string> {
  const map: Record<string, string> = {};
  const files = 'abcdefgh';
  for (const f of files) map[`${f}2`] = `${f}2`;
  map.a1 = 'a1';
  map.h1 = 'h1';
  map.b1 = 'b1';
  map.g1 = 'g1';
  map.c1 = 'c1';
  map.f1 = 'f1';
  map.d1 = 'd1';
  map.e1 = 'e1';
  return map;
}

export interface MinimalMove {
  from: string;
  to: string;
  color: 'w' | 'b';
  captured?: string;
  flags: string;
  promotion?: string;
}

export interface ApplyMoveResult {
  map: Record<string, string>;
  capturedOrigin: string | null;
}

/**
 * Advance the origin map by one chess.js move. Returns the new map plus the
 * origin square of any Jana (white) piece that was captured on this move,
 * so the caller can look up which challenge to fire.
 */
export function applyMoveToOriginMap(
  map: Record<string, string>,
  move: MinimalMove
): ApplyMoveResult {
  const next = { ...map };
  let capturedOrigin: string | null = null;

  // A capture removes a white piece only when BLACK (Youssef) is the mover.
  if (move.captured && move.color === 'b') {
    let capturedSquare = move.to;
    if (move.flags.includes('e')) {
      // En passant: the captured pawn sits on the same file as `to`,
      // same rank as `from` (not on the destination square itself).
      capturedSquare = move.to[0] + move.from[1];
    }
    capturedOrigin = next[capturedSquare] ?? null;
    delete next[capturedSquare];
  }

  // Only white piece movement needs to be tracked in this map.
  if (move.color === 'w') {
    const origin = next[move.from];
    delete next[move.from];
    if (origin) next[move.to] = origin;

    // Castling also relocates the rook.
    if (move.flags.includes('k')) {
      const rank = move.from[1];
      const rookFrom = `h${rank}`;
      const rookTo = `f${rank}`;
      const rookOrigin = next[rookFrom];
      delete next[rookFrom];
      if (rookOrigin) next[rookTo] = rookOrigin;
    } else if (move.flags.includes('q')) {
      const rank = move.from[1];
      const rookFrom = `a${rank}`;
      const rookTo = `d${rank}`;
      const rookOrigin = next[rookFrom];
      delete next[rookFrom];
      if (rookOrigin) next[rookTo] = rookOrigin;
    }
  }

  return { map: next, capturedOrigin };
}

export type PieceCategory = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export function categoryForOrigin(origin: string): PieceCategory {
  if (origin.endsWith('2')) return 'pawn';
  if (origin === 'b1' || origin === 'g1') return 'knight';
  if (origin === 'c1' || origin === 'f1') return 'bishop';
  if (origin === 'a1' || origin === 'h1') return 'rook';
  if (origin === 'd1') return 'queen';
  return 'king';
}
