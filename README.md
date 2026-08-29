# ♟️ The Jana Gambit

A real-time, two-player-only chess game. Every time Youssef captures one of Jana's
pieces, it unlocks a hidden challenge. Built with React + TypeScript + Vite,
`chess.js` for legal chess rules, `react-chessboard` for the board, and
Firebase Realtime Database so two phones/laptops can play the same live game.

---

## 1. Install & run locally

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
cp .env.example .env.local   # then fill in your Firebase keys - see section 2
npm run dev
```

Open the printed `localhost` URL in two browser tabs (or two devices on the
same network, using your machine's local IP) to test both sides.

---

## 2. Backend setup (Firebase Realtime Database - free tier)

The game needs *some* backend to sync two browsers, and Firebase's free
"Spark" plan is the simplest option that needs no server of your own.

1. Go to <https://console.firebase.google.com> and create a new project
   (name doesn't matter, e.g. "jana-gambit").
2. In the project, go to **Build → Realtime Database → Create Database**.
   Start in **test mode** for now (we'll lock it down in step 5).
3. Go to **Project settings → General → Your apps → Add app → Web**. Register
   the app (no need for Firebase Hosting). Copy the `firebaseConfig` object
   it gives you.
4. Paste those values into `.env.local`:

   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_DATABASE_URL=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

5. Lock the database down with the rules in `database.rules.json` (already
   in this repo): **Realtime Database → Rules**, paste the file's contents,
   publish. This restricts reads/writes to paths that look like real room
   codes (`JG-XXXXXX`), so a stranger can't browse or wipe the whole
   database - but anyone who *has* a room code can read/write that room.
   That's an intentional simplicity trade-off for a private two-person game
   (see "Security notes" below), not bank-grade security.

You do **not** need Firebase Authentication, Firestore, Storage, or any paid
plan. The free Spark tier's Realtime Database easily covers a two-person
chess game.

---

## 3. Customize the game

Everything you're likely to want to change is data, not code:

- **`src/config/gameConfig.ts`** - player names, homepage text, the final
  song, and the "Reverse" queen memory. This is the file mentioned in the
  brief as the simple settings file.
- **`src/config/challenges.ts`** - every challenge's wording. Each piece
  challenge is keyed by the square Jana's piece starts on (`a2`-`h2` for
  pawns, `b1`/`g1` knights, `c1`/`f1` bishops, `a1`/`h1` rooks, `d1` queen).
  Edit the `prompt` strings freely; leave `id` and `kind` alone unless you
  also touch `ChallengeModal.tsx`.

### Changing the final song

Edit the `finalSong` block in `gameConfig.ts`:

```ts
finalSong: {
  title: 'Song Title',
  artist: 'Artist Name',
  url: 'https://open.spotify.com/track/...', // or Apple Music / YouTube link
  message: 'Press play.',
},
```

We deliberately never embed or hardcode an actual audio file for a
copyrighted song - the final screen links out to whatever streaming
provider you choose.

---

## 4. Deploying

### Push to GitHub

```bash
git init
git add .
git commit -m "The Jana Gambit"
git branch -M main
git remote add origin https://github.com/<your-username>/jana-gambit.git
git push -u origin main
```

### Deploy the frontend to GitHub Pages

1. Open `vite.config.ts` and set `base` to `'/jana-gambit/'` (or whatever
   your repo name is) - it's already set to that value by default.
2. Install the deploy helper and ship it:

   ```bash
   npm install
   npm run build
   npm run deploy
   ```

   `npm run deploy` uses `gh-pages` to push the `dist/` folder to a
   `gh-pages` branch. In your GitHub repo settings, go to **Pages** and set
   the source to the `gh-pages` branch (root).
3. Your game will be live at `https://<your-username>.github.io/jana-gambit/`.

GitHub Pages only serves static files, which is fine here - all the
real-time multiplayer logic talks directly to Firebase from the browser, so
there's no server-side routing limitation to work around.

