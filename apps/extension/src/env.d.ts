declare module 'virtual:site-adapters' {
  export const adapters: import('@reforma-digital/registry').SiteAdapter[];
}
declare const __BG_TEST__: boolean;
/** Enabled sites included in this build (injected by scripts/build.mjs for the popup). */
declare const __BG_SITES__: { id: string; name: string; homepage: string; status: string }[];
