
import React, { createContext, useContext, useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';

// --- Context ---
interface CursorContextType {
    cursorVariant: string;
    setCursorVariant: (variant: string) => void;
    cursorText: string;
    setCursorText: (text: string) => void;
    isTouchDevice: boolean;
}

const CursorContext = createContext<CursorContextType>({
    cursorVariant: 'default',
    setCursorVariant: () => { },
    cursorText: '',
    setCursorText: () => { },
    isTouchDevice: false,
});

export const useCursor = () => useContext(CursorContext);

// --- Provider ---
interface CursorProviderProps {
    children: React.ReactNode;
    global?: boolean;
}

export function CursorProvider({ children, global = false }: CursorProviderProps) {
    const [cursorVariant, setCursorVariant] = useState('default');
    const [cursorText, setCursorText] = useState('');
    const [isTouchDevice, setIsTouchDevice] = useState(false);

    useEffect(() => {
        // Detect touch device
        const checkTouch = () => {
            setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
        };
        checkTouch();
        window.addEventListener('resize', checkTouch);
        return () => window.removeEventListener('resize', checkTouch);
    }, []);

    useEffect(() => {
        if (!global || isTouchDevice) return;

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Check for data-cursor attribute
            const cursorType = target.closest('[data-cursor]')?.getAttribute('data-cursor');

            if (cursorType === 'pointer') {
                setCursorVariant('pointer');
            } else if (target.tagName.toLowerCase() === 'a' || target.tagName.toLowerCase() === 'button' || target.closest('a') || target.closest('button')) {
                setCursorVariant('pointer');
            } else {
                setCursorVariant('default');
            }
        };

        const handleMouseOut = () => {
            setCursorVariant('default');
        };

        window.addEventListener('mouseover', handleMouseOver);
        window.addEventListener('mouseout', handleMouseOut);

        return () => {
            window.removeEventListener('mouseover', handleMouseOver);
            window.removeEventListener('mouseout', handleMouseOut);
        };
    }, [global, isTouchDevice]);

    return (
        <CursorContext.Provider value={{ cursorVariant, setCursorVariant, cursorText, setCursorText, isTouchDevice }}>
            {children}
        </CursorContext.Provider>
    );
}

// --- Components ---

export function Cursor() {
    const { cursorVariant, isTouchDevice } = useCursor();
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    useEffect(() => {
        if (isTouchDevice) return;
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };
        window.addEventListener('mousemove', moveCursor);
        return () => window.removeEventListener('mousemove', moveCursor);
    }, [isTouchDevice]);

    if (isTouchDevice) return null;

    return (
        <motion.div
            className="fixed top-0 left-0 bg-indigo-600 rounded-full z-[99999] pointer-events-none mix-blend-difference"
            style={{
                x: cursorX,
                y: cursorY,
                translateX: '-50%',
                translateY: '-50%',
            }}
            variants={{
                default: { width: 8, height: 8, opacity: 1 },
                pointer: { width: 0, height: 0, opacity: 0 }, // Hides inner dot on pointer if we want
            }}
            animate={cursorVariant}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        />
    );
}

interface CursorFollowProps {
    children?: React.ReactNode;
}

export function CursorFollow({ children }: CursorFollowProps) {
    const { cursorVariant, isTouchDevice } = useCursor();
    const cursorX = useMotionValue(-100);
    const cursorY = useMotionValue(-100);

    const springConfig = { damping: 25, stiffness: 120 };
    const cursorXSpring = useSpring(cursorX, springConfig);
    const cursorYSpring = useSpring(cursorY, springConfig);

    useEffect(() => {
        if (isTouchDevice) return;
        const moveCursor = (e: MouseEvent) => {
            cursorX.set(e.clientX);
            cursorY.set(e.clientY);
        };
        window.addEventListener('mousemove', moveCursor);
        return () => window.removeEventListener('mousemove', moveCursor);
    }, [isTouchDevice]);

    if (isTouchDevice) return null;

    const variants = {
        default: {
            opacity: 1,
            height: 40,
            width: 40,
            fontSize: '16px',
            backgroundColor: 'rgba(255, 255, 255, 0)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            x: '-50%',
            y: '-50%',
        },
        pointer: {
            opacity: 1,
            height: 60,
            width: 60,
            backgroundColor: 'rgba(99, 102, 241, 0.1)', // Indigo transparent
            border: '1px solid rgba(99, 102, 241, 0.4)',
            x: '-50%',
            y: '-50%',
        },
    };

    return (
        <motion.div
            className="fixed top-0 left-0 rounded-full z-[99998] pointer-events-none flex items-center justify-center backdrop-blur-[1px]"
            style={{
                left: cursorXSpring,
                top: cursorYSpring,
            }}
            variants={variants}
            animate={cursorVariant}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        >
            <AnimatePresence>
                <motion.div>
                    {children}
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );
}
