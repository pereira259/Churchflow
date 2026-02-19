import { motion } from 'framer-motion';
import { ChurchFlowLogo } from '@/components/branding/ChurchFlowLogo';
import { MiniCarousel } from './MiniCarousel';
import { AuthMode } from '@/types/auth.types';

interface VisualPanelProps {
    mode: AuthMode;
    onToggle: () => void;
}

function CrucifixEffect({ isActive }: { isActive: boolean }) {
    if (!isActive) return null;

    const crosses = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 90 + 5}%`,
        size: Math.random() * 16 + 10,
        duration: Math.random() * 8 + 6,
        delay: Math.random() * 6,
        opacity: Math.random() * 0.4 + 0.15,
    }));

    return (
        <div style={{
            position: 'absolute', inset: 0,
            overflow: 'hidden', pointerEvents: 'none', zIndex: 1
        }}>
            {crosses.map(c => (
                <div key={c.id} style={{
                    position: 'absolute',
                    left: c.left,
                    bottom: '-60px',
                    fontSize: c.size,
                    color: `rgba(167, 139, 250, ${c.opacity})`,
                    animation: `riseUp ${c.duration}s ${c.delay}s linear infinite`,
                    userSelect: 'none',
                }}>
                    †
                </div>
            ))}
            <style>{`
        @keyframes riseUp {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-110vh) rotate(15deg); opacity: 0; }
        }
      `}</style>
        </div>
    );
}

export function VisualPanel({ mode, onToggle }: VisualPanelProps) {
    const isLogin = mode === 'login';

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4 text-center text-white overflow-hidden bg-gradient-to-br from-[#1e1b4b] to-[#0f172a]">

            {/* Crucifix Effect - Always Active */}
            <CrucifixEffect isActive={true} />

            {/* Background Gradient Orbs (Static) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#1e1b4b]/50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 flex flex-col items-center max-w-[260px]"
            >
                <ChurchFlowLogo className="w-10 h-10 mb-3 text-white" />

                <h2 className="font-display text-xl font-bold mb-1">
                    {isLogin ? 'Bem-vindo de volta!' : 'Olá!'}
                </h2>
                <p className="text-white/80 mb-4 text-xs max-w-[220px] leading-tight">
                    {isLogin
                        ? 'Para continuar conectado, faça login com seus dados.'
                        : 'Insira seus dados e comece sua jornada.'
                    }
                </p>

                <MiniCarousel />

                <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onToggle}
                    className="mt-4 px-6 py-1.5 rounded-full border border-white/30 text-white font-bold text-[10px] tracking-wide uppercase hover:bg-white hover:text-[#1e1b4b] transition-all"
                >
                    {isLogin ? 'Criar Conta' : 'Entrar'}
                </motion.button>
            </motion.div>
        </div>
    );
}
