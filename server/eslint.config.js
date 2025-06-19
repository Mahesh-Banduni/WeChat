// eslint.config.js
import js from '@eslint/js';
import nodePlugin from 'eslint-plugin-node';
import promisePlugin from 'eslint-plugin-promise';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      node: nodePlugin,
      promise: promisePlugin,
      import: importPlugin,
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'import/no-unresolved': 'error',
      'node/no-unsupported-features/es-syntax': 'off',
    },
  },
];
