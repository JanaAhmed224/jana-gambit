import { loserRedemptionOptions } from '../config/challenges';
import { setLoserRedemptionChoice } from '../game/useGameState';
import type { RoomState } from '../game/types';

export default function LoserRedemption({ room }: { room: RoomState }) {
  return (
    <div className="center-col" style={{ marginTop: '10vh' }}>
      <h2 className="display-title" style={{ fontSize: 32 }}>
        Loser's Redemption
      </h2>
      <p className="muted">Losing the game doesn't mean losing everything. Pick one:</p>
      <div className="card" style={{ width: '100%', maxWidth: 420 }}>
        {room.loserRedemptionChoice ? (
          <p style={{ fontSize: 18 }}>You chose: {room.loserRedemptionChoice}</p>
        ) : (
          <div className="choice-list">
            {loserRedemptionOptions.map((opt) => (
              <button key={opt} className="choice-btn" onClick={() => setLoserRedemptionChoice(room.roomId, opt)}>
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
