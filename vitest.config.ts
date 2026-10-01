import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'extension',
          environment: 'jsdom',
          include: ['packages/**/*.test.ts', 'sites/**/*.test.ts'],
          restoreMocks: true,
        },
      },
      {
        test: {
          name: 'search',
          environment: 'node',
          include: ['tests/*.test.ts'],
          restoreMocks: true,
        },
      },
    ],
  },
});
