/**
 * Contract of the optional sites/<id>/flow.ts: how to walk the REAL official site.
 * Used by scripts/site-live.mjs, site-record.mjs and site-preview.mjs.
 *
 * RULES: public pages without identification only; one walk per run; never fill personal data,
 * solve a CAPTCHA, query availability or book. The walk stops before those steps.
 */
import type { Locator, Page } from '@playwright/test';

export interface FlowContext {
  page: Page;
  /** Waits until `selector` exists in the official page and the page has loaded. */
  waitOfficial(selector: string): Promise<void>;
  /** Waits until the Better Government interface is mounted. */
  waitInterface(): Promise<void>;
  /** Screenshot in sites/<id>/docs/screenshots/<original|mejorada>-<name>.png (or panel-<name> with a target). */
  capture(name: string, target?: Locator): Promise<void>;
  /** Saves the current page (no scripts, no session tokens) as fixtures/<name>.html. site:live only. */
  fixture(name: string): Promise<void>;
  check(name: string, ok: boolean, detail?: string): void;
}

export interface Flow {
  /** First public URL of the service. */
  start: string;
  /** Walk WITHOUT the extension, using the official controls. */
  original(ctx: FlowContext): Promise<void>;
  /** Same walk WITH the extension, using only the interface, with checks. */
  enhanced(ctx: FlowContext): Promise<void>;
  /** Pages captured by site:preview (they must be in the recording). */
  preview: { name: string; url: string }[];
  /** Extra URLs visited by site:record after the walk. */
  extraRecord?: { url: string; ready: string }[];
  /** CSS applied only while taking screenshots (e.g. hide a fixed cookie bar). Never accepts anything. */
  captureCss?: string;
}
