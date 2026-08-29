import { sfx } from '../utils/sound';
import { resolveCheckEvent } from '../game/useGameState';

export default function CheckEventBanner({ roomId }: { roomId: string }) {
  return (
    <div className="banner" role="alert">
      <div style={{ fontWeight: 700, marginBottom: 6 }}>⚔️ Check.</div>
      <p className="muted" style={{ margin: '0 0 12px', fontSize: 14 }}>
        Youssef, want to keep the pace up, or press your luck?
      </p>
      <div className="btn-row">
        <button className="btn" onClick={() => resolveCheckEvent(roomId, 'keep')}>
          Keep Playing
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            sfx.check();
            resolveCheckEvent(roomId, 'attack');
          }}
        >
          Attack Mode
        </button>
      </div>
    </div>
  );
}
