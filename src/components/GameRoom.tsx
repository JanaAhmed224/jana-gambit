import { useEffect, useRef, useState } from 'react';
import type { AchievementId, PlayerRole } from '../game/types';
import {
  completeActiveChallenge,
  makeMove,
  markConnected,
  resetRoomForRematch,
  useGameState,
} from '../game/useGameState';
import { achievementInfo, getChallengeById } from '../config/challenges';
import { categoryForOrigin } from '../game/pieceTracking';
import { gameConfig } from '../config/gameConfig';
import { isMuted, setMuted, sfx } from '../utils/sound';
import ChessBoardView from './ChessBoardView';
import ChallengeModal from './ChallengeModal';
import CheckEventBanner from './CheckEventBanner';
import AchievementToast from './AchievementToast';
import IntroScreen from './IntroScreen';
import WaitingRoom from './WaitingRoom';
import FinalReward from './FinalReward';
import LoserRedemption from './LoserRedemption';

const pieceGlyph: Record<string, string> = {
  pawn: '♙',
  knight: '♘',
  bishop: '♗',
  rook: '♖',
  queen: '♕',
  king: '♔',
};

export default function GameRoom({ roomId, role }: { roomId: string; role: PlayerRole }) {
  const { room, loading, connectionError } = useGameState(roomId);
  const [introSeen, setIntroSeen] = useState(() => localStorage.getItem(`intro-${roomId}`) === '1');
  const [muted, setMutedState] = useState(isMuted());
  const [toastQueue, setToastQueue] = useState<AchievementId[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);
  const seenAchievements = useRef<Set<AchievementId>>(new Set());

  useEffect(() => {
    markConnected(roomId, role, true);
    const handleUnload = () => markConnected(roomId, role, false);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [roomId, role]);

  useEffect(() => {
    if (!room) return;
    const fresh = room.achievements.filter((a) => !seenAchievements.current.has(a));
    if (fresh.length) {
      fresh.forEach((a) => seenAchievements.current.add(a));
      setToastQueue((q) => [...q, ...fresh]);
    }
  }, [room?.achievements]);

  useEffect(() => {
    if (!moveError) return;
    const t = setTimeout(() => setMoveError(null), 3000);
    return () => clearTimeout(t);
  }, [moveError]);

  if (loading) return <p className="muted" style={{ marginTop: '20vh', textAlign: 'center' }}>Loading room…</p>;
  if (connectionError) {
    return (
      <div className="center-col" style={{ marginTop: '20vh' }}>
        <p>Can't reach the game server right now.</p>
        <p className="muted" style={{ fontSize: 13 }}>{connectionError}</p>
      </div>
    );
  }
  if (!room) {
    return (
      <div className="center-col" style={{ marginTop: '20vh' }}>
        <p>This room doesn't exist anymore.</p>
      </div>
    );
  }

  if (room.status === 'WAITING_FOR_PLAYERS') {
    return <WaitingRoom room={room} role={role} />;
  }

  if (!introSeen) {
    return (
      <IntroScreen
        role={role}
        onBegin={() => {
          localStorage.setItem(`intro-${roomId}`, '1');
          setIntroSeen(true);
        }}
      />
    );
  }

  const myTurn = (role === 'JANA' && room.turn === 'w') || (role === 'YOUSSEF' && room.turn === 'b');
  const frozen = room.status === 'CHALLENGE_ACTIVE';
  const activeChallengeContent = room.activeChallenge ? getChallengeById(room.activeChallenge.challengeId) : null;

  const unlockedSet = new Set(room.achievements);
  const allAchievementIds = Object.keys(achievementInfo) as AchievementId[];

  return (
    <div className="board-page">
      {toastQueue[0] && (
        <AchievementToast key={toastQueue[0]} id={toastQueue[0]} onDone={() => setToastQueue((q) => q.slice(1))} />
      )}

      <div className="top-bar">
        <div>
          <div className="crest" style={{ fontSize: 12 }}>{gameConfig.theme.title}</div>
          <div className="muted" style={{ fontSize: 13 }}>Room {room.roomId}</div>
        </div>
        <div className="btn-row" style={{ gap: 8 }}>
          <span className="turn-pill">
            {room.status === 'COMPLETE' ? 'Game over' : myTurn ? 'Your move' : `Waiting on ${role === 'JANA' ? gameConfig.playerNames.YOUSSEF : gameConfig.playerNames.JANA}`}
          </span>
          <button
            className="btn"
            onClick={() => {
              const next = !muted;
              setMuted(next);
              setMutedState(next);
            }}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {moveError && (
        <div className="banner" style={{ borderColor: 'var(--panel-border)', background: 'var(--ink-2)' }}>
          {moveError}
        </div>
      )}

      {room.checkEventPending && role === 'YOUSSEF' && <CheckEventBanner roomId={roomId} />}
      {room.checkEventPending && role === 'JANA' && (
        <div className="banner">
          <strong>Check!</strong> Waiting to see what Youssef does next…
        </div>
      )}

      {room.status === 'COMPLETE' ? (
        room.winner === 'w' ? (
          <LoserRedemption room={room} />
        ) : room.finalRewardRevealed ? (
          <FinalReward />
        ) : (
          <div className="center-col" style={{ marginTop: 40 }}>
            <h2 className="display-title">{room.lastResult === 'stalemate' ? 'Stalemate.' : 'Draw.'}</h2>
            <p className="muted">Nobody's secrets got out this time.</p>
          </div>
        )
      ) : null}

      {(
        <div className="game-layout">
          <ChessBoardView
            fen={room.fen}
            role={role}
            myTurn={myTurn && !frozen && room.status !== 'COMPLETE'}
            frozen={frozen}
            onMove={(from, to) => makeMove(roomId, role, from, to)}
            onIllegalMove={(reason) => setMoveError(reason)}
          />

          <div className="sidebar">
            <div className="card">
              <p className="step-eyebrow" style={{ marginTop: 0 }}>Captured</p>
              <div className="captured-row">
                {room.capturedJanaOrigins.length === 0 && <span className="muted" style={{ fontSize: 13 }}>None yet.</span>}
                {room.capturedJanaOrigins.map((origin, i) => (
                  <span key={`${origin}-${i}`} title={origin}>
                    {pieceGlyph[categoryForOrigin(origin)]}
                  </span>
                ))}
              </div>
            </div>

            <div className="card">
              <p className="step-eyebrow" style={{ marginTop: 0 }}>Achievements</p>
              <div className="achv-grid">
                {allAchievementIds.map((id) => {
                  const info = achievementInfo[id];
                  const unlocked = unlockedSet.has(id);
                  return (
                    <div key={id} className={`achv-chip${unlocked ? '' : ' locked'}`}>
                      <span>{unlocked ? info.icon : '🔒'}</span>
                      <span>{unlocked ? info.label : '???'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {room.status === 'COMPLETE' && (
              <button className="btn btn-block" onClick={() => resetRoomForRematch(roomId)}>
                Rematch
              </button>
            )}
          </div>
        </div>
      )}

      {activeChallengeContent && room.activeChallenge && (
        <ChallengeModal
          queued={room.activeChallenge}
          challenge={activeChallengeContent}
          onComplete={(answer) => {
            sfx.capture();
            completeActiveChallenge(roomId, answer);
          }}
        />
      )}
    </div>
  );
}
