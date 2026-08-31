import React from 'react';

export const Logo: React.FC<{ className?: string; showText?: boolean }> = ({ className = "h-12 w-auto", showText = true }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <img src="/logo-icon.png" alt="Rawy Logo" className="h-full w-auto object-contain" />
      {showText && <img src="/logo-text.png" alt="Rawy" className="h-[60%] w-auto object-contain mt-1" />}
    </div>
  );
};
