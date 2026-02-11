import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HolographicCardProps {
    children: React.ReactNode;
    className?: string;
    containerClassName?: string;
    onClick?: () => void;
}

export function HolographicCard({ children, className, containerClassName, onClick }: HolographicCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);

    // Mouse coordinates relative to card center
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // Smooth springs for tilt
    const rotateX = useSpring(useTransform(y, [-100, 100], [12, -12]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(x, [-100, 100], [-12, 12]), { stiffness: 150, damping: 20 });

    // Shine position transformation
    const shineX = useTransform(x, [-100, 100], [0, 100]);
    const shineY = useTransform(y, [-100, 100], [0, 100]);
    const shineOpacity = useSpring(useMotionValue(0), { stiffness: 100, damping: 20 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Convert to range [-100, 100]
        x.set((mouseX / width) * 200 - 100);
        y.set((mouseY / height) * 200 - 100);

        shineOpacity.set(0.6);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
        shineOpacity.set(0);
    };

    return (
        <div className={cn("perspective-1000", containerClassName)}>
            <motion.div
                ref={cardRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={onClick}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d",
                }}
                className={cn("relative group transition-shadow duration-500", className)}
            >
                {/* Dynamic Shine/Glow Layer */}
                <motion.div
                    style={{
                        background: useTransform(
                            [shineX, shineY],
                            ([sx, sy]) => `radial-gradient(circle at ${sx as number}% ${sy as number}%, rgba(212, 175, 55, 0.2), transparent 70%)`
                        ),
                        opacity: shineOpacity,
                        transform: "translateZ(1px)"
                    }}
                    className="absolute inset-0 z-20 pointer-events-none rounded-[inherit]"
                />

                {/* Holographic Iridescent Layer (Iridescent overlay effect) */}
                <motion.div
                    style={{
                        background: useTransform(
                            [shineX, shineY],
                            ([sx, sy]) => `linear-gradient(${(sx as number) + (sy as number)}deg, rgba(255,255,255,0) 0%, rgba(212, 175, 55, 0.05) 50%, rgba(255,255,255,0) 100%)`
                        ),
                        opacity: shineOpacity,
                        transform: "translateZ(2px)"
                    }}
                    className="absolute inset-0 z-30 pointer-events-none rounded-[inherit] mix-blend-soft-light"
                />

                {children}
            </motion.div>
        </div>
    );
}
