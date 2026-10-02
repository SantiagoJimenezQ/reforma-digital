import { defineConfig } from 'oxlint';
import antiSlop from 'ultracite/oxlint/anti-slop';

export default defineConfig({
  plugins: ['eslint', 'react'],
  // Enable only the reviewed rules; do not inherit the full correctness or anti-slop presets.
  categories: { correctness: 'off' },
  jsPlugins: antiSlop.jsPlugins,
  rules: {
    'eslint/no-debugger': 'error',
    'eslint/no-async-promise-executor': 'error',
    'eslint/no-constant-binary-expression': 'error',
    'eslint/no-dupe-else-if': 'error',
    'eslint/no-fallthrough': 'error',
    'eslint/no-unsafe-finally': 'error',
    'eslint/no-unsafe-optional-chaining': 'error',
    'eslint/use-isnan': 'error',
    'anti-slop/no-chained-type-assertions': 'error',
    'anti-slop/no-widen-then-assert': 'error',
  },
  overrides: [
    {
      // Playwright's fixture callback named `use` is not a React hook.
      files: ['**/*.tsx', '**/*.jsx'],
      rules: {
        'react/rules-of-hooks': 'error',
        'react/exhaustive-deps': 'error',
      },
    },
  ],
});
