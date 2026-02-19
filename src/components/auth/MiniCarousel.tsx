import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, DollarSign, MessageSquare } from 'lucide-react';

const features = [
    {
        id: 1,
        icon: Users,
        title: "Gestão de Membros",
        text: "Controle completo da sua congregação"
    },
    {
        id: 2,
        icon: DollarSign,
        title: "Controle Financeiro",
        text: "Dízimos e ofertas organizados"
    },
    {
        id: 3,
        icon: MessageSquare,
        title: "Comunicação",
        text: "Mensagens para todos os membros"
    }
];

export function MiniCarousel() {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % features.length);
        }, 4000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="w-full relative min-h-[120px] flex flex-col items-center justify-center mt-4">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center text-center text-white space-y-2 p-2"
                >
                    <div className="bg-white/10 p-2 rounded-xl backdrop-blur-sm border border-white/10">
                        {(() => {
                            const Icon = features[currentIndex].icon;
                            return <Icon className="w-5 h-5 text-[#d4af37]" />;
                        })()}
                    </div>
                    <h3 className="font-display text-base font-bold">{features[currentIndex].title}</h3>
                    <p className="text-white/80 text-[10px] max-w-[180px] leading-tight">
                        {features[currentIndex].text}
                    </p>
                </motion.div>
            </AnimatePresence>

            <div className="flex gap-2 mt-4">
                {features.map((_, idx) => (
                    <button
                        type="button"
                        key={idx}
                        onClick={() => setCurrentIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/30'
                            }`}
                        aria-label={`Ir para slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}

