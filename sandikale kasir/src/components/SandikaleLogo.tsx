import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'mark' | 'watermark' | 'stamp';
  width?: number | string;
  height?: number | string;
  color?: string;
}

export const SandikaleLogo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
}) => {
  if (variant === 'mark') {
    return (
      <span className={`font-black tracking-wider text-inherit font-['Plus_Jakarta_Sans',sans-serif] ${className}`}>
        SANDIKALE
      </span>
    );
  }

  if (variant === 'watermark') {
    return (
      <div className={`pointer-events-none select-none flex flex-col items-center justify-center opacity-[0.04] dark:opacity-[0.03] ${className}`}>
        <span className="font-black text-3xl sm:text-5xl tracking-widest text-slate-400 uppercase">
          SANDIKALE
        </span>
        <span className="font-mono text-[9px] uppercase tracking-widest mt-1 font-bold text-slate-500">
          SANDIKALE-PROJECT POS
        </span>
      </div>
    );
  }

  if (variant === 'stamp') {
    return (
      <div className={`border-2 border-red-600/30 rounded-xl px-3 py-1.5 text-center inline-flex flex-col items-center bg-red-950/20 backdrop-blur-sm select-none ${className}`}>
        <span className="font-extrabold text-xs text-red-500 tracking-[0.14em] uppercase">
          SANDIKALE • VERIFIED ORIGINAL
        </span>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5">SANDIKALE PRODUCTION SYSTEM</div>
      </div>
    );
  }

  // Full Brand display: Just Name only (no logo graphic)
  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div className="flex items-center gap-1.5">
        <span className="font-black text-base sm:text-lg tracking-wider text-white leading-tight font-['Plus_Jakarta_Sans',sans-serif]">
          SANDIKALE
        </span>
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
      </div>
      <span className="text-[10px] font-bold tracking-[0.22em] text-red-400 uppercase leading-none mt-0.5 font-mono">
        PROJECT POS
      </span>
    </div>
  );
};
