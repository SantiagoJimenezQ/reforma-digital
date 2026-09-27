/**
 * Records ONE real visit (no extension) in .cache/<site>.har, to work on the design offline.
 *
 *   npm run site:record -- <site>
 */
import { flowContext, harPath, launch, sitesWithFlow } from './lib/live.mjs';

for (const site of await sitesWithFlow()) {
  const har = harPath(site.id);
  const { context, page } = await launch(`${site.id}-record`, { har });
  const ctx = flowContext(site, page, { prefix: null, fixtures: false, results: [] });
  await site.flow.original(ctx);
  for (const extra of site.flow.extraRecord ?? []) {
    await page.goto(extra.url);
    await ctx.waitOfficial(extra.ready);
  }
  await context.close();
  console.log(`✔ ${site.id}: ${har}`);
}
