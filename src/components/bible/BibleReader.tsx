import { BibleChapter } from '@/data/bible/bible-types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { BIBLE_BOOKS } from '@/data/bible/bible-types';

interface BibleReaderProps {
    chapterContent?: BibleChapter;
    fontSize: number;
    isPulpitMode: boolean;
    isLoading: boolean;
}

export function BibleReader({ chapterContent, fontSize, isPulpitMode, isLoading }: BibleReaderProps) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse space-y-4 w-full max-w-2xl px-10">
                    <div className="h-10 bg-marinho/10 rounded-xl w-1/3 mx-auto mb-8"></div>
                    <div className="h-1 bg-gold/20 w-24 mx-auto mb-8"></div>
                    <div className="space-y-3">
                        <div className="h-4 bg-marinho/5 rounded w-full"></div>
                        <div className="h-4 bg-marinho/5 rounded w-full"></div>
                        <div className="h-4 bg-marinho/5 rounded w-5/6"></div>
                        <div className="h-4 bg-marinho/5 rounded w-full"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!chapterContent) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-marinho/40 gap-4 py-20">
                <div className="h-16 w-16 rounded-2xl bg-gold/10 flex items-center justify-center">
                    <span className="text-3xl">📖</span>
                </div>
                <p className="font-medium">Selecione um capítulo para iniciar a leitura.</p>
            </div>
        );
    }

    const bookName = BIBLE_BOOKS.find(b => b.id === chapterContent.bookId)?.name || 'Livro';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
                "mx-auto transition-all duration-500 relative",
                isPulpitMode
                    ? "bg-black text-white p-16 md:p-24 min-h-screen max-w-none"
                    : "bg-white text-marinho p-10 md:p-16 my-6 max-w-4xl shadow-lg rounded-2xl border border-marinho/5"
            )}
        >
            <div className="relative z-10">
                {/* Chapter Title - Inspired by Adoração Diária */}
                <header className="mb-10 text-center">
                    <h1 className={cn(
                        "font-display font-black tracking-tight",
                        isPulpitMode ? "text-6xl md:text-7xl" : "text-4xl md:text-5xl"
                    )}>
                        <span className={cn(
                            "italic",
                            isPulpitMode ? "text-gold" : "text-marinho"
                        )}>
                            {bookName}
                        </span>
                        {" "}
                        <span className={cn(
                            "font-serif italic",
                            isPulpitMode ? "text-white/50" : "text-gold"
                        )}>
                            {chapterContent.chapter}
                        </span>
                    </h1>

                    {/* Decorative line */}
                    <div className={cn(
                        "h-0.5 w-16 mx-auto mt-6 rounded-full",
                        isPulpitMode ? "bg-gold/30" : "bg-gold"
                    )} />
                </header>

                {/* Verses */}
                <div
                    className={cn(
                        "leading-loose font-serif",
                        isPulpitMode ? "tracking-wide" : "tracking-normal"
                    )}
                    style={{
                        fontSize: `${fontSize}px`,
                        fontFamily: '"Merriweather", "Georgia", serif',
                        lineHeight: '2'
                    }}
                >
                    {chapterContent.verses.map((verse) => (
                        <span
                            key={verse.number}
                            className="inline group hover:bg-gold/10 transition-colors rounded-md px-1 py-0.5 relative"
                        >
                            <sup className={cn(
                                "font-sans font-black select-none mr-1.5 transition-opacity",
                                isPulpitMode
                                    ? "text-gold text-[0.4em] opacity-70 group-hover:opacity-100"
                                    : "text-gold text-[0.5em] opacity-60 group-hover:opacity-100"
                            )}>
                                {verse.number}
                            </sup>
                            <span className={cn(
                                isPulpitMode ? "text-gray-100" : "text-marinho"
                            )}>
                                {verse.text}{" "}
                            </span>
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
