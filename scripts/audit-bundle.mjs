import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { readSites } from './sites.mjs';
const manifest = JSON.parse(await readFile('dist/manifest.json', 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ['storage']);
assert.equal(manifest.background, undefined);
assert.equal(manifest.externally_connectable, undefined);
assert.equal(manifest.web_accessible_resources, undefined);
assert.equal(manifest.host_permissions, undefined);
assert.equal(manifest.content_scripts[0].world, 'ISOLATED');
assert.equal(manifest.content_scripts[0].all_frames, false);
const sites = await readSites();
assert.deepEqual(
  manifest.content_scripts[0].matches,
  sites.flatMap((site) => site.origins.map((origin) => `${origin}${site.pathPrefix}*`)),
);
assert.ok(!JSON.stringify(manifest).includes('127.0.0.1'));
const forbidden = [
  /\beval\s*\(/,
  /new\s+Function\s*\(/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\bsendBeacon\s*\(/,
  /\bdocument\.cookie\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
];
for (const file of await readdir('dist', { recursive: true })) {
  if (!/\.(js|html|css)$/.test(file)) continue;
  const code = await readFile(path.join('dist', file), 'utf8');
  for (const pattern of forbidden)
    assert.ok(!pattern.test(code), `${file}: forbidden runtime capability ${pattern}`);
  assert.ok(!/<script[^>]+src=["']https?:/i.test(code));
}
console.log(
  'Bundle audit passed: packaged scripts, exact site matches, no detected networking or page storage APIs. This static check is not a security audit.',
);
