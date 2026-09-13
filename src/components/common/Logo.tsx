import React, { useState } from 'react';

interface LogoProps {
  variant?: 'full' | 'mark' | 'header';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  const [imgError, setImgError] = useState(false);

  // Dimension helpers
  const getDimensions = () => {
    switch (size) {
      case 'sm':
        return { imgSize: 'w-7 h-7', text: 'text-xs', sub: 'text-[9px]' };
      case 'lg':
        return { imgSize: 'w-14 h-14', text: 'text-xl', sub: 'text-xs' };
      case 'xl':
        return { imgSize: 'w-20 h-20', text: 'text-2xl', sub: 'text-sm' };
      case 'md':
      default:
        return { imgSize: 'w-9 h-9', text: 'text-sm', sub: 'text-[10px]' };
    }
  };

  const dims = getDimensions();

  // Mark-only (e.g. collapsed sidebar or compact topbar icon)
  if (variant === 'mark') {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${dims.imgSize} rounded-xl overflow-hidden bg-white shadow-2xs border border-slate-200/60 dark:border-slate-800 ${className}`}>
        {!imgError ? (
          <img
            src="/codeneksa_logo.jpg"
            alt="Codeneksa Logo"
            className="w-full h-full object-contain p-0.5"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-sm">
            CN
          </div>
        )}
      </div>
    );
  }

  // Header / Topbar variant: clean horizontal logo
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-white shadow-2xs border border-slate-200/80 dark:border-slate-800 shrink-0 p-0.5">
          <img
            src="/codeneksa_logo.jpg"
            alt="Codeneksa Logo"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-xs tracking-wider text-slate-900 dark:text-white uppercase font-sans">
              CODENEKSA
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest px-1 py-0.2 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              OS
            </span>
          </div>
          {showTagline && (
            <span className="text-[9px] text-slate-500 dark:text-slate-400 -mt-0.5 tracking-tight font-medium">
              Enhancing Intelligence
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full variant: complete logo mark + typography + tagline
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`${dims.imgSize} rounded-2xl overflow-hidden bg-white shadow-xs border border-slate-200/80 dark:border-slate-800 shrink-0 p-0.5 transition-transform hover:scale-105`}
      >
        <img
          src="/codeneksa_logo.jpg"
          alt="Codeneksa Logo"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-black tracking-widest text-slate-900 dark:text-white ${dims.text}`}>
            CODENEKSA
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest px-1 py-0.2 rounded bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            OS
          </span>
        </div>
        {showTagline && (
          <div className={`flex items-center gap-1 text-slate-500 dark:text-slate-400 ${dims.sub} font-medium`}>
            <span>Enhancing Intelligence</span>
            <span className="text-orange-500 text-[10px]">✈</span>
          </div>
        )}
      </div>
    </div>
  );
};
