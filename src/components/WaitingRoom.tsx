import type { PlayerRole, RoomState } from '../game/types';
import { gameConfig } from '../config/gameConfig';

export default function WaitingRoom({ room, role }: { room: RoomState; role: PlayerRole }) {
  const other: PlayerRole = role === 'JANA' ? 'YOUSSEF' : 'JANA';
  const otherJoined = Boolean(room.players[other]?.connected);

  return (
    <div className="center-col" style={{ marginTop: '14vh' }}>
      <h2 className="display-title" style={{ fontSize: 30 }}>
        Waiting for {gameConfig.playerNames[other]}
      </h2>
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <p className="muted" style={{ margin: '0 0 8px' }}>
          Room code
        </p>
        <p className="display-title" style={{ fontSize: 34, letterSpacing: '0.08em', margin: '0 0 12px' }}>
          {room.roomId}
        </p>
        <p className="muted" style={{ fontSize: 14 }}>
          Send this code to {gameConfig.playerNames[other]}.
        </p>
        <div style={{ marginTop: 16 }}>
          {otherJoined ? (
            <span style={{ color: 'var(--gold-bright)' }}>● {gameConfig.playerNames[other]} is here. Starting…</span>
          ) : (
            <span className="muted">○ Waiting…</span>
          )}
        </div>
      </div>
    </div>
  );
}
