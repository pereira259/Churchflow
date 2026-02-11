import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight } from 'lucide-react';
import { BIBLE_BOOKS } from '@/data/bible/bible-types';
import { cn } from '@/lib/utils';

interface BibleNavigationProps {
    currentBookId: string;
    onSelectBook: (bookId: string) => void;
    onSelectChapter: (chapter: number) => void;
    currentChapter: number;
    isOpen: boolean;
}

export function BibleNavigation({ currentBookId, onSelectBook, onSelectChapter, currentChapter, isOpen }: BibleNavigationProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [testament, setTestament] = useState<'AT' | 'NT'>('AT');
    const [expandedBook, setExpandedBook] = useState<string | null>(currentBookId);

    // Separate books by testament
    const oldTestamentBooks = BIBLE_BOOKS.filter(b =>
        ['gn', 'ex', 'lv', 'nm', 'dt', 'js', 'jz', 'rt', '1sm', '2sm', '1rs', '2rs', '1cr', '2cr', 'ed', 'ne', 'et', 'job', 'sl', 'pv', 'ec', 'ct', 'is', 'jr', 'lm', 'ez', 'dn', 'os', 'jl', 'am', 'ob', 'jn', 'mq', 'na', 'hc', 'sf', 'ag', 'zc', 'ml'].includes(b.id)
    );

    const newTestamentBooks = BIBLE_BOOKS.filter(b =>
        ['mt', 'mc', 'lc', 'jo', 'at', 'rm', '1co', '2co', 'gl', 'ef', 'fp', 'cl', '1ts', '2ts', '1tm', '2tm', 'tt', 'fm', 'hb', 'tg', '1pe', '2pe', '1jo', '2jo', '3jo', 'jd', 'ap'].includes(b.id)
    );

    const currentBooks = testament === 'AT' ? oldTestamentBooks : newTestamentBooks;

    const filteredBooks = currentBooks.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.abbrev.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleBook = (bookId: string) => {
        if (expandedBook === bookId) {
            setExpandedBook(null);
        } else {
            setExpandedBook(bookId);
            onSelectBook(bookId);
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-80 h-full bg-white border-r border-marinho/5 flex flex-col shrink-0 shadow-xl z-30"
        >
            {/* Header with AT/NT Toggle */}
            <div className="p-4 border-b border-marinho/5 space-y-4 bg-cream-50">
                {/* Testament Toggle */}
                <div className="flex bg-marinho/5 p-1 rounded-xl">
                    <button
                        onClick={() => setTestament('AT')}
                        className={cn(
                            "flex-1 py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                            testament === 'AT'
                                ? "bg-marinho text-white shadow-md"
                                : "text-marinho/50 hover:text-marinho"
                        )}
                    >
                        Antigo Testamento
                    </button>
                    <button
                        onClick={() => setTestament('NT')}
                        className={cn(
                            "flex-1 py-2.5 px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                            testament === 'NT'
                                ? "bg-marinho text-white shadow-md"
                                : "text-marinho/50 hover:text-marinho"
                        )}
                    >
                        Novo Testamento
                    </button>
                </div>

                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-marinho/30 group-focus-within:text-gold transition-colors" />
                    <input
                        type="text"
                        placeholder="Pesquisar na Bíblia..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-marinho/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-marinho placeholder:text-marinho/30 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all"
                    />
                </div>
            </div>

            {/* Books List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                {filteredBooks.map((book) => (
                    <div key={book.id} className="overflow-hidden rounded-xl">
                        <button
                            onClick={() => toggleBook(book.id)}
                            className={cn(
                                "w-full flex items-center justify-between p-3.5 text-left transition-all rounded-xl",
                                expandedBook === book.id || currentBookId === book.id
                                    ? "bg-marinho text-white shadow-lg"
                                    : "bg-white border border-marinho/5 text-marinho/70 hover:bg-marinho/5 hover:text-marinho hover:border-marinho/10"
                            )}
                        >
                            <span className="text-sm font-bold tracking-tight">{book.name}</span>
                            <ChevronRight className={cn(
                                "h-4 w-4 transition-transform",
                                expandedBook === book.id ? "rotate-90 text-gold" : "text-current opacity-30"
                            )} />
                        </button>

                        <AnimatePresence>
                            {expandedBook === book.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="bg-cream-50 border border-marinho/5 border-t-0 rounded-b-xl"
                                >
                                    <div className="p-3 grid grid-cols-6 gap-1.5">
                                        {Array.from({ length: book.chapters }, (_, i) => i + 1).map(chap => (
                                            <button
                                                key={chap}
                                                onClick={() => onSelectChapter(chap)}
                                                className={cn(
                                                    "h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                                                    currentChapter === chap && currentBookId === book.id
                                                        ? "bg-gold text-white shadow-md"
                                                        : "bg-white border border-marinho/5 text-marinho/60 hover:border-gold hover:text-gold hover:shadow-sm"
                                                )}
                                            >
                                                {chap}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
