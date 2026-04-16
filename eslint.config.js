import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      ...prettier.rules
    }
  },
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/.expo/**', '**/.turbo/**']
  }
];
