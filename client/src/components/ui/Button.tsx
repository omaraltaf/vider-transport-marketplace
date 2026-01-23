import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to merge tailwind classes
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'variant' | 'children'> {
    children?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    disabled,
    ...props
}: ButtonProps) => {
    const variants = {
        primary: 'bg-primary hover:bg-primary-dark text-background font-semibold shadow-glow',
        secondary: 'bg-secondary hover:bg-secondary-dark text-white font-semibold',
        outline: 'bg-transparent border border-slate-700 hover:border-slate-500 text-white',
        ghost: 'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-6 py-2.5 text-base',
        lg: 'px-8 py-3.5 text-lg',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                'relative inline-flex items-center justify-center rounded-xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {children}
        </motion.button>
    );
};
