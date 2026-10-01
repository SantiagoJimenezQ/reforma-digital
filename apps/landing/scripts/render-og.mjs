import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const landing = join(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(landing, '../..');

const sans = readFileSync(
  join(
    root,
    'node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2',
  ),
);
const serif = readFileSync(
  join(
    root,
    'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
  ),
);

const faces = `
@font-face {
  font-family: 'Instrument Sans Variable';
  src: url('data:font/woff2;base64,${sans.toString('base64')}') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}
@font-face {
  font-family: 'Instrument Serif';
  src: url('data:font/woff2;base64,${serif.toString('base64')}') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: block;
}
`;

const html = readFileSync(join(landing, 'og/template.html'), 'utf8').replace(
  '<style>',
  `<style>${faces}`,
);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

const out = join(landing, 'public/og.png');
writeFileSync(out, png);
console.log(`wrote ${out} (${png.length} bytes)`);
