import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    rules: {
      eqeqeq: 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.worklet.js'],
    languageOptions: { globals: globals.audioWorklet },
  },
  {
    files: ['*.config.js', 'e2e/**/*.js'],
    languageOptions: { globals: globals.node },
  },
];
