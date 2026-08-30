import { useEffect, useRef, useState } from 'react';
import type { AchievementId, ChallengeAnswer, PlayerRole } from '../game/types';
import {
  completeActiveChallenge,
  makeMove,
  markConnected,
  resetRoomForRematch,
  useGameState,
} from '../game/useGameState';
import { achievementInfo, getChallengeById } from '../config/challenges';
import { categoryForOrigin } from '../game/pieceTracking';
import { gameConfig } from '../config/gameConfig';
import { isMuted, setMuted, sfx } from '../utils/sound';
import ChessBoardView from './ChessBoardView';
import ChallengeModal from './ChallengeModal';
import CheckEventBanner from './CheckEventBanner';
import AchievementToast from './AchievementToast';
import IntroScreen from './IntroScreen';
import WaitingRoom from './WaitingRoom';
import FinalReward from './FinalReward';
import LoserRedemption from './LoserRedemption';

const pieceGlyph: Record<string, string> = {
  pawn: '♙',
  knight: '♘',
  bishop: '♗',
  rook: '♖',
  queen: '♕',
  king: '♔',
};

export default function GameRoom({
  roomId,
  role,
}: {
  roomId: string;
  role: PlayerRole;
}) {
  const { room, loading, connectionError } = useGameState(roomId);

  const [introSeen, setIntroSeen] = useState(
    () => localStorage.getItem(`intro-${roomId}`) === '1'
  );

  const [muted, setMutedState] = useState(isMuted());
  const [toastQueue, setToastQueue] = useState<AchievementId[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);

  const [vaultOpen, setVaultOpen] = useState(false);
  const [seenAnswers, setSeenAnswers] = useState<Set<string>>(
    new Set()
  );

  const seenAchievements = useRef<Set<AchievementId>>(new Set());

  useEffect(() => {
    markConnected(roomId, role, true);

    const handleUnload = () => {
      markConnected(roomId, role, false);
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [roomId, role]);

  useEffect(() => {
    if (!room) return;

    const fresh = room.achievements.filter(
      (a) => !seenAchievements.current.has(a)
    );

    if (fresh.length) {
      fresh.forEach((a) =>
        seenAchievements.current.add(a)
      );

      setToastQueue((q) => [...q, ...fresh]);
    }
  }, [room?.achievements]);

  useEffect(() => {
    if (!moveError) return;

    const t = setTimeout(
      () => setMoveError(null),
      3000
    );

    return () => clearTimeout(t);
  }, [moveError]);

  if (loading) {
    return (
      <p
        className="muted"
        style={{
          marginTop: '20vh',
          textAlign: 'center',
        }}
      >
        Loading room…
      </p>
    );
  }

  if (connectionError) {
    return (
      <div
        className="center-col"
        style={{ marginTop: '20vh' }}
      >
        <p>Can't reach the game server right now.</p>

        <p
          className="muted"
          style={{ fontSize: 13 }}
        >
          {connectionError}
        </p>
      </div>
    );
  }

  if (!room) {
    return (
      <div
        className="center-col"
        style={{ marginTop: '20vh' }}
      >
        <p>This room doesn't exist anymore.</p>
      </div>
    );
  }

  if (room.status === 'WAITING_FOR_PLAYERS') {
    return (
      <WaitingRoom
        room={room}
        role={role}
      />
    );
  }

  if (!introSeen) {
    return (
      <IntroScreen
        role={role}
        onBegin={() => {
          localStorage.setItem(
            `intro-${roomId}`,
            '1'
          );

          setIntroSeen(true);
        }}
      />
    );
  }

  const myTurn =
    (role === 'JANA' &&
      room.turn === 'w') ||
    (role === 'YOUSSEF' &&
      room.turn === 'b');

  const frozen =
    room.status === 'CHALLENGE_ACTIVE';

  const activeChallengeContent =
    room.activeChallenge
      ? getChallengeById(
          room.activeChallenge.challengeId
        )
      : null;

  const unlockedSet = new Set(
    room.achievements ?? []
  );

  const allAchievementIds =
    Object.keys(
      achievementInfo
    ) as AchievementId[];

  /*
   * Jana's Vault
   *
   * Answers are already stored in Firebase by challengeId.
   * We only expose this UI when the current player is Jana.
   */
  const vaultAnswers: ChallengeAnswer[] =
    role === 'JANA'
      ? Object.values(room.answers ?? {})
          .filter(
            (answer): answer is ChallengeAnswer =>
              Boolean(answer) &&
              typeof answer.challengeId ===
                'string' &&
              typeof answer.answer ===
                'string'
          )
          .sort(
            (a, b) =>
              a.completedAt -
              b.completedAt
          )
      : [];

  const newAnswerCount =
    vaultAnswers.filter(
      (answer) =>
        !seenAnswers.has(
          `${answer.challengeId}-${answer.completedAt}`
        )
    ).length;

  function openVault() {
    setVaultOpen(true);

    setSeenAnswers(
      (previous) => {
        const next = new Set(previous);

        vaultAnswers.forEach((answer) => {
          next.add(
            `${answer.challengeId}-${answer.completedAt}`
          );
        });

        return next;
      }
    );
  }

  return (
    <div className="board-page">
      {toastQueue[0] && (
        <AchievementToast
          key={toastQueue[0]}
          id={toastQueue[0]}
          onDone={() =>
            setToastQueue((q) =>
              q.slice(1)
            )
          }
        />
      )}

      <div className="top-bar">
        <div>
          <div
            className="crest"
            style={{ fontSize: 12 }}
          >
            {gameConfig.theme.title}
          </div>

          <div
            className="muted"
            style={{ fontSize: 13 }}
          >
            Room {room.roomId}
          </div>
        </div>

        <div
          className="btn-row"
          style={{ gap: 8 }}
        >
          {role === 'JANA' &&
            vaultAnswers.length > 0 && (
              <button
                className="btn"
                onClick={openVault}
                style={{
                  position: 'relative',
                }}
              >
                🔐 Vault

                {newAnswerCount > 0 && (
                  <span
                    style={{
                      marginLeft: 7,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 999,
                      background:
                        'var(--accent)',
                      color:
                        'var(--ink)',
                    }}
                  >
                    {newAnswerCount}
                  </span>
                )}
              </button>
            )}

          <span className="turn-pill">
            {room.status ===
            'COMPLETE'
              ? 'Game over'
              : myTurn
                ? 'Your move'
                : `Waiting on ${
                    role === 'JANA'
                      ? gameConfig
                          .playerNames
                          .YOUSSEF
                      : gameConfig
                          .playerNames
                          .JANA
                  }`}
          </span>

          <button
            className="btn"
            onClick={() => {
              const next = !muted;

              setMuted(next);
              setMutedState(next);
            }}
          >
            {muted
              ? '🔇'
              : '🔊'}
          </button>
        </div>
      </div>

      {moveError && (
        <div
          className="banner"
          style={{
            borderColor:
              'var(--panel-border)',
            background:
              'var(--ink-2)',
          }}
        >
          {moveError}
        </div>
      )}

      {room.checkEventPending &&
        role === 'YOUSSEF' && (
          <CheckEventBanner
            roomId={roomId}
          />
        )}

      {room.checkEventPending &&
        role === 'JANA' && (
          <div className="banner">
            <strong>
              Check!
            </strong>{' '}
            Waiting to see what Youssef
            does next…
          </div>
        )}

      {room.status === 'COMPLETE' ? (
        room.winner === 'w' ? (
          <LoserRedemption
            room={room}
          />
        ) : room.finalRewardRevealed ? (
          <FinalReward />
        ) : (
          <div
            className="center-col"
            style={{
              marginTop: 40,
            }}
          >
            <h2 className="display-title">
              {room.lastResult ===
              'stalemate'
                ? 'Stalemate.'
                : 'Draw.'}
            </h2>

            <p className="muted">
              Nobody's secrets got out
              this time.
            </p>
          </div>
        )
      ) : null}

      <div className="game-layout">
        <ChessBoardView
          fen={room.fen}
          role={role}
          myTurn={
            myTurn &&
            !frozen &&
            room.status !==
              'COMPLETE'
          }
          frozen={frozen}
          onMove={(
            from,
            to
          ) =>
            makeMove(
              roomId,
              role,
              from,
              to
            )
          }
          onIllegalMove={(
            reason
          ) =>
            setMoveError(reason)
          }
        />

        <div className="sidebar">
          <div className="card">
            <p
              className="step-eyebrow"
              style={{
                marginTop: 0,
              }}
            >
              Captured
            </p>

            <div className="captured-row">
              {room.capturedJanaOrigins
                .length === 0 && (
                <span
                  className="muted"
                  style={{
                    fontSize: 13,
                  }}
                >
                  None yet.
                </span>
              )}

              {room.capturedJanaOrigins.map(
                (
                  origin,
                  i
                ) => (
                  <span
                    key={`${origin}-${i}`}
                    title={origin}
                  >
                    {
                      pieceGlyph[
                        categoryForOrigin(
                          origin
                        )
                      ]
                    }
                  </span>
                )
              )}
            </div>
          </div>

          <div className="card">
            <p
              className="step-eyebrow"
              style={{
                marginTop: 0,
              }}
            >
              Achievements
            </p>

            <div className="achv-grid">
              {allAchievementIds.map(
                (id) => {
                  const info =
                    achievementInfo[
                      id
                    ];

                  const unlocked =
                    unlockedSet.has(
                      id
                    );

                  return (
                    <div
                      key={id}
                      className={`achv-chip${
                        unlocked
                          ? ''
                          : ' locked'
                      }`}
                    >
                      <span>
                        {unlocked
                          ? info.icon
                          : '🔒'}
                      </span>

                      <span>
                        {unlocked
                          ? info.label
                          : '???'}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {role === 'JANA' &&
            vaultAnswers.length > 0 && (
              <button
                className="btn btn-block"
                onClick={openVault}
              >
                🔐 Open Jana's Vault
                {newAnswerCount >
                  0 && (
                  <span
                    style={{
                      marginLeft: 6,
                    }}
                  >
                    ({newAnswerCount}
                    {' '}
                    new)
                  </span>
                )}
              </button>
            )}

          {room.status ===
            'COMPLETE' && (
            <button
              className="btn btn-block"
              onClick={() =>
                resetRoomForRematch(
                  roomId
                )
              }
            >
              Rematch
            </button>
          )}
        </div>
      </div>

      {activeChallengeContent &&
        room.activeChallenge && (
          <ChallengeModal
            queued={
              room.activeChallenge
            }
            challenge={
              activeChallengeContent
            }
            onComplete={(
              answer
            ) => {
              sfx.capture();

              completeActiveChallenge(
                roomId,
                answer
              );
            }}
          />
        )}

    ```tsx
      {/*
       * Jana's Vault modal
       *
       * Deliberately rendered only for Jana.
       * Youssef never gets access to this UI.
       */}
      {role === 'JANA' && vaultOpen && (
        <div
          className="overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Jana's Vault"
        >
          <div
            className="modal card"
            style={{
              maxWidth: 680,
              width: 'min(680px, 92vw)',
              maxHeight: '82vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <div className="modal-eyebrow">
                  PRIVATE ARCHIVE
                </div>

                <h2
                  className="display-title"
                  style={{
                    margin: '4px 0 6px',
                  }}
                >
                  Jana's Vault
                </h2>

                <p className="muted" style={{ margin: 0 }}>
                  Youssef's answers, collected as you play.
                </p>
              </div>

              <button
                className="btn"
                onClick={() => setVaultOpen(false)}
                aria-label="Close vault"
              >
                Close
              </button>
            </div>

            {Object.keys(room.answers ?? {}).length === 0 ? (
              <div className="center-col" style={{ padding: '32px 0' }}>
                <div style={{ fontSize: 42 }}>🔒</div>
                <p className="display-title" style={{ fontSize: 24 }}>
                  The vault is empty.
                </p>
                <p className="muted">
                  Capture one of Jana's pieces to unlock Youssef's first answer.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {Object.values(room.answers ?? {}).map((answer) => {
                  const challenge = getChallengeById(answer.challengeId);

                  return (
                    <div
                      key={`${answer.challengeId}-${answer.completedAt}`}
                      className="card"
                      style={{
                        background: 'var(--ink-2)',
                        borderColor: 'var(--panel-border)',
                      }}
                    >
                      <div
                        className="modal-eyebrow"
                        style={{ marginBottom: 6 }}
                      >
                        {challenge?.title ?? answer.challengeId}
                      </div>

                      {challenge?.prompt && (
                        <p
                          className="muted"
                          style={{
                            marginTop: 0,
                            marginBottom: 10,
                            fontSize: 13,
                          }}
                        >
                          {challenge.prompt}
                        </p>
                      )}

                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: '1px solid var(--panel-border)',
                          background: 'var(--panel)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                        }}
                      >
                        {answer.answer}
                      </div>

                      <div
                        className="muted"
                        style={{
                          fontSize: 11,
                          marginTop: 8,
                          textAlign: 'right',
                        }}
                      >
                        Answered during the game
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div
              className="btn-row"
              style={{
                marginTop: 20,
                justifyContent: 'flex-end',
              }}
            >
              <button
                className="btn"
                onClick={() => setVaultOpen(false)}
              >
                Close Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}