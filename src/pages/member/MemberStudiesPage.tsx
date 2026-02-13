import { MemberLayout } from "@/components/layout/MemberLayout";
import { useState, useEffect } from 'react';
import { BibleNavigation } from '@/components/bible/BibleNavigation';
import { BibleReader } from '@/components/bible/BibleReader';
import { BibleToolbar } from '@/components/bible/BibleToolbar';
import { BibleChapter, BibleVersion, getChapter } from '@/data/bible/bible-types';
import { StudyLayout } from '@/components/bible/layout/StudyLayout';
import { AIChatPage } from '@/pages/study/AIChatPage';




type StudyView = 'home' | 'bible' | 'chat' | 'plans';

export function MemberStudiesPage() {
    // View State
    const [currentView, setCurrentView] = useState<StudyView>('home');

    // Bible State
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [currentBookId, setCurrentBookId] = useState('gn');
    const [currentChapter, setCurrentChapter] = useState(1);
    const [currentVersion, setCurrentVersion] = useState<BibleVersion>('NVI');
    const [chapterContent, setChapterContent] = useState<BibleChapter | undefined>(undefined);
    const [isLoading, setLoading] = useState(false);

    // User preferences
    const [fontSize, setFontSize] = useState(18);
    const [isPulpitMode, setPulpitMode] = useState(false);

    useEffect(() => {
        loadChapter(currentBookId, currentChapter, currentVersion);
    }, [currentBookId, currentChapter, currentVersion]);

    const loadChapter = async (bookId: string, chapter: number, version: BibleVersion) => {
        setLoading(true);
        setTimeout(() => {
            const data = getChapter(bookId, chapter, version);
            if (data) {
                setChapterContent(data);
            } else {
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

    const renderBibleContent = () => (
        <div className="flex flex-col h-full w-full relative">
            {/* Bible Sidebar - Sheet style on mobile */}
            {!isPulpitMode && isSidebarOpen && (
                <div className="absolute inset-0 z-30 bg-white md:relative md:w-72 md:shrink-0">
                    <BibleNavigation
                        currentBookId={currentBookId}
                        currentChapter={currentChapter}
                        onSelectBook={(bookId) => {
                            handleSelectBook(bookId);
                            setSidebarOpen(false);
                        }}
                        onSelectChapter={(ch) => {
                            setCurrentChapter(ch);
                            setSidebarOpen(false);
                        }}
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
                        <div className="text-center py-8 text-[#1e1b4b]/30 text-[10px] font-bold uppercase tracking-widest pb-24">
                            <p>Versão: Almeida Corrigida Fiel (ACF)</p>
                            <p className="mt-1">© 2026 ChurchFlow - Módulo Bíblia</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <MemberLayout>
            <div className="h-full flex flex-col overflow-hidden">
                <StudyLayout currentView={currentView} onViewChange={(view: StudyView) => setCurrentView(view)}>
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
            </div>
        </MemberLayout>
    );
}
