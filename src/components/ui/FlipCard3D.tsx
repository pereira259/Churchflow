import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FlipCard3DProps {
    /** Content displayed on the front face */
    frontContent: ReactNode;
    /** Content displayed on the back face when flipped */
    backContent: ReactNode;
    /** Optional custom height (default: h-32) */
    height?: string;
    /** Optional custom className for container */
    className?: string;
}

/**
 * FlipCard3D - Interactive 3D flip card with spring animation
 * 
 * @example
 * <FlipCard3D
 *   frontContent={<YourFrontComponent />}
 *   backContent={<YourBackComponent />}
 * />
 */
export function FlipCard3D({
    frontContent,
    backContent,
    height = 'h-32',
    className
}: FlipCard3DProps) {
    return (
        <motion.div
            className={cn('relative cursor-pointer group', height, className)}
            style={{ transformStyle: 'preserve-3d' }}
            whileHover={{ scale: 1.02, rotateY: 180 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        >
            {/* Front Face */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-white via-white to-slate-50 rounded-2xl p-4 border border-slate-300 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.08)] backdrop-blur-sm"
                style={{ backfaceVisibility: 'hidden' }}
            >
                {frontContent}
            </div>

            {/* Back Face */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-marinho via-marinho/90 to-marinho/80 rounded-2xl p-4 border border-marinho/50 shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.08)]"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
                {backContent}
            </div>

            {/* 3D Depth Effect */}
            <div
                className="absolute inset-0 rounded-2xl bg-gradient-to-b from-transparent to-black/5 pointer-events-none"
                style={{ transform: 'translateZ(-2px)' }}
            />
        </motion.div>
    );
}
