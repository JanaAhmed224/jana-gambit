import { useEffect, useMemo, useState } from 'react';
import type { Challenge, QueuedChallenge } from '../game/types';
import { sfx } from '../utils/sound';

interface Props {
  queued: QueuedChallenge;
  challenge: Challenge;
  onComplete: (answer: string) => void;
}

type Phase = 'reveal' | 'active' | 'done';

export default function ChallengeModal({ queued, challenge, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>(queued.triggeredBy === 'capture' ? 'reveal' : 'active');

  useEffect(() => {
    setPhase(queued.triggeredBy === 'capture' ? 'reveal' : 'active');
  }, [challenge.id]);

  useEffect(() => {
    if (phase === 'active') sfx.challengeReveal();
  }, [phase]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={challenge.title}>
      <div className="modal card">
        {phase === 'reveal' ? (
          <RevealStage onContinue={() => setPhase('active')} />
        ) : (
          <ChallengeBody challenge={challenge} onComplete={onComplete} />
        )}
      </div>
    </div>
  );
}

function RevealStage({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="center-col" style={{ padding: '12px 0' }}>
      <div style={{ fontSize: 46 }}>♟️</div>
      <div className="display-title" style={{ fontSize: 28 }}>
        PIECE CAPTURED
      </div>
      <p className="muted">You unlocked something.</p>
      <button className="btn btn-primary" onClick={onContinue}>
        Reveal it
      </button>
    </div>
  );
}

function ChallengeBody({ challenge, onComplete }: { challenge: Challenge; onComplete: (answer: string) => void }) {
  switch (challenge.kind) {
    case 'TEXT_PROMPT':
      return <TextPrompt challenge={challenge} onComplete={onComplete} />;
    case 'VOICE_NOTE':
      return <VoiceNotePrompt challenge={challenge} onComplete={onComplete} />;
    case 'TIMED_PROMPT':
      return <TimedPrompt challenge={challenge} onComplete={onComplete} />;
    case 'IMPERSONATION':
      return <TimedPrompt challenge={challenge} onComplete={onComplete} />;
    case 'RANKING':
      return <RankingChallenge challenge={challenge} onComplete={onComplete} />;
    case 'WOULD_YOU_RATHER':
      return <WouldYouRather challenge={challenge} onComplete={onComplete} />;
    case 'MULTI_QUESTION':
      return <MultiQuestion challenge={challenge} onComplete={onComplete} />;
    case 'CHOICE':
      return <ChoiceChallenge challenge={challenge} onComplete={onComplete} />;
    default:
      return <TextPrompt challenge={challenge} onComplete={onComplete} />;
  }
}

function Header({ challenge }: { challenge: Challenge }) {
  return (
    <>
      <div className="modal-eyebrow">{challenge.title}</div>
    </>
  );
}

function TextPrompt({ challenge, onComplete }: { challenge: Challenge; onComplete: (a: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div>
      <Header challenge={challenge} />
      <p style={{ fontSize: 18 }}>{challenge.prompt}</p>
      {challenge.flavor && <p className="muted" style={{ fontStyle: 'italic', fontSize: 14 }}>{challenge.flavor}</p>}
      {challenge.forbiddenWords && (
        <div className="forbidden-words">
          {challenge.forbiddenWords.map((w) => (
            <span key={w} className="forbidden-word">
              {w}
            </span>
          ))}
        </div>
      )}
      <textarea
        className="field"
        placeholder="Type your answer..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" disabled={!value.trim()} onClick={() => onComplete(value.trim())}>
          Challenge Complete ✓
        </button>
      </div>
    </div>
  );
}

function VoiceNotePrompt({ challenge, onComplete }: { challenge: Challenge; onComplete: (a: string) => void }) {
  return (
    <div>
      <Header challenge={challenge} />
      <p style={{ fontSize: 18 }}>{challenge.prompt}</p>
      {challenge.flavor && <p className="muted" style={{ fontStyle: 'italic', fontSize: 14 }}>{challenge.flavor}</p>}
      <p className="muted" style={{ fontSize: 13 }}>
        Send the voice note however you two talk (WhatsApp, iMessage, whatever) - this app doesn't record audio. Tap
        below once you've sent it.
      </p>
      <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={() => onComplete('(voice note sent outside the app)')}>
          Sent it ✓
        </button>
      </div>
    </div>
  );
}

function TimedPrompt({ challenge, onComplete }: { challenge: Challenge; onComplete: (a: string) => void }) {
  const total = challenge.seconds ?? 30;
  const [secondsLeft, setSecondsLeft] = useState(total);
  const [value, setValue] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [started, secondsLeft]);

  return (
    <div>
      <Header challenge={challenge} />
      <p style={{ fontSize: 18 }}>{challenge.prompt}</p>
      {challenge.flavor && <p className="muted" style={{ fontStyle: 'italic', fontSize: 14 }}>{challenge.flavor}</p>}
      {!started ? (
        <button className="btn btn-primary btn-block" onClick={() => setStarted(true)}>
          Start {total}s timer
        </button>
      ) : (
        <>
          <div className="center-col" style={{ padding: '8px 0' }}>
            <div className="timer-ring">{secondsLeft}s</div>
          </div>
          <textarea
            className="field"
            placeholder="Notes / what you said (optional)..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={() => onComplete(value.trim() || '(done live, no notes)')}>
              Challenge Complete ✓
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RankingChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (a: string) => void }) {
  const items = challenge.items ?? [];
  const [index, setIndex] = useState(0);
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const used = useMemo(() => new Set(Object.values(ranks)), [ranks]);

  if (index >= items.length) {
    const summary = items.map((it) => `${it}: ${ranks[it]}`).join(', ');
    return (
      <div>
        <Header challenge={challenge} />
        <p style={{ fontSize: 18 }}>Final ranking:</p>
        <ul>
          {[...items]
            .sort((a, b) => (ranks[a] ?? 0) - (ranks[b] ?? 0))
            .map((it) => (
              <li key={it}>
                #{ranks[it]} - {it}
              </li>
            ))}
        </ul>
        <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => onComplete(summary)}>
            Challenge Complete ✓
          </button>
        </div>
      </div>
    );
  }

  const current = items[index];
  return (
    <div>
      <Header challenge={challenge} />
      <p style={{ fontSize: 18 }}>{challenge.prompt}</p>
      <p className="display-title" style={{ fontSize: 26 }}>
        {current}
      </p>
      <div className="btn-row">
        {[1, 2, 3, 4, 5]
          .filter((n) => !used.has(n))
          .map((n) => (
            <button
              key={n}
              className="btn"
              onClick={() => {
                setRanks((r) => ({ ...r, [current]: n }));
                setIndex((i) => i + 1);
              }}
            >
              {n}
            </button>
          ))}
      </div>
    </div>
  );
}

function WouldYouRather({ challenge, onComplete }: { challenge: Challenge; onComplete: (a: string) => void }) {
  const qs = challenge.subPrompts ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  if (index >= qs.length) {
    return (
      <div>
        <Header challenge={challenge} />
        <p style={{ fontSize: 18 }}>All done.</p>
        <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => onComplete(answers.join(' | '))}>
            Challenge Complete ✓
          </button>
        </div>
      </div>
    );
  }

  const [optionA, optionB] = qs[index].replace('Would you rather ', '').split(' or ');

  function choose(choice: string) {
    setAnswers((a) => [...a, `Q${index + 1}: ${choice}`]);
    setIndex((i) => i + 1);
  }

  return (
    <div>
      <Header challenge={challenge} />
      <p className="step-eyebrow">
        Question {index + 1} of {qs.length}
      </p>
      <p style={{ fontSize: 18 }}>{qs[index]}</p>
      <div className="choice-list" style={{ marginTop: 14 }}>
        <button className="choice-btn" onClick={() => choose(optionA?.trim() ?? 'A')}>
          {optionA?.trim() ?? 'Option A'}
        </button>
        <button className="choice-btn" onClick={() => choose(optionB?.trim() ?? 'B')}>
          {optionB?.trim() ?? 'Option B'}
        </button>
      </div>
    </div>
  );
}

function MultiQuestion({ challenge, onComplete }: { challenge: Challenge; onComplete: (a: string) => void }) {
  const qs = challenge.subPrompts ?? [];
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);

  if (index >= qs.length) {
    return (
      <div>
        <Header challenge={challenge} />
        <p style={{ fontSize: 18 }}>All questions answered.</p>
        <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => onComplete(answers.join(' || '))}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header challenge={challenge} />
      {challenge.prompt && index === 0 && <p className="muted">{challenge.prompt}</p>}
      <p className="step-eyebrow">
        Question {index + 1} of {qs.length}
      </p>
      <p style={{ fontSize: 18 }}>{qs[index]}</p>
      <textarea className="field" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Answer..." />
      <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          disabled={!value.trim()}
          onClick={() => {
            setAnswers((a) => [...a, value.trim()]);
            setValue('');
            setIndex((i) => i + 1);
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function ChoiceChallenge({ challenge, onComplete }: { challenge: Challenge; onComplete: (a: string) => void }) {
  return (
    <div>
      <Header challenge={challenge} />
      <p style={{ fontSize: 18 }}>{challenge.prompt}</p>
      <div className="choice-list" style={{ marginTop: 14 }}>
        {(challenge.options ?? []).map((opt) => (
          <button key={opt} className="choice-btn" onClick={() => onComplete(opt)}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
