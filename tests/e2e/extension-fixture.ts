import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';

/** Chromium with the test build (dist-test) loaded; shared by every e2e spec. */
export const test = base.extend<{ extension: BrowserContext }>({
  extension: async ({}, use) => {
    const profile = await mkdtemp(path.join(os.tmpdir(), 'better-government-test-'));
    const extension = path.resolve('dist-test');
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: true,
      ...(process.env.BG_CHROMIUM_PATH ? { executablePath: process.env.BG_CHROMIUM_PATH } : {}),
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    try {
      await use(context);
    } finally {
      await context.close();
      await rm(profile, { recursive: true, force: true });
    }
  },
});
