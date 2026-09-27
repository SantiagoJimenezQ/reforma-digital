import tailwindcss from 'tailwindcss';
import preset from './tailwind-preset.js';

/**
 * Las webs oficiales fijan `html { font-size: 14px }`. Dentro del Shadow DOM las
 * unidades `rem` siguen tomando como referencia el <html> de la página, así que
 * convertimos rem → px (base 16) para que la interfaz no dependa del CSS oficial.
 */
const remToPx = () => ({
  postcssPlugin: 'rem-to-px',
  Declaration(decl) {
    if (decl.value.includes('rem')) {
      decl.value = decl.value.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${parseFloat(n) * 16}px`);
    }
  },
});
remToPx.postcss = true;

/**
 * Plugins de PostCSS del sistema de diseño.
 * @param {{ content: string[] }} opts  Ficheros donde Tailwind busca clases usadas
 *   (el sistema de diseño + el adaptador o app que se está compilando).
 */
export function designPostcss({ content }) {
  return [tailwindcss({ presets: [preset], content }), remToPx()];
}
