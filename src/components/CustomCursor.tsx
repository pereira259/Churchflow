import { useEffect, useRef, useState } from 'react';

export function CustomCursor() {
    const cursorRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    const pos = useRef({ x: 0, y: 0 });
    const frameRef = useRef<number>();

    useEffect(() => {
        // Esconde cursor nativo
        document.body.style.cursor = 'none';

        const onMove = (e: MouseEvent) => {
            pos.current = { x: e.clientX, y: e.clientY };
            setVisible(true);
        };

        const onLeave = () => setVisible(false);
        const onEnter = () => setVisible(true);

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseleave', onLeave);
        document.addEventListener('mouseenter', onEnter);

        // Animação spring do follower
        const animate = () => {
            if (cursorRef.current) {
                cursorRef.current.style.transform =
                    `translate(${pos.current.x}px, ${pos.current.y}px)`;
            }

            frameRef.current = requestAnimationFrame(animate);
        };
        frameRef.current = requestAnimationFrame(animate);

        return () => {
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseleave', onLeave);
            document.removeEventListener('mouseenter', onEnter);
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            ref={cursorRef}
            style={{
                position: 'fixed', top: 0, left: 0, zIndex: 99999,
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
                width: 10, height: 10, borderRadius: '50%',
                background: '#6366f1',
                boxShadow: '0 0 8px rgba(99,102,241,0.6)',
            }}
        />
    );
}
