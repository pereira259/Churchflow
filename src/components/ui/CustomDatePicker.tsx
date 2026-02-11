import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface CustomDatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
    displayValue?: string;
}

export function CustomDatePicker({ value, onChange, placeholder = "Selecione...", className, displayValue }: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Update internal state when value changes or when opening
    useEffect(() => {
        if (isOpen && (value || displayValue)) {
            // If we have a value, use it. If we only have a displayValue (like 'Seg'), fallback to today
            const dateToUse = (value && value.includes('-')) ? value : new Date().toISOString().split('T')[0];
            setCurrentDate(new Date(dateToUse + 'T12:00:00'));
        } else if (isOpen) {
            setCurrentDate(new Date());
        }
    }, [isOpen, value, displayValue]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handleDateClick = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        onChange(`${year}-${month}-${d}`);
        setIsOpen(false);
    };

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
        setCurrentDate(newDate);
    };

    const formatDateDisplay = (isoDate: string) => {
        if (!isoDate || !isoDate.includes('-')) return '';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    };

    // Portal Element - CENTERED MODAL
    const CalendarPopup = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-[280px] bg-white rounded-2xl shadow-2xl border border-white/20 p-4 animate-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <button type="button" onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-marinho/60 transition-colors">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-sm font-black text-marinho uppercase tracking-wide">
                        {months[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button type="button" onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-lg text-marinho/60 transition-colors">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-1 mb-2 text-center border-b border-slate-50 pb-2">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                        <span key={i} className="text-[10px] font-black text-marinho/30">{d}</span>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}
                    {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                        const day = i + 1;
                        const formattedDay = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isValueMatch = value === formattedDay;
                        const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDateClick(day)}
                                className={`
                                    h-8 w-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all
                                    ${isValueMatch
                                        ? 'bg-marinho text-white shadow-lg shadow-marinho/30 scale-105'
                                        : isToday
                                            ? 'bg-slate-50 text-marinho border border-marinho/10'
                                            : 'text-slate-600 hover:bg-slate-50 hover:scale-105'
                                    }
                                `}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-50 flex justify-center">
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] font-bold text-slate-400 hover:text-marinho uppercase tracking-widest"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className={`flex items-center cursor-pointer ${className}`}
            >
                <span className={`flex-1 text-xs truncate ${(value || displayValue) ? 'text-slate-700 font-bold tracking-tight' : 'text-slate-400 font-medium'}`}>
                    {displayValue || (value ? formatDateDisplay(value) : placeholder)}
                </span>
                <CalendarIcon className={`h-3.5 w-3.5 transition-colors ${(value || displayValue) ? 'text-marinho' : 'text-marinho/30'}`} />
            </div>
            {isOpen && createPortal(CalendarPopup, document.body)}
        </>
    );
}

