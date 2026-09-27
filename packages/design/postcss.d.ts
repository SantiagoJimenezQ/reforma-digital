import type { AcceptedPlugin } from 'postcss';

/** Plugins de PostCSS del sistema de diseño (Tailwind con el preset + rem→px). */
export function designPostcss(opts: { content: string[] }): AcceptedPlugin[];
