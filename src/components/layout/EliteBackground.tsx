import React from 'react';

export const EliteBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#05020a]">
    <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[140px] bg-violet-900/25" />
    <div className="absolute bottom-[-15%] right-[15%] w-[45%] h-[45%] rounded-full blur-[140px] bg-fuchsia-900/15" />
    <div className="absolute top-[35%] right-[-5%] w-[35%] h-[35%] rounded-full blur-[120px] bg-purple-800/15" />
  </div>
);
