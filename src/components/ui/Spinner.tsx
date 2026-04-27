
import React from 'react';

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; color?: string; }

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color }) => {
    const s = size === 'sm' ? 'w-4 h-4 border-2' : size === 'lg' ? 'w-24 h-24 border-4' : 'w-16 h-16 border-4';
    const borderColor = color ? `border-current border-t-transparent` : `border-brand-baby-blue border-t-brand-coral`;
    return <div className={`${s} ${borderColor} ${color || ''} rounded-full animate-spin`}></div>;
};
