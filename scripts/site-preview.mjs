/**
 * OFFLINE design preview: replays .cache/<site>.har with the extension and saves full-page
 * screenshots (1280 and 390 px) in .cache/preview/<site>/. No request reaches the official site.
 *
 *   npm run build && npm run site:preview -- <site> [--open]
 */
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { cache, harPath, launch, replayHar, requireBuild, sitesWithFlow } from './lib/live.mjs';

requireBuild();
const keepOpen = process.argv.includes('--open');
for (const site of await sitesWithFlow()) {
  const har = harPath(site.id);
  if (!existsSync(har)) {
    console.warn(`· ${site.id}: missing ${har}; run npm run site:record -- ${site.id}`);
    continue;
  }
  const out = path.join(cache, 'preview', site.id);
  mkdirSync(out, { recursive: true });
  // Offline there is no anti-bot check: headless is fine unless --open.
  const { context, page } = await launch(`${site.id}-preview`, {
    extension: true,
    headless: !keepOpen,
  });
  await replayHar(context, har);
  for (const { name, url } of site.flow.preview) {
    for (const [suffix, width] of [
      ['', 1280],
      ['-movil', 390],
    ]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url);
      await page
        .locator('[data-bg-host]')
        .first()
        .waitFor({ state: 'attached', timeout: 15_000 })
        .catch(() => console.warn(`  no interface on ${name}`));
      if (site.flow.captureCss) await page.addStyleTag({ content: site.flow.captureCss });
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(out, `${name}${suffix}.png`),
        fullPage: true,
        caret: 'initial',
      });
      await page.screenshot({ path: path.join(out, `${name}${suffix}-top.png`), caret: 'initial' });
    }
    console.log(`✔ ${site.id} · ${name}`);
  }
  if (keepOpen) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(site.flow.preview[0]?.url ?? site.flow.start);
    console.log('Window open (offline). Close it to finish.');
    await new Promise((resolve) => context.on('close', resolve));
  } else await context.close();
}
