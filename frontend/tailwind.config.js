/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        "surface-4": "var(--surface-4)",
        
        brand: {
          DEFAULT: "var(--brand)",
          light: "var(--brand-light)",
          dim: "var(--brand-dim)",
        },
        
        emergency: {
          DEFAULT: "var(--emergency)",
          dim: "var(--emergency-dim)",
        },
        
        "challan-amount": "var(--challan-amount)",

        text: {
          1: "var(--text-1)",
          2: "var(--text-2)",
          3: "var(--text-3)",
          green: "var(--text-green)",
          red: "var(--text-red)",
          amber: "var(--text-amber)",
        },

        /* ── shadcn/ui tokens ── */
        "background": "var(--background)",
        "border": "var(--border)",
        "input": "var(--input)",
        "ring": "var(--ring)",
        "foreground": "var(--foreground)",
        "primary": { DEFAULT: "var(--primary)", foreground: "var(--primary-foreground)" },
        "secondary": { DEFAULT: "var(--secondary)", foreground: "var(--secondary-foreground)" },
        "card": { DEFAULT: "var(--card)", foreground: "var(--card-foreground)" },
        "popover": { DEFAULT: "var(--popover)", foreground: "var(--popover-foreground)" },
        "muted": { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" },
        "accent": { DEFAULT: "var(--accent)", foreground: "var(--accent-foreground)" },
        "destructive": { DEFAULT: "var(--destructive)", foreground: "var(--destructive-foreground)" },
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
        "sidebar": {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },
      fontFamily: {
        sans: ['Inter', 'Inter Variable', '-apple-system', 'sans-serif'],
        space: ['Space Grotesk', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "sos-pulse": "sosPulse 1.5s infinite",
        shimmer: "shimmer 2s infinite linear",
        "radar-pulse": "radarPulse 3s infinite ease-out",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        sosPulse: {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(255, 68, 68, 0.7)" },
          "70%": { transform: "scale(1.05)", boxShadow: "0 0 0 15px rgba(255, 68, 68, 0)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 rgba(255, 68, 68, 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        radarPulse: {
          "0%": { transform: "translate(-50%, -50%) scale(0.5)", opacity: "1" },
          "100%": { transform: "translate(-50%, -50%) scale(2.5)", opacity: "0" },
        }
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
};
