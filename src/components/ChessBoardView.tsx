import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import type { PlayerRole } from '../game/types';
import { sfx } from '../utils/sound';

interface Props {
  fen: string;
  role: PlayerRole;
  myTurn: boolean;
  frozen: boolean;
  onMove: (from: string, to: string) => Promise<{ ok: boolean; reason?: string }>;
  onIllegalMove: (reason: string) => void;
}

export default function ChessBoardView({ fen, role, myTurn, frozen, onMove, onIllegalMove }: Props) {
  const orientation = role === 'JANA' ? 'white' : 'black';

  // react-chessboard needs a synchronous true/false answer, but the source of
  // truth for a move lives in Firebase (async). So we validate legality
  // locally first for instant feedback, optimistically accept the drop, and
  // fire the real move off to the server - if the server ever disagrees
  // (a rare race), the next synced `fen` prop corrects the board.
  function handleDrop(sourceSquare: string, targetSquare: string): boolean {
    if (frozen) {
      onIllegalMove('The board is frozen until the current challenge is resolved.');
      return false;
    }
    if (!myTurn) {
      onIllegalMove("It's not your turn.");
      return false;
    }

    const local = new Chess(fen);
    try {
      const move = local.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
      if (!move) {
        onIllegalMove('Illegal move.');
        return false;
      }
    } catch {
      onIllegalMove('Illegal move.');
      return false;
    }

    sfx.move();
    onMove(sourceSquare, targetSquare).then((result) => {
      if (!result.ok) onIllegalMove(result.reason ?? 'Illegal move.');
    });
    return true;
  }

  return (
    <div className={`board-wrap${frozen ? ' board-frozen' : ''}`}>
      <Chessboard
        position={fen}
        onPieceDrop={handleDrop}
        boardOrientation={orientation}
        arePiecesDraggable={!frozen && myTurn}
        customDarkSquareStyle={{ backgroundColor: '#3a3630' }}
        customLightSquareStyle={{ backgroundColor: '#efe7d6' }}
        customBoardStyle={{ borderRadius: '14px' }}
        animationDuration={180}
      />
    </div>
  );
}
