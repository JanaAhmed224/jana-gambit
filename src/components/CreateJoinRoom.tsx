import { useState } from 'react';
import type { PlayerRole } from '../game/types';
import { createRoom, joinRoom } from '../game/useGameState';
import { gameConfig } from '../config/gameConfig';

interface Props {
  mode: 'create' | 'join';
  onDone: (roomId: string, role: PlayerRole) => void;
  onBack: () => void;
}

export default function CreateJoinRoom({ mode, onDone, onBack }: Props) {
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!role) {
      setError('Pick who you are first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        const roomId = await createRoom(role);
        onDone(roomId, role);
      } else {
        const trimmed = code.trim().toUpperCase();
        if (!trimmed) {
          setError('Enter the room code Jana sent you.');
          setBusy(false);
          return;
        }
        const result = await joinRoom(trimmed, role);
        if (!result.ok) {
          setError(result.error);
          setBusy(false);
          return;
        }
        onDone(trimmed, role);
      }
    } catch (e) {
      setError('Something went wrong talking to the game server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-col" style={{ marginTop: '10vh' }}>
      <h2 className="display-title" style={{ fontSize: 34 }}>
        {mode === 'create' ? 'Create Game' : 'Join Game'}
      </h2>
      <div className="card" style={{ width: '100%', maxWidth: 420, textAlign: 'left' }}>
        <p className="muted" style={{ marginTop: 0 }}>
          Who are you?
        </p>
        <div className="btn-row" style={{ justifyContent: 'flex-start', marginBottom: 18 }}>
          {(['JANA', 'YOUSSEF'] as PlayerRole[]).map((r) => (
            <button
              key={r}
              className="btn"
              style={role === r ? { borderColor: 'var(--gold)', background: 'var(--ink-2)' } : undefined}
              onClick={() => setRole(r)}
            >
              {gameConfig.playerNames[r]}
            </button>
          ))}
        </div>

        {mode === 'join' && (
          <>
            <p className="muted">Room code</p>
            <input
              className="field"
              placeholder={`${gameConfig.roomCodePrefix}-XXXXXX`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            />
          </>
        )}

        {error && (
          <p style={{ color: '#e3a9a9', fontSize: 14 }} role="alert">
            {error}
          </p>
        )}

        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onBack} disabled={busy}>
            Back
          </button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
            {busy ? 'Working...' : mode === 'create' ? 'Create Room' : 'Join Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
