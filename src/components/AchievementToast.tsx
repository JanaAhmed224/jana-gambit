import { useEffect } from 'react';
import { achievementInfo } from '../config/challenges';
import type { AchievementId } from '../game/types';
import { sfx } from '../utils/sound';

export default function AchievementToast({ id, onDone }: { id: AchievementId; onDone: () => void }) {
  const info = achievementInfo[id];

  useEffect(() => {
    sfx.achievement();
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
  }, [id]);

  if (!info) return null;

  return (
    <div className="toast" role="status">
      <span style={{ fontSize: 22 }}>{info.icon}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>ACHIEVEMENT UNLOCKED</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {info.label}
        </div>
      </div>
    </div>
  );
}
