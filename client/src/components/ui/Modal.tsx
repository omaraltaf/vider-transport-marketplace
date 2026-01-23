import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 z-[51] flex items-center justify-center pointer-events-none p-4"
                    >
                        <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-3xl shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
                                <h2 className="text-xl font-bold">{title}</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