**Important:** GitHub Pages is public. Anyone with the URL can open the
homescreen - but they can't do anything without a valid room code, and room
codes are random 6-character strings (see "Security notes").

---

## 5. How Jana creates a room, and how Youssef joins

1. Jana opens the deployed link, taps **Create Game**, picks **Jana**, and
   taps **Create Room**.
2. The app shows a room code like `JG-7X4K92` on a waiting screen. Jana
   sends that code to Youssef (text, WhatsApp, whatever).
3. Youssef opens the same link, taps **Join Game**, picks **Youssef**,
   enters the code, and taps **Join Room**.
4. Once both are connected the intro plays and the game begins. Refreshing
   or closing the tab is safe - reopening the link restores exactly where
   you left off (the room/role is remembered in the browser).

---

## 6. What's implemented

- Full legal chess (check, checkmate, stalemate, castling, en passant,
  promotion, move history) via `chess.js` - no custom/fake chess logic.
- Real two-device sync of board position, turn, captured pieces, challenge
  state, achievements, combos, and game result via Firebase Realtime
  Database (`src/game/useGameState.ts`).
- Piece **identity** tracking (`src/game/pieceTracking.ts`) - the game
  always knows *which specific* pawn/knight/etc. was captured, not just
  "a pawn was captured," so each of Jana's 8 pawns, 2 knights, 2 bishops,
  2 rooks, king, and queen carries its own distinct challenge.
- The full challenge set from the brief: 8 pawn challenges, 2 knight
  challenges (blind ranking + would-you-rather), 2 bishop, 2 rook, the
  queen's two-part event, check "Attack Mode" events, the three combo
  events, the achievement system, Loser's Redemption, and the Final
  Boss → final reward sequence.
- Reconnect/refresh safety: all state lives in Firebase, not local React
  state, so a reload just re-subscribes to the same room.
- Mute toggle and lightweight synthesized sound effects (no external audio
  files, so nothing to license).
- Mobile-first responsive layout.

### Design decisions worth knowing about

- **"Captures the King" (§13) doesn't exist in real chess** - the game
  always ends at checkmate before a king is actually removed from the
  board. So the King's "Ask Me Anything" event fires **on checkmate**
  instead, immediately followed by the Final Boss sequence (§18-20), which
  covers the same narrative beat the brief describes.
- If **Jana** delivers checkmate instead (Youssef loses), the game skips
  the King/Final Boss narrative - which the brief frames around Youssef
  winning - and goes to **Loser's Redemption** (§17) for Youssef.
- The Queen event is implemented as a two-part sequence ("The Queen's
  Confession" then "The Reverse") shown back-to-back when the queen is
  captured, since a standard chess game only has one queen per side to
  capture.
- A few achievements are inherently subjective and have no clean formula
  (`SOFTIE_DETECTED`, `GREEDY`). These aren't auto-detected; wire up a
  manual trigger for them (e.g. a small button) using the exported
  `markMoment(roomId, achievementId)` function if you want them in play.
  `BIG_BRAIN`, `CHESS_BRAIN`, `GYM_BUFF`, and `VALORANT_REFLEXES` use
  simple heuristics (material count at checkmate, castling, move count,
  move speed) - tune them in `useGameState.ts` if they fire too often/rarely.

### Security notes (§28)

This is a private two-person game, not a public product, so the brief
explicitly asks to prioritize simplicity over hardened security. In
practice: room codes are random and unguessable in a casual sense, but
anyone who *has* a room's code can read and write that room's full state
(including, technically, challenge answers) - there's no per-player auth.
Don't reuse this project for anything where that trade-off matters.

---

## 7. Project structure

```
src/
  components/     UI screens and widgets (board, modals, banners, etc.)
  config/         Editable content: challenges.ts, gameConfig.ts
  game/           Chess/game logic: types, piece tracking, Firebase state hook
  styles/         global.css (theme tokens + layout)
  firebase.ts     Firebase app/database init
  App.tsx         Phase routing (home / create / join / room)
  main.tsx        React entry point
database.rules.json   Firebase Realtime Database security rules
```
