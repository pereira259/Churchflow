import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumCalendarProps {
    selectedDate: Date | null;
    onChange: (date: Date) => void;
    onClose: () => void;
    className?: string;
}

export function PremiumCalendar({ selectedDate, onChange, onClose, className }: PremiumCalendarProps) {
    const [viewDate, setViewDate] = useState(selectedDate || new Date());
    const [direction, setDirection] = useState(0);

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const changeMonth = (increment: number) => {
        setDirection(increment);
        setViewDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + increment);
            return newDate;
        });
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onChange(newDate);
        onClose();
    };

    const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

    // Array para preencher os dias
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 20 : -20,
            opacity: 0
        }),
        center: {
            x: 0,
            opacity: 1
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 20 : -20,
            opacity: 0
        })
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() &&
            viewDate.getMonth() === today.getMonth() &&
            viewDate.getFullYear() === today.getFullYear();
    };

    const isSelected = (day: number) => {
        if (!selectedDate) return false;
        return day === selectedDate.getDate() &&
            viewDate.getMonth() === selectedDate.getMonth() &&
            viewDate.getFullYear() === selectedDate.getFullYear();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className={cn(
                "bg-white rounded-2xl shadow-premium border border-white/20 p-4 w-[320px] overflow-hidden",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-1">
                <button
                    onClick={() => changeMonth(-1)}
                    className="p-1 rounded-full hover:bg-slate-50 text-slate-400 hover:text-marinho transition-colors"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <h3 className="text-sm font-bold text-marinho uppercase tracking-wider">
                    {months[viewDate.getMonth()]} <span className="text-gold">{viewDate.getFullYear()}</span>
                </h3>

                <button
                    onClick={() => changeMonth(1)}
                    className="p-1 rounded-full hover:bg-slate-50 text-slate-400 hover:text-marinho transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Week Days */}
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-[10px] font-black text-slate-300 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={viewDate.toISOString()}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "tween", duration: 0.2 }}
                    className="grid grid-cols-7 gap-1"
                >
                    {blanks.map(blank => (
                        <div key={`blank-${blank}`} className="h-8" />
                    ))}

                    {days.map(day => (
                        <button
                            key={day}
                            onClick={(e) => { e.preventDefault(); handleDateClick(day); }}
                            className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all mx-auto",
                                isSelected(day)
                                    ? "bg-marinho text-white shadow-lg scale-110"
                                    : isToday(day)
                                        ? "bg-gold/10 text-marinho border border-gold/30"
                                        : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            {day}
                        </button>
                    ))}
                </motion.div>
            </AnimatePresence>

            <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                <button
                    onClick={() => { onChange(new Date()); onClose(); }}
                    className="text-[10px] font-bold text-gold hover:text-gold/80 uppercase tracking-wider"
                >
                    Hoje
                </button>
                <button
                    onClick={onClose}
                    className="text-[10px] font-bold text-slate-400 hover:text-marinho uppercase tracking-wider"
                >
                    Fechar
                </button>
            </div>
        </motion.div>
    );
}
