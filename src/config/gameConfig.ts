// ---------------------------------------------------------------------------
// EDIT ME. This is the one file you should need to touch to personalize the
// game further - no React knowledge required. Everything here is plain data.
// ---------------------------------------------------------------------------

export const gameConfig = {
  playerNames: {
    JANA: 'Jana',
    YOUSSEF: 'Youssef',
  },

  theme: {
    title: 'The Jana Gambit',
    subtitle: 'A perfectly normal chess game.',
    homeTagline: 'One board. Two players. A suspicious amount of secrets.',
  },

  // The final reveal at the very end of the game. Replace the URL with a
  // real link once you've picked the song - never commit a direct audio
  // file of a copyrighted track, link out to the streaming provider instead.
  finalSong: {
    title: '(untitled)',
    artist: '(unknown)',
    url: '', // e.g. a Spotify, Apple Music, or YouTube link
    message: 'Press play.',
  },

  // "The Reverse" queen challenge lets Jana pick a real shared memory ahead
  // of time. Add as many as you like - one is chosen at random when the
  // queen is captured.
  reverseMoments: [
    'The day you found out I was moving into university housing and showed up with clothes, snacks, and food.',
    'A video call that went way longer than either of us planned.',
    'The trip we took together during university.',
  ],

  // Room codes look like JG-XXXXXX. You generally don't need to change this.
  roomCodePrefix: 'JG',
};
