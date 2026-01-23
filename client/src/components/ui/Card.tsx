import React from 'react';
import { motion } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable }) => {
    return (
        <motion.div
            whileHover={hoverable ? { y: -5, scale: 1.01 } : {}}
            className={cn(
                'bg-card backdrop-blur-md border border-card-border rounded-3xl shadow-glass overflow-hidden',
                className
            )}
        >
            {children}
        </motion.div>
    );
};
