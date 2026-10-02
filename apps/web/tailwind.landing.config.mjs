import preset from '@reforma-digital/design/tailwind-preset';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [`${root}landing/**/*.{tsx,ts}`],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      maxWidth: {
        page: '1280px',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        pop: {
          from: { opacity: '0', transform: 'translate(-6px, -50%)' },
        },
        rise: {
          from: { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
        },
        rev: {
          from: { opacity: '0', transform: 'translateY(6px)' },
        },
      },
      animation: {
        pop: 'pop 600ms cubic-bezier(0.22, 1, 0.36, 1) both',
        rise: 'rise 900ms cubic-bezier(0.22, 1, 0.36, 1) both',
        rev: 'rev 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
};
