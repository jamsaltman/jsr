import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const globals = {
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  FormData: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  crypto: 'readonly',
  process: 'readonly'
};

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '.omx/**']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
);
