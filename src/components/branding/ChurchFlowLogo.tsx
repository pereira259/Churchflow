import { motion } from 'framer-motion';

export function ChurchFlowLogo({ className = "w-16 h-16" }: { className?: string }) {
    return (
        <motion.div
            className={`relative flex items-center justify-center ${className}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <img
                src="/churchflow-logo.png"
                alt="ChurchFlow Logo"
                className="w-full h-full object-contain"
            />
        </motion.div>
    );
}
