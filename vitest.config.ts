import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/**/*.test.ts', 'sites/**/*.test.ts'],
    restoreMocks: true,
  },
});
