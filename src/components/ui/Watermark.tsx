
import React from 'react';

export const Watermark: React.FC = () => {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-[-100%] flex flex-wrap items-center justify-center opacity-10">
        {Array.from({ length: 100 }).map((_, i) => (
          <span 
            key={i} 
            className="text-brand-navy font-bold text-4xl md:text-6xl whitespace-nowrap -rotate-45 select-none"
            style={{ padding: '20px 50px' }}
          >
            Rawy
          </span>
        ))}
      </div>
    </div>
  );
};
