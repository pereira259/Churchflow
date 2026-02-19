import { useEffect, useRef, useState } from 'react';

function useCounterAnimation(
    targetValue: number,
    duration: number = 1200,
    delay: number = 0
) {
    const [current, setCurrent] = useState(0);
    const startTime = useRef<number | null>(null);
    const frameRef = useRef<number>();

    useEffect(() => {
        const timeout = setTimeout(() => {
            const animate = (timestamp: number) => {
                if (!startTime.current) startTime.current = timestamp;
                const progress = Math.min((timestamp - startTime.current) / duration, 1);

                // Easing: easeOutExpo
                const eased = progress === 1
                    ? 1
                    : 1 - Math.pow(2, -10 * progress);

                setCurrent(eased * targetValue);

                if (progress < 1) {
                    frameRef.current = requestAnimationFrame(animate);
                }
            };
            frameRef.current = requestAnimationFrame(animate);
        }, delay);

        return () => {
            clearTimeout(timeout);
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            startTime.current = null;
        };
    }, [targetValue, duration, delay]);

    return current;
}

export function AnimatedValue({
    value,
    prefix = 'R$ ',
    duration = 1200,
    delay = 0,
    className,
}: {
    value: number;
    prefix?: string;
    duration?: number;
    delay?: number;
    className?: string;
}) {
    const animated = useCounterAnimation(value, duration, delay);

    return (
        <span className={className}>
            {prefix}{animated.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}
        </span>
    );
}
