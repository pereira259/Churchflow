import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

interface ScrollRevealProps {
    children: ReactNode;
    direction?: Direction;
    delay?: number;
    duration?: number;
    className?: string;
    once?: boolean;
    amount?: number;
}

const directionOffset: Record<Direction, { x: number; y: number }> = {
    up: { x: 0, y: 24 },
    down: { x: 0, y: -24 },
    left: { x: 24, y: 0 },
    right: { x: -24, y: 0 },
    none: { x: 0, y: 0 },
};

export function ScrollReveal({
    children,
    direction = 'up',
    delay = 0,
    duration = 0.5,
    className = '',
    once = true,
    amount = 0.3,
}: ScrollRevealProps) {
    const prefersReduced = useReducedMotion();
    const offset = directionOffset[direction];

    if (prefersReduced) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: offset.x, y: offset.y }}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={{ once, amount }}
            transition={{
                duration,
                delay,
                ease: [0.25, 0.1, 0.25, 1],
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

interface StaggerContainerProps {
    children: ReactNode;
    className?: string;
    staggerDelay?: number;
}

export function StaggerContainer({
    children,
    className = '',
    staggerDelay = 0.08,
}: StaggerContainerProps) {
    const prefersReduced = useReducedMotion();

    if (prefersReduced) {
        return <div className={className}>{children}</div>;
    }

    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: staggerDelay,
                    },
                },
            }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

export const staggerItem = {
    hidden: { opacity: 0, y: 16 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.4,
            ease: [0.25, 0.1, 0.25, 1],
        },
    },
};
