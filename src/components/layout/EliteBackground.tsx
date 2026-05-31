
export const EliteBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-background">
    <div className="absolute top-[-15%] left-[-15%] w-[70%] h-[70%] rounded-full blur-[160px] bg-violet-900/20 animate-bg-drift opacity-60" />
    <div className="absolute bottom-[-20%] right-[10%] w-[60%] h-[60%] rounded-full blur-[160px] bg-fuchsia-900/15 animate-bg-drift-reverse opacity-50" />
    <div className="absolute top-[30%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[140px] bg-purple-800/15 animate-pulse-slow opacity-40" />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
  </div>
);
