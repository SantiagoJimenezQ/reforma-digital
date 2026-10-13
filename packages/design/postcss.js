import tailwindcss from '@tailwindcss/postcss';
import postcss from 'postcss';

// Los rem del Shadow DOM dependen del HTML del portal oficial; mantenemos una base de 16 px.
const remToPx = () => ({
  postcssPlugin: 'rem-to-px',
  Declaration(decl) {
    if (decl.value.includes('rem')) {
      decl.value = decl.value.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${parseFloat(n) * 16}px`);
    }
  },
});
remToPx.postcss = true;

export function designPostcss({ content }) {
  return [
    {
      postcssPlugin: 'reforma-tailwind-sources',
      Once(root) {
        for (const file of content)
          root.prepend(postcss.atRule({ name: 'source', params: JSON.stringify(file) }));
      },
    },
    tailwindcss(),
    remToPx(),
  ];
}
