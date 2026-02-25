import { useState, useRef, useCallback } from 'react';

interface RateLimitOptions {
    maxAttempts?: number;
    windowMs?: number;
}

/**
 * A simple client-side rate limiter hook to discourage brute-force attempts.
 * Note: Real security rate limiting must be done on the server/edge.
 */
export function useRateLimit({ maxAttempts = 5, windowMs = 60000 }: RateLimitOptions = {}) {
    const [isLocked, setIsLocked] = useState(false);
    const attempts = useRef<number[]>([]);

    const checkLimit = useCallback(() => {
        const now = Date.now();
        // Remove attempts older than the window
        attempts.current = attempts.current.filter(timestamp => now - timestamp < windowMs);

        if (isLocked) {
            // If already locked, check if lock expired (using the window as lock duration for simplicity)
            const lastAttempt = attempts.current[attempts.current.length - 1];
            if (now - lastAttempt > windowMs) {
                setIsLocked(false);
                attempts.current = []; // Reset on unlock
                return true; // Allowed
            }
            return false; // Still locked
        }

        if (attempts.current.length >= maxAttempts) {
            setIsLocked(true);
            return false;
        }

        attempts.current.push(now);
        return true;
    }, [maxAttempts, windowMs, isLocked]);

    const reset = useCallback(() => {
        attempts.current = [];
        setIsLocked(false);
    }, []);

    return { checkLimit, isLocked, reset, attemptsLeft: Math.max(0, maxAttempts - attempts.current.length) };
}
