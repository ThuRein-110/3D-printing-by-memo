import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config({ ignores: ['**/.next/**','**/node_modules/**','**/next-env.d.ts','test-results/**','playwright-report/**'] }, js.configs.recommended, ...ts.configs.recommended, {
  files: ['**/*.{ts,tsx,mjs}'], languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', setTimeout: 'readonly', URL: 'readonly', fetch: 'readonly', AbortSignal: 'readonly' } },
  rules: { '@typescript-eslint/no-explicit-any': 'error' }
});
