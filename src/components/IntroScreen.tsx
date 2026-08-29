import { useEffect, useState } from 'react';
import type { PlayerRole } from '../game/types';
import { gameConfig } from '../config/gameConfig';

const lines = ['A perfectly normal chess game.', 'Probably.', 'Every piece you capture may contain a secret.'];

export default function IntroScreen({ role, onBegin }: { role: PlayerRole; onBegin: () => void }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= lines.length) return;
    const t = setTimeout(() => setVisible((v) => v + 1), 1100);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div className="center-col" style={{ marginTop: '14vh', minHeight: '50vh', justifyContent: 'center' }}>
      <div className="crest">♟️</div>
      <h1 className="display-title gold-underline" style={{ fontSize: 44 }}>
        {gameConfig.theme.title}
      </h1>
      <div style={{ minHeight: 90 }}>
        {lines.slice(0, visible).map((line, i) => (
          <p
            key={i}
            className={i === 0 ? 'muted' : 'display-title'}
            style={{ fontSize: i === 0 ? 16 : 22, margin: '6px 0', animation: 'fadeIn 0.6s ease' }}
          >
            {line}
          </p>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 14 }}>
        {role === 'JANA' ? 'Your pieces are carrying secrets.' : 'Every capture might unlock something.'}
      </p>
      {visible >= lines.length && (
        <button className="btn btn-primary" onClick={onBegin}>
          Begin
        </button>
      )}
    </div>
  );
}
