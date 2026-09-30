import preset from '@reforma-digital/design/tailwind-preset';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [`${root}src/**/*.{astro,html,js,ts}`],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        page: '1280px',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        travel: {
          '0%': { opacity: '1', left: '0' },
          '100%': { opacity: '0.2', left: 'calc(100% - 10px)' },
        },
        pop: {
          from: { opacity: '0', transform: 'translate(-6px, -50%)' },
        },
        rev: {
          from: { opacity: '0', transform: 'translateY(6px)' },
        },
      },
      animation: {
        travel: 'travel 700ms cubic-bezier(0.22, 1, 0.36, 1)',
        pop: 'pop 600ms cubic-bezier(0.22, 1, 0.36, 1) both',
        rev: 'rev 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
};
