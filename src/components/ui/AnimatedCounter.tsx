import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
    formatFn?: (value: number) => string;
}

export function AnimatedCounter({
    value,
    duration = 1200,
    prefix = '',
    suffix = '',
    className = '',
    formatFn,
}: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const prevValueRef = useRef(0);
    const frameRef = useRef<number>(0);

    useEffect(() => {
        const startValue = prevValueRef.current;
        const endValue = value;
        const startTime = performance.now();

        if (startValue === endValue) return;

        const easeOutExpo = (t: number) =>
            t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutExpo(progress);
            const current = Math.round(startValue + (endValue - startValue) * easedProgress);

            setDisplayValue(current);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            } else {
                prevValueRef.current = endValue;
            }
        };

        frameRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frameRef.current);
    }, [value, duration]);

    const formatted = formatFn ? formatFn(displayValue) : displayValue.toString();

    return (
        <span className={className}>
            {prefix}{formatted}{suffix}
        </span>
    );
}
