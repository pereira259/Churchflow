import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface GhostCursorProps {
    x: number;
    y: number;
    isActive: boolean;
    isClicking?: boolean;
}

export function GhostCursor({ x, y, isActive, isClicking = false }: GhostCursorProps) {
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);

    useEffect(() => {
        if (isClicking) {
            const id = Date.now();
            setRipples(prev => [...prev, { id, x, y }]);
            setTimeout(() => {
                setRipples(prev => prev.filter(r => r.id !== id));
            }, 1000);
        }
    }, [isClicking]);

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{ width: '100vw', height: '100vh', zIndex: 9999 }}
        >
            <AnimatePresence>
                {isActive && (
                    <>
                        {/* Ripple Effect (Click) */}
                        {ripples.map(ripple => (
                            <motion.div
                                key={ripple.id}
                                initial={{ scale: 0, opacity: 0.8 }}
                                animate={{ scale: 2.5, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="absolute h-12 w-12 rounded-full border-2 border-[#d4af37] bg-[#d4af37]/20"
                                style={{
                                    left: ripple.x - 24,
                                    top: ripple.y - 24,
                                }}
                            />
                        ))}

                        {/* Mouse Cursor */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{
                                opacity: 1,
                                scale: isClicking ? 0.9 : 1,
                                x: x,
                                y: y
                            }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{
                                type: "spring",
                                stiffness: 150,
                                damping: 25,
                                mass: 0.6
                            }}
                            className="absolute top-0 left-0"
                        >
                            {/* Realistic Mac-style Cursor */}
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] filter">
                                <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" fill="#1e1b4b" stroke="white" strokeWidth="2.5" />
                            </svg>

                            {/* Label/Avatar attached to cursor (Optional, can be added later) */}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
