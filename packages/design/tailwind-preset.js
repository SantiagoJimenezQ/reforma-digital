/**
 * Reforma Digital · preset de Tailwind (ver DESIGN.md).
 *
 * 1. Mapea los tokens de tokens.css a nombres semánticos (ink, surface, brand…).
 * 2. Define los COMPONENTES del sistema (bg-btn, bg-field, bg-callout…) una sola vez.
 *    Se usan como clases en los paneles y con @apply en los temas que visten
 *    la web oficial (src/themes/*.css), así todo comparte exactamente el mismo estilo.
 */
import plugin from 'tailwindcss/plugin.js';

const v = (name) => `rgb(var(--bg-${name}) / <alpha-value>)`;
const c = (name, alpha) =>
  alpha === undefined ? `rgb(var(--bg-${name}))` : `rgb(var(--bg-${name}) / ${alpha})`;

const focusRing = {
  outline: `3px solid ${c('brand-600')}`,
  outlineOffset: '2px',
};

const components = plugin(({ addComponents }) => {
  addComponents({
    // ── Tipografía ────────────────────────────────────────────────
    '.bg-text': {
      fontFamily: 'var(--bg-font)',
      fontSize: '16px',
      lineHeight: '1.6',
      color: c('ink'),
    },
    '.bg-h1': {
      fontSize: '28px',
      lineHeight: '1.2',
      fontWeight: '500',
      color: c('ink'),
      letterSpacing: '-0.035em',
      '@media (max-width: 639px)': { fontSize: '24px' },
    },
    '.bg-h2': { fontSize: '20px', lineHeight: '1.3', fontWeight: '650', color: c('ink') },
    '.bg-h3': { fontSize: '17px', lineHeight: '1.4', fontWeight: '600', color: c('ink') },
    '.bg-eyebrow': {
      fontSize: '12px',
      lineHeight: '1.4',
      fontWeight: '600',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: c('ink-subtle'),
    },
    '.bg-lead': { fontSize: '17px', lineHeight: '1.6', color: c('ink-muted') },
    '.bg-small': { fontSize: '14px', lineHeight: '1.5', color: c('ink-muted') },

    // ── Superficies ───────────────────────────────────────────────
    '.bg-card': {
      backgroundColor: c('surface'),
      border: `1px solid ${c('line')}`,
      borderRadius: 'var(--bg-radius-card)',
      boxShadow: 'var(--bg-shadow-card)',
    },
    '.bg-badge': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      borderRadius: '999px',
      padding: '4px 10px',
      fontSize: '13px',
      lineHeight: '1.3',
      fontWeight: '600',
      color: c('brand-700'),
      backgroundColor: c('brand-50'),
      border: `1px solid ${c('brand-200')}`,
    },

    // ── Acciones ──────────────────────────────────────────────────
    '.bg-btn': {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      minHeight: '44px',
      padding: '10px 18px',
      borderRadius: '999px',
      border: '1px solid transparent',
      fontFamily: 'var(--bg-font)',
      fontSize: '16px',
      lineHeight: '1.25',
      fontWeight: '600',
      textDecoration: 'none',
      textTransform: 'none',
      letterSpacing: 'normal',
      cursor: 'pointer',
      transition: 'background-color 150ms, border-color 150ms, color 150ms',
      '&:focus-visible': focusRing,
    },
    '.bg-btn-primary': {
      backgroundColor: c('brand-600'),
      color: c('ink-inverse'),
      '&:hover': { backgroundColor: c('brand-700') },
      '&:disabled, &[aria-disabled="true"]': {
        backgroundColor: c('line-strong'),
        color: c('ink-muted'),
        cursor: 'not-allowed',
      },
    },
    '.bg-btn-secondary': {
      backgroundColor: c('surface'),
      color: c('ink'),
      borderColor: c('line-control'),
      '&:hover': { backgroundColor: c('surface-muted'), borderColor: c('ink-subtle') },
    },
    '.bg-btn-lg': { minHeight: '52px', padding: '14px 22px', fontSize: '17px' },
    '.bg-link': {
      color: c('brand-600'),
      textDecorationLine: 'underline',
      textDecorationThickness: '1px',
      textUnderlineOffset: '3px',
      textDecorationColor: c('brand-600', 0.4),
      fontWeight: '500',
      cursor: 'pointer',
      '&:hover': {
        color: c('brand-700'),
        textDecorationColor: 'currentColor',
        textDecorationThickness: '2px',
      },
      '&:focus-visible': { ...focusRing, borderRadius: '2px' },
    },

    // ── Formularios ───────────────────────────────────────────────
    // Contenedor de un campo conectado con el original (@reforma-digital/react · BoundField).
    '.bg-bound': { display: 'block', minWidth: '0', padding: '6px 0 12px' },
    '.bg-label': {
      display: 'block',
      fontSize: '15px',
      lineHeight: '1.4',
      fontWeight: '600',
      color: c('ink'),
      marginBottom: '6px',
    },
    '.bg-hint': { fontSize: '14px', lineHeight: '1.5', color: c('ink-muted') },
    '.bg-field': {
      display: 'block',
      width: '100%',
      minHeight: '44px',
      padding: '10px 14px',
      border: `1px solid ${c('line-control')}`,
      borderRadius: 'var(--bg-radius-control)',
      backgroundColor: c('surface'),
      color: c('ink'),
      fontFamily: 'var(--bg-font)',
      fontSize: '16px',
      lineHeight: '1.4',
      '&:focus': {
        outline: 'none',
        borderColor: c('brand-600'),
        boxShadow: `0 0 0 3px ${c('brand-200')}`,
      },
      '&:disabled, &[readonly]': { backgroundColor: c('surface-muted'), color: c('ink-muted') },
    },
    '.bg-choice': {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px',
      minHeight: '44px',
      padding: '10px 14px',
      border: `1px solid ${c('line-strong')}`,
      borderRadius: 'var(--bg-radius-control)',
      backgroundColor: c('surface'),
      color: c('ink'),
      fontSize: '15px',
      lineHeight: '1.4',
      cursor: 'pointer',
      '&:hover': { borderColor: c('line-control') },
      '&:focus-within': { borderColor: c('brand-600'), boxShadow: `0 0 0 3px ${c('brand-200')}` },
      '& input': {
        marginTop: '2px',
        width: '18px',
        height: '18px',
        flexShrink: '0',
        accentColor: c('brand-600'),
      },
    },
    '.bg-choice-checked': {
      borderColor: c('brand-600'),
      backgroundColor: c('brand-50'),
      color: c('brand-900'),
      fontWeight: '600',
      boxShadow: `inset 0 0 0 1px ${c('brand-600')}`,
    },

    // ── Avisos ────────────────────────────────────────────────────
    '.bg-callout': {
      padding: '14px 16px',
      borderRadius: 'var(--bg-radius-control)',
      border: '1px solid',
      borderLeftWidth: '4px',
      fontSize: '15px',
      lineHeight: '1.55',
    },
    '.bg-callout-title': { fontWeight: '600', marginBottom: '4px' },
    ...Object.fromEntries(
      ['info', 'warning', 'danger', 'success'].map((tone) => [
        `.bg-callout-${tone}`,
        {
          backgroundColor: c(`${tone}-bg`),
          borderColor: c(`${tone}-line`),
          color: c(`${tone}-fg`),
        },
      ]),
    ),
    '.bg-callout-neutral': {
      backgroundColor: c('surface-muted'),
      borderColor: c('line'),
      borderLeftColor: c('line-control'),
      color: c('ink'),
    },
  });
});

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: v('ink'),
          muted: v('ink-muted'),
          subtle: v('ink-subtle'),
          inverse: v('ink-inverse'),
        },
        canvas: v('canvas'),
        surface: { DEFAULT: v('surface'), muted: v('surface-muted') },
        line: { DEFAULT: v('line'), strong: v('line-strong'), control: v('line-control') },
        brand: Object.fromEntries(
          [50, 100, 200, 500, 600, 700, 900].map((n) => [n, v(`brand-${n}`)]),
        ),
        ...Object.fromEntries(
          ['info', 'warning', 'danger', 'success'].map((t) => [
            t,
            { bg: v(`${t}-bg`), line: v(`${t}-line`), fg: v(`${t}-fg`) },
          ]),
        ),
      },
      borderRadius: { control: 'var(--bg-radius-control)', card: 'var(--bg-radius-card)' },
      boxShadow: { card: 'var(--bg-shadow-card)', raised: 'var(--bg-shadow-raised)' },
      fontFamily: { sans: 'var(--bg-font)', mono: 'var(--bg-font-mono)' },
      maxWidth: { content: 'var(--bg-content-max)' },
    },
  },
  plugins: [components],
};
