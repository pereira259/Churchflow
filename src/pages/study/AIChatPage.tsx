import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, BookOpen, BookMarked, Languages, HelpCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { askNicodemos, type StudyVerse, type KeyTerm } from '@/lib/ai/nicodemos-agent';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    verses?: StudyVerse[];
    keyTerms?: KeyTerm[];
    suggestedQuestions?: string[];
    fromCache?: boolean;
}

export function AIChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (overrideMessage?: string) => {
        const messageToSend = overrideMessage || inputValue.trim();
        if (!messageToSend) return;

        const newUserMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageToSend,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMsg]);
        if (!overrideMessage) setInputValue('');
        setIsTyping(true);

        try {
            const history = messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content
            }));

            const result = await askNicodemos(messageToSend, history);

            const newAiMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.answer,
                timestamp: new Date(),
                verses: result.verses,
                keyTerms: result.keyTerms,
                suggestedQuestions: result.suggestedQuestions,
                fromCache: result.fromCache
            };

            setMessages(prev => [...prev, newAiMsg]);
        } catch (error) {
            console.error("AI Error:", error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Erro ao conectar com Nicodemos: ${error instanceof Error ? error.message : String(error)}. Verifique a chave API do Groq.`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const renderEmptyState = () => (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#1e1b4b] to-[#2d2a5d] flex items-center justify-center text-[#d4af37] shadow-xl shadow-[#1e1b4b]/20 mb-2 mt-24">
                <BookOpen className="h-8 w-8" />
            </div>
            <div className="space-y-2 text-center max-w-lg">
                <h2 className="text-xl font-bold text-[#1e1b4b]">
                    O que vamos estudar na Palavra hoje?
                </h2>
                <p className="text-[#1e1b4b]/60 text-sm">
                    Seu assistente teológico para explorar as Escrituras com profundidade.
                </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-xl mt-4">
                {[
                    'Me explique João 3:16 no grego',
                    'O que é justificação pela fé?',
                    'Estrutura do livro de Romanos',
                    'Significado de "graça" no hebraico'
                ].map((q) => (
                    <button
                        key={q}
                        onClick={() => handleSend(q)}
                        className="px-4 py-2 text-xs font-medium rounded-full border border-[#1e1b4b]/10 text-[#1e1b4b]/70 hover:bg-[#1e1b4b]/5 hover:border-[#d4af37]/30 transition-all duration-200"
                    >
                        {q}
                    </button>
                ))}
            </div>
        </div>
    );

    const renderVerses = (verses: StudyVerse[]) => {
        if (!verses.length) return null;
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#1e1b4b]/[0.03] to-[#1e1b4b]/[0.06] border border-[#1e1b4b]/[0.06]"
            >
                <div className="flex items-center gap-1.5 mb-3">
                    <BookMarked className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e1b4b]/40">Versículos para estudo</span>
                </div>
                <div className="grid gap-2">
                    {verses.map((v, i) => (
                        <div key={i} className="flex items-start gap-3 px-3 py-2 rounded-lg bg-white/60 border border-[#1e1b4b]/[0.04]">
                            <span className="font-bold text-[#1e1b4b] whitespace-nowrap text-xs mt-0.5 bg-[#1e1b4b]/[0.05] px-2 py-0.5 rounded">{v.reference}</span>
                            <span className="text-[#1e1b4b]/60 text-xs leading-relaxed">{v.relevance}</span>
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    };

    const renderKeyTerms = (terms: KeyTerm[]) => {
        if (!terms.length) return null;
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#d4af37]/[0.03] to-[#d4af37]/[0.07] border border-[#d4af37]/[0.1]"
            >
                <div className="flex items-center gap-1.5 mb-3">
                    <Languages className="h-3.5 w-3.5 text-[#d4af37]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e1b4b]/40">Termos no original</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    {terms.map((t, i) => (
                        <div key={i} className="flex flex-col gap-1 px-3 py-2.5 rounded-lg bg-white/70 border border-[#d4af37]/10 shadow-sm">
                            <div className="flex items-baseline gap-2">
                                <span className="text-lg font-serif text-[#1e1b4b] font-bold tracking-wide">{t.original}</span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#d4af37]/80 bg-[#d4af37]/10 px-1.5 py-0.5 rounded">{t.language}</span>
                            </div>
                            <div className="text-xs text-[#1e1b4b]/60">
                                <em className="text-[#1e1b4b]/80 font-medium">{t.transliteration}</em> — "{t.meaning}"
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
        );
    };

    const renderSuggestedQuestions = (questions: string[]) => {
        if (!questions.length) return null;
        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-4 space-y-1.5"
            >
                <div className="flex items-center gap-1.5 mb-2">
                    <HelpCircle className="h-3 w-3 text-[#1e1b4b]/30" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#1e1b4b]/30">Aprofunde o estudo</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {questions.map((q, i) => (
                        <button
                            key={i}
                            onClick={() => handleSend(q)}
                            className="group flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border border-[#1e1b4b]/8 text-[#1e1b4b]/60 bg-white/50 hover:bg-[#1e1b4b] hover:text-[#d4af37] hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            <span className="text-[#d4af37] opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                            {q}
                        </button>
                    ))}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-[#fdfbf7] relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto bg-white/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#1e1b4b]/5">
                    <div className="h-6 w-6 rounded-lg bg-[#1e1b4b] flex items-center justify-center text-[#d4af37]">
                        <BookOpen className="h-3 w-3" />
                    </div>
                    <span className="text-sm font-bold text-[#1e1b4b]">Nicodemos <span className="text-[#d4af37]">IA v2.0</span></span>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {messages.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <div className="pt-20 pb-40 px-4 md:px-0 max-w-3xl mx-auto space-y-8">
                        {messages.map((msg) => (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={msg.id}
                                className={cn(
                                    "flex gap-4 md:gap-6",
                                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                )}
                            >
                                {/* Avatar */}
                                <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm mt-1",
                                    msg.role === 'user'
                                        ? "bg-white text-[#1e1b4b] border border-[#1e1b4b]/10"
                                        : "bg-[#1e1b4b] text-[#d4af37]"
                                )}>
                                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                </div>

                                {/* Content */}
                                <div className={cn(
                                    "flex-1 min-w-0",
                                    msg.role === 'user' ? "text-right" : "text-left"
                                )}>
                                    {/* Cache indicator */}
                                    {msg.fromCache && (
                                        <div className="flex items-center gap-1 mb-1">
                                            <Zap className="h-3 w-3 text-[#d4af37]" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#d4af37]/60">resposta instantânea</span>
                                        </div>
                                    )}

                                    <div className={cn(
                                        msg.role === 'user'
                                            ? "font-medium text-lg text-[#1e1b4b]/80"
                                            : "nicodemos-response"
                                    )}>
                                        {msg.role === 'assistant' ? (
                                            <ReactMarkdown
                                                components={{
                                                    h3: ({ children }) => (
                                                        <h3 className="text-base font-bold text-[#1e1b4b] mt-5 mb-2 pb-1 border-b border-[#d4af37]/20 first:mt-0">
                                                            {children}
                                                        </h3>
                                                    ),
                                                    h4: ({ children }) => (
                                                        <h4 className="text-sm font-bold text-[#1e1b4b]/90 mt-4 mb-1">
                                                            {children}
                                                        </h4>
                                                    ),
                                                    p: ({ children }) => (
                                                        <p className="text-sm text-[#1e1b4b] leading-[1.8] mb-3 last:mb-0">
                                                            {children}
                                                        </p>
                                                    ),
                                                    strong: ({ children }) => (
                                                        <strong className="font-bold text-[#1e1b4b]">{children}</strong>
                                                    ),
                                                    em: ({ children }) => (
                                                        <em className="text-[#6b5b3e] font-medium not-italic">{children}</em>
                                                    ),
                                                    ul: ({ children }) => (
                                                        <ul className="space-y-1.5 my-2 ml-1">{children}</ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                        <ol className="space-y-1.5 my-2 ml-1 list-decimal list-inside">{children}</ol>
                                                    ),
                                                    li: ({ children }) => (
                                                        <li className="text-sm text-[#1e1b4b] leading-relaxed flex items-start gap-2">
                                                            <span className="text-[#d4af37] mt-1 text-xs">●</span>
                                                            <span>{children}</span>
                                                        </li>
                                                    ),
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-2 border-[#d4af37]/40 pl-4 py-1 my-3 bg-[#d4af37]/[0.03] rounded-r-lg">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                }}
                                            >
                                                {msg.content}
                                            </ReactMarkdown>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>

                                    {/* Rich sections */}
                                    {msg.role === 'assistant' && (
                                        <>
                                            {msg.keyTerms && msg.keyTerms.length > 0 && renderKeyTerms(msg.keyTerms)}
                                            {msg.verses && msg.verses.length > 0 && renderVerses(msg.verses)}
                                            {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && renderSuggestedQuestions(msg.suggestedQuestions)}
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        ))}

                        {/* Typing */}
                        <AnimatePresence>
                            {isTyping && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="flex gap-4 md:gap-6"
                                >
                                    <div className="h-8 w-8 rounded-lg bg-[#1e1b4b] flex items-center justify-center shrink-0 animate-pulse mt-1">
                                        <BookOpen className="h-4 w-4 text-[#d4af37]" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold uppercase tracking-wider text-[#1e1b4b]/40">
                                                Consultando as Escrituras...
                                            </span>
                                            <div className="flex gap-1">
                                                <span className="h-1.5 w-1.5 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="h-1.5 w-1.5 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="h-1.5 w-1.5 bg-[#d4af37] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#fdfbf7] via-[#fdfbf7] to-transparent pt-20">
                <div className="max-w-3xl mx-auto">
                    <div className="relative flex items-end gap-2 bg-white p-2 pl-4 rounded-[2rem] shadow-xl shadow-[#1e1b4b]/5 border border-[#1e1b4b]/10 focus-within:border-[#d4af37]/50 focus-within:ring-4 focus-within:ring-[#d4af37]/5 transition-all duration-300">
                        <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Faça uma pergunta teológica..."
                            className="w-full bg-transparent border-none focus:ring-0 text-base p-3 min-h-[50px] max-h-[200px] resize-none text-[#1e1b4b] placeholder:text-[#1e1b4b]/30 custom-scrollbar"
                            rows={1}
                            style={{ height: '52px' }}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!inputValue.trim() || isTyping}
                            className="h-10 w-10 flex items-center justify-center rounded-full bg-[#1e1b4b] text-[#d4af37] hover:bg-[#2d2a5d] disabled:opacity-50 disabled:cursor-not-allowed transition-all mb-1.5 mr-1"
                        >
                            {isTyping ? (
                                <div className="h-4 w-4 border-2 border-[#d4af37] border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Send className="h-5 w-5 ml-0.5" />
                            )}
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-[#1e1b4b]/30 mt-4 font-semibold tracking-wide">
                        Nicodemos IA pode cometer erros. Verifique sempre as Escrituras.
                    </p>
                </div>
            </div>
        </div>
    );
}
