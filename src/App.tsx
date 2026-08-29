import { useState } from 'react';
import type { PlayerRole } from './game/types';
import HomeScreen from './components/HomeScreen';
import CreateJoinRoom from './components/CreateJoinRoom';
import HowToPlay from './components/HowToPlay';
import GameRoom from './components/GameRoom';
import { isFirebaseConfigured } from './firebase';

type Phase = 'home' | 'create' | 'join' | 'howto' | 'room';

const SESSION_KEY = 'jana-gambit-session';

interface Session {
  roomId: string;
  role: PlayerRole;
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const [phase, setPhase] = useState<Phase>(session ? 'room' : 'home');

  if (!isFirebaseConfigured()) {
    return (
      <div className="app-shell">
        <div className="center-col" style={{ marginTop: '20vh' }}>
          <h2 className="display-title">Backend not configured</h2>
          <p className="muted">
            Add your Firebase project keys to <code>.env.local</code> (see <code>.env.example</code> and the README)
            before running the game.
          </p>
        </div>
      </div>
    );
  }

  function handleRoomReady(roomId: string, role: PlayerRole) {
    const next = { roomId, role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
    setPhase('room');
  }

  function leaveRoom() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPhase('home');
  }

  return (
    <div className="app-shell">
      {phase === 'home' && (
        <HomeScreen onCreate={() => setPhase('create')} onJoin={() => setPhase('join')} onHowToPlay={() => setPhase('howto')} />
      )}
      {phase === 'howto' && <HowToPlay onBack={() => setPhase('home')} />}
      {(phase === 'create' || phase === 'join') && (
        <CreateJoinRoom mode={phase} onDone={handleRoomReady} onBack={() => setPhase('home')} />
      )}
      {phase === 'room' && session && (
        <>
          <GameRoom roomId={session.roomId} role={session.role} />
          <button className="btn btn-ghost" style={{ marginTop: 18, fontSize: 12 }} onClick={leaveRoom}>
            Leave room
          </button>
        </>
      )}
    </div>
  );
}
