import type { AcceptedPlugin } from 'postcss';

/** Plugins de PostCSS del sistema de diseño (Tailwind v4 + rem→px para Shadow DOM). */
export function designPostcss(opts: { content: string[] }): AcceptedPlugin[];
