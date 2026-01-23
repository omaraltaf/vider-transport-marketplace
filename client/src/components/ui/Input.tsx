import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => {
    return (
        <div className="space-y-1.5 w-full text-left">
            {label && (
                <label className="text-sm font-medium text-slate-300 ml-1">
                    {label}
                </label>
            )}
            <input
                className={cn(
                    'w-full bg-slate-900/50 border border-slate-700 focus:border-primary text-white rounded-xl px-4 py-3 outline-none transition-all duration-200 placeholder:text-slate-600',
                    error && 'border-red-500/50 focus:border-red-500',
                    className
                )}
                {...props}
            />
            {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
        </div>
    );
};
