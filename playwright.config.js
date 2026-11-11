import { defineConfig } from '@playwright/test';

const PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  projects: [{ name: 'chrome' }],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
