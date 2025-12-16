import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ===== TYPOGRAPHY ===== */
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },

      /* ===== COLORS ===== */
      colors: {
        // Core
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Primary
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },

        // Secondary
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        // Semantic
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },

        // Muted
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        // Accent
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        // Popover
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // Card
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          elevated: "hsl(var(--card-elevated))",
        },

        // Sidebar
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // Chart
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },

        // Gamification
        xp: {
          DEFAULT: "hsl(var(--xp))",
          foreground: "hsl(var(--xp-foreground))",
        },
        coins: {
          DEFAULT: "hsl(var(--coins))",
          foreground: "hsl(var(--coins-foreground))",
        },
        streak: {
          DEFAULT: "hsl(var(--streak))",
          foreground: "hsl(var(--streak-foreground))",
        },
        level: {
          DEFAULT: "hsl(var(--level))",
          foreground: "hsl(var(--level-foreground))",
        },

        // Ranks
        "rank-gold": {
          DEFAULT: "hsl(var(--rank-gold))",
          foreground: "hsl(var(--rank-gold-foreground))",
        },
        "rank-silver": {
          DEFAULT: "hsl(var(--rank-silver))",
          foreground: "hsl(var(--rank-silver-foreground))",
        },
        "rank-bronze": {
          DEFAULT: "hsl(var(--rank-bronze))",
          foreground: "hsl(var(--rank-bronze-foreground))",
        },

        // Modules
        tasks: {
          DEFAULT: "hsl(var(--tasks))",
          foreground: "hsl(var(--tasks-foreground))",
        },
        gravacoes: {
          DEFAULT: "hsl(var(--gravacoes))",
          foreground: "hsl(var(--gravacoes-foreground))",
        },
        finance: {
          DEFAULT: "hsl(var(--finance))",
          foreground: "hsl(var(--finance-foreground))",
        },
        sales: {
          DEFAULT: "hsl(var(--sales))",
          foreground: "hsl(var(--sales-foreground))",
        },
        store: {
          DEFAULT: "hsl(var(--store))",
          foreground: "hsl(var(--store-foreground))",
        },
        zapp: {
          DEFAULT: "hsl(var(--zapp))",
          foreground: "hsl(var(--zapp-foreground))",
        },
        loggi: {
          DEFAULT: "hsl(var(--loggi))",
          foreground: "hsl(var(--loggi-foreground))",
        },

        // Legacy compatibility
        gold: "hsl(var(--rank-gold))",
        silver: "hsl(var(--rank-silver))",
        bronze: "hsl(var(--rank-bronze))",
      },

      /* ===== BORDER RADIUS ===== */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "calc(var(--radius) + 12px)",
      },

      /* ===== SPACING ===== */
      spacing: {
        card: "var(--spacing-card)",
        "card-sm": "var(--spacing-card-sm)",
        "card-lg": "var(--spacing-card-lg)",
        section: "var(--spacing-section)",
        "section-lg": "var(--spacing-section-lg)",
      },

      /* ===== SCALE ===== */
      scale: {
        "98": "0.98",
        "102": "1.02",
      },

      /* ===== BOX SHADOW ===== */
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "glow-primary": "var(--shadow-glow-primary)",
        "glow-secondary": "var(--shadow-glow-secondary)",
        "glow-success": "var(--shadow-glow-success)",
        header: "var(--shadow-header)",
        elevated: "0 4px 20px -2px hsl(var(--foreground) / 0.08)",
      },

      /* ===== TRANSITIONS ===== */
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "250": "250ms",
        "300": "300ms",
        "400": "400ms",
        "500": "500ms",
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },

      /* ===== KEYFRAMES ===== */
      keyframes: {
        // Accordion
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },

        // Fade
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "fade-in-scale": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },

        // Slide
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-left": {
          from: { transform: "translateX(10px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-right": {
          from: { transform: "translateX(-10px)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },

        // Scale
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pop: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },

        // Effects
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.5" },
          "50%": { transform: "scale(1.2)", opacity: "0" },
          "100%": { transform: "scale(0.8)", opacity: "0.5" },
        },

        // Glow effects
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.6)" },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(var(--primary) / 0.3)" },
          "50%": { borderColor: "hsl(var(--primary) / 0.8)" },
        },

        // Gamification specific
        "count-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "xp-shimmer": {
          "0%": { backgroundPosition: "-100% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "streak-fire": {
          "0%, 100%": { transform: "scale(1)", filter: "brightness(1)" },
          "50%": { transform: "scale(1.1)", filter: "brightness(1.3)" },
        },
        "coin-shine": {
          "0%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(180deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
        "level-up": {
          "0%": { transform: "scale(1)", boxShadow: "0 0 0 0 hsl(var(--primary) / 0.7)" },
          "50%": { transform: "scale(1.05)", boxShadow: "0 0 30px 10px hsl(var(--primary) / 0.4)" },
          "100%": { transform: "scale(1)", boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
        },

        // Feedback
        "flash-success": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "hsl(var(--success) / 0.2)" },
        },
        "flash-error": {
          "0%, 100%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "hsl(var(--destructive) / 0.2)" },
        },

        // Loaders
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "ping-slow": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "75%, 100%": { transform: "scale(1.5)", opacity: "0" },
        },
      },

      /* ===== ANIMATIONS ===== */
      animation: {
        // Core
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "fade-in-scale": "fade-in-scale 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "scale-in": "scale-in 0.2s ease-out",

        // Slide
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-left": "slide-left 0.3s ease-out",
        "slide-right": "slide-right 0.3s ease-out",

        // Interactive
        "bounce-in": "bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        wiggle: "wiggle 0.3s ease-in-out",
        pop: "pop 0.3s ease-out",
        float: "float 3s ease-in-out infinite",

        // Effects
        shimmer: "shimmer 2s linear infinite",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",

        // Gamification
        "count-up": "count-up 0.4s ease-out forwards",
        "xp-shimmer": "xp-shimmer 2s ease-in-out infinite",
        "streak-fire": "streak-fire 0.8s ease-in-out infinite",
        "coin-shine": "coin-shine 2s ease-in-out infinite",
        "level-up": "level-up 0.6s ease-out",

        // Feedback
        "flash-success": "flash-success 0.5s ease-in-out",
        "flash-error": "flash-error 0.5s ease-in-out",

        // Loaders
        "spin-slow": "spin-slow 3s linear infinite",
        "ping-slow": "ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
