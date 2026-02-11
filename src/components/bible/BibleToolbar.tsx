import { PanelLeftClose, PanelLeftOpen, Plus, Minus, MonitorPlay, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BibleVersion, BIBLE_VERSIONS } from '@/data/bible/bible-types';

interface BibleToolbarProps {
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
    fontSize: number;
    setFontSize: (size: number) => void;
    isPulpitMode: boolean;
    setPulpitMode: (mode: boolean) => void;
    currentVersion: BibleVersion;
    onVersionChange: (version: BibleVersion) => void;
}

export function BibleToolbar({
    onToggleSidebar,
    isSidebarOpen,
    fontSize,
    setFontSize,
    isPulpitMode,
    setPulpitMode,
    currentVersion,
    onVersionChange
}: BibleToolbarProps) {
    const [isVersionMenuOpen, setVersionMenuOpen] = useState(false);

    const versionInfo = BIBLE_VERSIONS.find(v => v.id === currentVersion) || BIBLE_VERSIONS[0];

    if (isPulpitMode) {
        return (
            <div className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md z-[100] hover:bg-black/80 transition-all opacity-0 hover:opacity-100 group">
                <span className="text-white/50 text-xs font-bold uppercase tracking-widest">Modo Púlpito Ativo</span>
                <button
                    onClick={() => setPulpitMode(false)}
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-200 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                >
                    Sair do Modo Púlpito
                </button>
            </div>
        );
    }

    return (
        <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-marinho/5 shrink-0 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-4">
                {/* Toggle Sidebar */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2.5 text-marinho/50 hover:text-marinho hover:bg-marinho/5 rounded-xl transition-colors"
                    title={isSidebarOpen ? "Fechar Menu" : "Abrir Menu"}
                >
                    {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                </button>

                <div className="h-6 w-px bg-marinho/10" />

                {/* Title */}
                <h2 className="font-display text-xl font-bold text-marinho italic flex items-center gap-2">
                    ChurchFlow <span className="text-gold">Bíblia</span>
                </h2>
            </div>

            <div className="flex items-center gap-3">
                {/* Version Selector */}
                <div className="relative">
                    <button
                        onClick={() => setVersionMenuOpen(!isVersionMenuOpen)}
                        className="flex items-center gap-2 px-4 py-2 bg-cream-50 hover:bg-marinho/5 rounded-xl border border-marinho/10 transition-all"
                    >
                        <span className="text-sm font-bold text-marinho">{versionInfo.name}</span>
                        <ChevronDown className={cn(
                            "h-4 w-4 text-marinho/40 transition-transform",
                            isVersionMenuOpen && "rotate-180"
                        )} />
                    </button>

                    {isVersionMenuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setVersionMenuOpen(false)}
                            />
                            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-marinho/10 overflow-hidden z-50">
                                {BIBLE_VERSIONS.filter(v => v.available).map(version => (
                                    <button
                                        key={version.id}
                                        onClick={() => {
                                            onVersionChange(version.id);
                                            setVersionMenuOpen(false);
                                        }}
                                        className={cn(
                                            "w-full px-4 py-3 text-left transition-all flex items-center justify-between",
                                            currentVersion === version.id
                                                ? "bg-marinho text-white"
                                                : "hover:bg-cream-50 text-marinho"
                                        )}
                                    >
                                        <div>
                                            <span className="font-bold">{version.name}</span>
                                            <span className="text-xs opacity-60 ml-2">{version.fullName}</span>
                                        </div>
                                        {currentVersion === version.id && (
                                            <span className="text-gold">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Font Size Control */}
                <div className="flex items-center bg-cream-50 rounded-xl p-1 border border-marinho/5">
                    <button
                        onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                        className="p-2 text-marinho/40 hover:text-marinho hover:bg-white rounded-lg transition-colors"
                        title="Diminuir fonte"
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-marinho/70 w-12 text-center">{fontSize}px</span>
                    <button
                        onClick={() => setFontSize(Math.min(48, fontSize + 2))}
                        className="p-2 text-marinho/40 hover:text-marinho hover:bg-white rounded-lg transition-colors"
                        title="Aumentar fonte"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>

                {/* Pulpit Mode */}
                <button
                    onClick={() => setPulpitMode(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all bg-marinho text-white shadow-lg shadow-marinho/20 hover:shadow-xl hover:-translate-y-0.5"
                >
                    <MonitorPlay className="h-3.5 w-3.5 text-gold" />
                    Modo Púlpito
                </button>
            </div>
        </div>
    );
}
