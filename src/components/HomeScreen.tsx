import { gameConfig } from '../config/gameConfig';

interface Props {
  onCreate: () => void;
  onJoin: () => void;
  onHowToPlay: () => void;
}

export default function HomeScreen({ onCreate, onJoin, onHowToPlay }: Props) {
  return (
    <div className="center-col" style={{ marginTop: '12vh' }}>
      <div className="crest">♟️ Two Players Only</div>
      <h1 className="display-title" style={{ fontSize: 52, margin: '6px 0' }}>
        {gameConfig.theme.title}
      </h1>
      <p className="muted" style={{ fontSize: 17 }}>
        {gameConfig.theme.homeTagline}
      </p>
      <div className="btn-row" style={{ marginTop: 18 }}>
        <button className="btn btn-primary" onClick={onCreate}>
          Create Game
        </button>
        <button className="btn" onClick={onJoin}>
          Join Game
        </button>
      </div>
      <button className="btn btn-ghost" onClick={onHowToPlay} style={{ marginTop: 4 }}>
        How to Play
      </button>
    </div>
  );
}
