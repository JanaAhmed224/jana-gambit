export default function HowToPlay({ onBack }: { onBack: () => void }) {
  return (
    <div className="center-col" style={{ marginTop: '8vh' }}>
      <h2 className="display-title" style={{ fontSize: 36 }}>
        How to Play
      </h2>
      <div className="card" style={{ textAlign: 'left', maxWidth: 480 }}>
        <ul style={{ lineHeight: 1.9, paddingLeft: 20, margin: 0 }}>
          <li>It's real, fully legal chess. Jana plays white, Youssef plays black.</li>
          <li>One of you creates a room and sends the code to the other.</li>
          <li>Every capture may unlock something. You won't know what until it happens.</li>
          <li>Some events are hidden.</li>
          <li>Checkmate doesn't necessarily mean the game is over.</li>
          <li>Refreshing the page is safe - the game remembers exactly where you left off.</li>
        </ul>
      </div>
      <button className="btn" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
