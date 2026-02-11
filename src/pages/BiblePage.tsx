import { useState, useEffect } from 'react';
import { BibleNavigation } from '@/components/bible/BibleNavigation';
import { BibleReader } from '@/components/bible/BibleReader';
import { BibleToolbar } from '@/components/bible/BibleToolbar';
import { BibleChapter, BibleVersion, getChapter } from '@/data/bible/bible-types';
import { StudyLayout } from '@/components/bible/layout/StudyLayout';
import { AIChatPage } from '@/pages/study/AIChatPage';

type StudyView = 'home' | 'bible' | 'chat' | 'plans';

export function BiblePage() {
    // View State - persisted via URL hash
    const [currentView, setCurrentView] = useState<StudyView>(() => {
        const hash = window.location.hash.replace('#', '') as StudyView;
        if (['home', 'bible', 'chat', 'plans'].includes(hash)) return hash;
        return 'home';
    });

    // Sync view to URL hash
    useEffect(() => {
        window.location.hash = currentView;
    }, [currentView]);

    // Bible State
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [currentBookId, setCurrentBookId] = useState('gn');
    const [currentChapter, setCurrentChapter] = useState(1);
    const [currentVersion, setCurrentVersion] = useState<BibleVersion>('NVI');
    const [chapterContent, setChapterContent] = useState<BibleChapter | undefined>(undefined);
    const [isLoading, setLoading] = useState(false);

    // User preferences
    const [fontSize, setFontSize] = useState(20);
    const [isPulpitMode, setPulpitMode] = useState(false);

    useEffect(() => {
        loadChapter(currentBookId, currentChapter, currentVersion);
    }, [currentBookId, currentChapter, currentVersion]);

    const loadChapter = async (bookId: string, chapter: number, version: BibleVersion) => {
        setLoading(true);
        // Small delay for smooth transition
        setTimeout(() => {
            const data = getChapter(bookId, chapter, version);
            if (data) {
                setChapterContent(data);
            } else {
                // Fallback for missing data
                setChapterContent({
                    bookId,
                    chapter,
                    verses: [
                        { number: 1, text: "Capítulo não encontrado. Verifique se os dados da Bíblia estão carregados corretamente." }
                    ]
                });
            }
            setLoading(false);
        }, 150);
    };

    const handleSelectBook = (bookId: string) => {
        setCurrentBookId(bookId);
        setCurrentChapter(1);
    };

    // Render Logic for the Bible Tab specifically
    const renderBibleContent = () => (
        <div className="flex h-full w-full relative">
            {/* Bible Sidebar */}
            {!isPulpitMode && (
                <div className={`transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isSidebarOpen ? 'w-72' : 'w-0 opacity-0'} shrink-0 h-full relative z-20`}>
                    <BibleNavigation
                        currentBookId={currentBookId}
                        currentChapter={currentChapter}
                        onSelectBook={handleSelectBook}
                        onSelectChapter={setCurrentChapter}
                        isOpen={isSidebarOpen}
                    />
                </div>
            )}

            {/* Bible Main Area */}
            <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
                <BibleToolbar
                    onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                    isSidebarOpen={isSidebarOpen}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    isPulpitMode={isPulpitMode}
                    setPulpitMode={setPulpitMode}
                    currentVersion={currentVersion}
                    onVersionChange={setCurrentVersion}
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#fdfbf7]">
                    <BibleReader
                        chapterContent={chapterContent}
                        fontSize={fontSize}
                        isPulpitMode={isPulpitMode}
                        isLoading={isLoading}
                    />

                    {!isPulpitMode && (
                        <div className="text-center py-8 text-[#1e1b4b]/30 text-[10px] font-bold uppercase tracking-widest pb-12">
                            <p>Versão: Almeida Corrigida Fiel (ACF)</p>
                            <p className="mt-1">© 2026 ChurchFlow - Módulo Bíblia</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <StudyLayout currentView={currentView} onViewChange={(view: StudyView) => {
            setCurrentView(view);
            window.location.hash = view;
        }}>
            {currentView === 'bible' && renderBibleContent()}
            {currentView === 'chat' && <AIChatPage />}
            {currentView === 'plans' && (
                <div className="flex flex-col items-center justify-center h-full text-[#1e1b4b]/40 font-bold gap-4">
                    <div className="h-16 w-16 bg-[#1e1b4b]/5 rounded-2xl flex items-center justify-center">
                        <span className="text-3xl">📅</span>
                    </div>
                    <p>Módulo de Planos em Desenvolvimento...</p>
                </div>
            )}
        </StudyLayout>
    );
}
