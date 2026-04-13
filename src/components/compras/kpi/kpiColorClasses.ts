export type KpiColor = 'emerald' | 'orange' | 'blue' | 'purple' | 'green' | 'cyan' | 'red' | 'indigo' | 'teal';
export type KpiVariant = 'default' | 'featured' | 'compact' | 'minimal';

export const colorClasses: Record<KpiColor, { 
  bg: string; 
  text: string; 
  border: string; 
  glow: string;
  gradient: string;
  gradientText: string;
}> = {
  emerald: {
    bg: 'bg-[hsl(var(--kpi-emerald-bg))]',
    text: 'text-[hsl(var(--kpi-emerald))]',
    border: 'border-[hsl(var(--kpi-emerald)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-emerald)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-emerald))] to-[hsl(var(--kpi-emerald)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-emerald))] via-[hsl(var(--kpi-emerald)/0.9)] to-[hsl(var(--kpi-emerald)/0.7)]',
  },
  orange: {
    bg: 'bg-[hsl(var(--kpi-orange-bg))]',
    text: 'text-[hsl(var(--kpi-orange))]',
    border: 'border-[hsl(var(--kpi-orange)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-orange)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-orange))] to-[hsl(var(--kpi-orange)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-orange))] via-[hsl(var(--kpi-orange)/0.9)] to-[hsl(var(--kpi-orange)/0.7)]',
  },
  blue: {
    bg: 'bg-[hsl(var(--kpi-blue-bg))]',
    text: 'text-[hsl(var(--kpi-blue))]',
    border: 'border-[hsl(var(--kpi-blue)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-blue)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-blue))] to-[hsl(var(--kpi-blue)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-blue))] via-[hsl(var(--kpi-blue)/0.9)] to-[hsl(var(--kpi-blue)/0.7)]',
  },
  purple: {
    bg: 'bg-[hsl(var(--kpi-purple-bg))]',
    text: 'text-[hsl(var(--kpi-purple))]',
    border: 'border-[hsl(var(--kpi-purple)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-purple)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-purple))] to-[hsl(var(--kpi-purple)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-purple))] via-[hsl(var(--kpi-purple)/0.9)] to-[hsl(var(--kpi-purple)/0.7)]',
  },
  green: {
    bg: 'bg-[hsl(var(--kpi-green-bg))]',
    text: 'text-[hsl(var(--kpi-green))]',
    border: 'border-[hsl(var(--kpi-green)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-green)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-green))] to-[hsl(var(--kpi-green)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-green))] via-[hsl(var(--kpi-green)/0.9)] to-[hsl(var(--kpi-green)/0.7)]',
  },
  cyan: {
    bg: 'bg-[hsl(var(--kpi-cyan-bg))]',
    text: 'text-[hsl(var(--kpi-cyan))]',
    border: 'border-[hsl(var(--kpi-cyan)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-cyan)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-cyan))] to-[hsl(var(--kpi-cyan)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-cyan))] via-[hsl(var(--kpi-cyan)/0.9)] to-[hsl(var(--kpi-cyan)/0.7)]',
  },
  red: {
    bg: 'bg-[hsl(var(--kpi-red-bg))]',
    text: 'text-[hsl(var(--kpi-red))]',
    border: 'border-[hsl(var(--kpi-red)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-red)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-red))] to-[hsl(var(--kpi-red)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-red))] via-[hsl(var(--kpi-red)/0.9)] to-[hsl(var(--kpi-red)/0.7)]',
  },
  indigo: {
    bg: 'bg-[hsl(var(--kpi-indigo-bg))]',
    text: 'text-[hsl(var(--kpi-indigo))]',
    border: 'border-[hsl(var(--kpi-indigo)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-indigo)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-indigo))] to-[hsl(var(--kpi-indigo)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-indigo))] via-[hsl(var(--kpi-indigo)/0.9)] to-[hsl(var(--kpi-indigo)/0.7)]',
  },
  teal: {
    bg: 'bg-[hsl(var(--kpi-teal-bg))]',
    text: 'text-[hsl(var(--kpi-teal))]',
    border: 'border-[hsl(var(--kpi-teal)/0.2)]',
    glow: 'group-hover:shadow-[0_0_20px_hsl(var(--kpi-teal)/0.2)]',
    gradient: 'from-[hsl(var(--kpi-teal))] to-[hsl(var(--kpi-teal)/0.7)]',
    gradientText: 'from-[hsl(var(--kpi-teal))] via-[hsl(var(--kpi-teal)/0.9)] to-[hsl(var(--kpi-teal)/0.7)]',
  },
};
