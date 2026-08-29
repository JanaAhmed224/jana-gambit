import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IMPORTANT: change `base` to '/<your-repo-name>/' before deploying to GitHub Pages.
// Example: if your repo is github.com/jana/jana-gambit, base should be '/jana-gambit/'.
// Keep it as '/' if you deploy to a custom domain or a *.github.io "user site" repo.
export default defineConfig({
  plugins: [react()],
  base: '/jana-gambit/',
});
