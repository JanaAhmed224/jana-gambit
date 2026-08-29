import { gameConfig } from '../config/gameConfig';

export default function FinalReward() {
  const song = gameConfig.finalSong;
  return (
    <div className="center-col" style={{ marginTop: '10vh' }}>
      <div style={{ fontSize: 40 }}>🏆</div>
      <h2 className="display-title" style={{ fontSize: 30 }}>
        Achievement Unlocked
      </h2>
      <p className="muted" style={{ marginTop: -8 }}>You Survived The Jana Gambit</p>
      <div className="card" style={{ marginTop: 12, width: '100%', maxWidth: 380 }}>
        <p className="muted" style={{ margin: '0 0 10px' }}>One final thing.</p>
        {song.url ? (
          <>
            <p className="display-title" style={{ fontSize: 22, margin: '0 0 4px' }}>
              {song.title}
            </p>
            <p className="muted" style={{ margin: '0 0 16px' }}>{song.artist}</p>
            <a className="btn btn-primary btn-block" href={song.url} target="_blank" rel="noreferrer">
              {song.message || 'Press play.'}
            </a>
          </>
        ) : (
          <p className="muted" style={{ fontSize: 14 }}>
            (Jana hasn't set the final song yet - edit <code>src/config/gameConfig.ts</code>.)
          </p>
        )}
      </div>
    </div>
  );
}
