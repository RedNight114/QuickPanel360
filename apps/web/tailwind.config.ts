import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: '#FFFFFF',
        },
        input: 'var(--input)',
        ring: 'var(--ring)',
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },

        /* ── Paleta de la app ─────────────────────────────── */
        bg: {
          base: '#FAF8F2',
          soft: '#F2EFE6',
          card: '#FFFFFF',
        },
        text: {
          primary: '#15140F',
          secondary: '#4A4840',
          muted: '#7A7770',
          disabled: '#A8A5A0',
        },
        border: {
          DEFAULT: 'var(--border)',
          light: '#E0DDD4',
          strong: '#C8C4BA',
          lighter: '#F2EFE6',
        },

        /* ── Brand dinámico (configurable por tenant) ─────── */
        brand: {
          primary: 'rgb(var(--brand-primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--brand-hover-rgb) / <alpha-value>)',
          light: 'rgb(var(--brand-light-rgb) / <alpha-value>)',
          lighter: 'rgb(var(--brand-lighter-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--brand-hover-rgb) / <alpha-value>)',
        },

        /* ── Semánticos (fijos, no cambian con el brand) ──── */
        emerald: {
          accent: '#16A34A',
          soft: '#F0FDF4',
        },
        green: {
          accent: '#166534',
        },
        panel: '#FFFFFF',
        line: '#E0DDD4',
        canvas: '#FAF8F2',
        status: {
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          info: '#2563EB',
        },
      },

      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },

      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.05)',
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        medium: '0 4px 12px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 16px rgba(15, 23, 42, 0.1), 0 2px 4px rgba(15, 23, 42, 0.05)',
      },

      animation: {
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'slide-left': 'slideLeft 0.4s ease-out',
        'slide-right': 'slideRight 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
