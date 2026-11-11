import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: {
          channel: 'chrome',
          args: ['--autoplay-policy=no-user-gesture-required'],
        },
      }),
      instances: [{ browser: 'chromium' }],
    },
  },
});
