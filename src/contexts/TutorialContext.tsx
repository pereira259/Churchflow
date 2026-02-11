import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocation } from 'react-router-dom';
import { WelcomePortal } from '@/components/onboarding/WelcomePortal';
import { AnimatePresence, motion } from 'framer-motion';

// --- Types ---
interface ShowcaseStep {
    target: string; // CSS Selector
    title: string;
    description: string;
    action?: 'click' | 'wait' | 'read';
    duration?: number;
    showCursor?: boolean; // New: Control cursor visibility
    highlight?: boolean; // New: Pop element over overlay
    placement?: 'top' | 'bottom' | 'left' | 'right'; // New: Manual positioning
}

interface TutorialContextType {
    startShowcase: (steps: ShowcaseStep[], force?: boolean) => void;
    resetTutorials: () => void;
    welcomePortalOpen: boolean;
    closeWelcomePortal: () => void;
    startOnboarding: () => void;
    isPlaying: boolean;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const { profile, loading } = useAuth();
    const location = useLocation();

    // State
    const [welcomePortalOpen, setWelcomePortalOpen] = useState(false);
    const [activeIntro, _setActiveIntro] = useState<any | null>(null); // PageIntroConfig removed for MVP
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [showcaseSteps, setShowcaseSteps] = useState<ShowcaseStep[]>([]);

    // Cursor State
    const [cursor, setCursor] = useState({ x: -100, y: -100, active: false, clicking: false });
    const [bubble, setBubble] = useState<{ title: string; description: string; x: number; y: number; visible: boolean; placement?: string }>({
        title: '', description: '', x: 0, y: 0, visible: false
    });

    const _tutorialTriggeredRef = useRef(false);
    const highlightedElementRef = useRef<HTMLElement | null>(null);

    // Helper to clear highlight
    const clearHighlight = () => {
        if (highlightedElementRef.current) {
            highlightedElementRef.current.style.zIndex = '';
            highlightedElementRef.current.style.position = '';
            highlightedElementRef.current.style.backgroundColor = '';
            highlightedElementRef.current.style.boxShadow = '';
            highlightedElementRef.current.classList.remove('tour-highlighted');
            highlightedElementRef.current = null;
        }
    };

    // --- Core Logic: The "Video" Orchestrator ---
    useEffect(() => {
        if (!isPlaying || showcaseSteps.length === 0) return;

        let timeoutId: NodeJS.Timeout;

        const executeStep = async (index: number) => {
            // Clear previous highlight
            clearHighlight();

            if (index >= showcaseSteps.length) {
                // End of Tour
                setTimeout(() => {
                    setIsPlaying(false);
                    setCursor(prev => ({ ...prev, active: false }));
                    setBubble(prev => ({ ...prev, visible: false }));
                }, 1500);
                return;
            }

            const step = showcaseSteps[index];
            const element = document.querySelector(step.target) as HTMLElement;

            if (element) {
                const rect = element.getBoundingClientRect();
                const targetX = rect.left + rect.width / 2;
                const targetY = rect.top + rect.height / 2;

                // 1. Move Cursor OR Just Highlight
                if (step.showCursor) {
                    setCursor(prev => ({ ...prev, active: true, x: targetX, y: targetY, clicking: false }));
                } else {
                    setCursor(prev => ({ ...prev, active: false }));
                }

                // 2. Wait for arrival (simulated) then Show Bubble & Highlight
                timeoutId = setTimeout(() => {
                    // Highlight Logic
                    if (step.highlight) {
                        element.style.position = 'relative';
                        element.style.zIndex = '10000'; // Above overlay
                        // High-End "Jitter" Highlight Style:
                        // 1. Subtle White Glow
                        // 2. Strong Shadow for depth
                        // 3. Slight Scale Up
                        element.style.boxShadow = '0 0 0 4px rgba(255, 255, 255, 0.2), 0 12px 40px -8px rgba(0, 0, 0, 0.6)';
                        element.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)'; // Apple/Framer ease
                        element.style.transform = 'scale(1.03)';
                        element.classList.add('tour-highlighted');
                        highlightedElementRef.current = element;
                    }

                    // Calculate Bubble Position - Refined for "Floating Card" look
                    let bubbleX = 0;
                    let bubbleY = 0;
                    const gap = 24;
                    const bubbleWidth = 340;
                    const bubbleHeight = 180; // Estimated

                    let placement = step.placement;

                    // Smart auto-placement
                    if (!placement) {
                        const spaceRight = window.innerWidth - rect.right;
                        const spaceLeft = rect.left;
                        const spaceBottom = window.innerHeight - rect.bottom;

                        if (spaceRight > bubbleWidth + gap) placement = 'right';
                        else if (spaceLeft > bubbleWidth + gap) placement = 'left';
                        else if (spaceBottom > bubbleHeight + gap) placement = 'bottom';
                        else placement = 'top';
                    }

                    // Positioning with "Center Alignment" preference
                    switch (placement) {
                        case 'right':
                            bubbleX = rect.right + gap;
                            // Align top of bubble with top of element usually looks cleaner for cards, or center
                            bubbleY = rect.top;
                            break;
                        case 'left':
                            bubbleX = rect.left - bubbleWidth - gap;
                            bubbleY = rect.top;
                            break;
                        case 'bottom':
                            // Center visually
                            bubbleX = rect.left + (rect.width / 2) - (bubbleWidth / 2);
                            bubbleY = rect.bottom + gap;
                            break;
                        case 'top':
                            bubbleX = rect.left + (rect.width / 2) - (bubbleWidth / 2);
                            bubbleY = rect.top - bubbleHeight - gap;
                            break;
                    }

                    // Boundary constraint with padding
                    const padding = 20;
                    bubbleX = Math.max(padding, Math.min(bubbleX, window.innerWidth - bubbleWidth - padding));
                    bubbleY = Math.max(padding, Math.min(bubbleY, window.innerHeight - bubbleHeight - padding));

                    // Show bubble
                    setBubble({
                        title: step.title,
                        description: step.description,
                        x: bubbleX,
                        y: bubbleY,
                        visible: true,
                        placement
                    });

                    // Action: Click?
                    if (step.action === 'click') {
                        setCursor(prev => ({ ...prev, clicking: true }));
                        // Perform actual click after visual ripple starts
                        setTimeout(() => {
                            element.click();
                        }, 150);
                        setTimeout(() => setCursor(prev => ({ ...prev, clicking: false })), 300);
                    }

                    // Next Step Timer
                    const readTime = step.duration || 4000;
                    setTimeout(() => {
                        setBubble(prev => ({ ...prev, visible: false })); // Hide bubble before moving
                        setCurrentStepIndex(index + 1);
                    }, readTime);

                }, step.showCursor ? 800 : 300); // Faster if no cursor travel needed
            } else {
                console.warn(`Showcase: Element ${step.target} not found. Skipping.`);
                setCurrentStepIndex(index + 1);
            }
        };

        executeStep(currentStepIndex);

        return () => clearTimeout(timeoutId);
    }, [isPlaying, currentStepIndex, showcaseSteps]);


    // --- Public Methods ---
    const startShowcase = (steps: ShowcaseStep[], force: boolean = false) => {
        if (isPlaying && !force) return;
        setShowcaseSteps(steps);
        setCurrentStepIndex(0);
        setIsPlaying(true);
        // Start from center or current mouse pos? Let's start from center
        setCursor({ x: window.innerWidth / 2, y: window.innerHeight / 2, active: true, clicking: false });
    };

    const resetTutorials = () => {
        if (!profile?.id) return;
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(`tutorial_seen_${profile.id}`)) {
                localStorage.removeItem(key);
            }
        });
        window.location.reload();
    };


    const closeWelcomePortal = () => {
        setWelcomePortalOpen(false);
    };

    const startOnboarding = () => {
        setWelcomePortalOpen(false);
        // Stage 1: Go to Central (Jornal)
        localStorage.setItem('tour_pending_jornal', 'true');

        // We first open the "Central" group if it's not open, but Sidebar hover handles that.
        // Direct click on "Jornal" link in sidebar.
        // Since Sidebar might be collapsed or group could be closed, we might need to target the GROUP trigger first?
        // The Sidebar implementation shows groups are "hover to open".
        // Direct link to /membro is inside the 'hub' group.

        // Strategy: If we are already on the page, trigger immediately.
        if (location.pathname === '/membro') {
            // Dispatch event to trigger JornalContent check
            setTimeout(() => {
                window.dispatchEvent(new Event('tour-check-pending'));
            }, 100);
        } else {
            // Guide user to click
            startShowcase([
                {
                    target: '#nav-group-hub',
                    title: 'Acesse o Jornal',
                    description: 'Clique na Central para acessar notícias e eventos.',
                    action: 'click',
                    duration: 3000,
                    showCursor: true, // Only show cursor here
                    highlight: true, // Highlight the button
                    placement: 'right'
                }
            ]);
        }

        if (profile?.id) {
            localStorage.setItem(`tutorial_seen_${profile.id}_welcome_portal`, 'true');
        }
    };

    // --- Initial Check ---
    /*
    useEffect(() => {
        if (loading || !profile || tutorialTriggeredRef.current) return;

        // Example trigger for Welcome Portal
        const hasSeenPortal = localStorage.getItem(`tutorial_seen_${profile.id}_welcome_portal`);
        if (!hasSeenPortal) {
            setWelcomePortalOpen(true);
            localStorage.setItem(`tutorial_seen_${profile.id}_welcome_portal`, 'true');
        }
    }, [loading, profile]);
    */

    // Page Intro Logic (High-Motion Overview)
    useEffect(() => {
        if (loading || !profile) return;

        // PAGE_INTROS removed for MVP - config check disabled
        /*
        if (config && !localStorage.getItem(`tutorial_seen_${profile.id}_intro_${config.id}`)) {
            // Pequeno atraso para a página carregar visualmente
            const timer = setTimeout(() => {
                setActiveIntro(config);
            }, 800);
            return () => clearTimeout(timer);
        }
        */
    }, [location.pathname, profile, loading]);


    return (
        <TutorialContext.Provider value={{
            startShowcase,
            resetTutorials,
            welcomePortalOpen,
            closeWelcomePortal,
            startOnboarding,
            isPlaying
        }}>
            {children}

            {/* Global AnimatePresence for the Tour Overlay */}
            <AnimatePresence>
                {isPlaying && (
                    <>
                        {/* 1. Cinematic Dimmer Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                            className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-[2px] pointer-events-none"
                        />

                        {/* 2. Spotlight Highlight Effect (Renders ON TOP of element) is handled by CSS classes added to element directly */}

                        {/* 3. High-End 'Jitter-Style' Cursor */}
                        {cursor.active && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{
                                    x: cursor.x,
                                    y: cursor.y,
                                    opacity: 1,
                                    scale: cursor.clicking ? 0.9 : 1
                                }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 150,
                                    damping: 20,
                                    mass: 0.8
                                }}
                                style={{ position: 'fixed', top: 0, left: 0, zIndex: 10002, pointerEvents: 'none' }}
                            >
                                <div className="relative">
                                    {/* Mac-style Cursor Body */}
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-xl">
                                        <path d="M5.5 3.5l12 12-5.5 1.5-2.5 5.5-3-1-3-9z" fill="white" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
                                    </svg>

                                    {/* Click Ripple Effect */}
                                    {cursor.clicking && (
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 1 }}
                                            animate={{ scale: 2, opacity: 0 }}
                                            className="absolute top-0 left-0 w-8 h-8 -ml-2 -mt-2 bg-white/50 rounded-full"
                                        />
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* 4. Motion.page Style Info Card - Engineered with "Claude Code" Precision */}
                        {bubble.visible && (
                            <motion.div
                                key="tour-bubble"
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                variants={{
                                    hidden: { opacity: 0, y: 15, scale: 0.95 },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        scale: 1,
                                        transition: {
                                            type: "spring",
                                            stiffness: 350,
                                            damping: 25,
                                            staggerChildren: 0.15 // Cinematic stagger
                                        }
                                    },
                                    exit: {
                                        opacity: 0,
                                        y: -10,
                                        scale: 0.98,
                                        transition: { duration: 0.2 }
                                    }
                                }}
                                style={{
                                    position: 'fixed',
                                    left: bubble.x,
                                    top: bubble.y,
                                    zIndex: 10001,
                                    width: 340,
                                    pointerEvents: 'auto'
                                }}
                                className="flex flex-col perspective-1000"
                            >
                                <div className="bg-[#0f0f11]/95 backdrop-blur-2xl border border-white/10 text-white p-6 rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] relative overflow-hidden group ring-1 ring-white/5">
                                    {/* Ambient Glows - Subtle & Premium */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none mix-blend-screen -mr-16 -mt-16" />
                                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none mix-blend-screen -ml-10 -mb-10" />

                                    {/* Content Container with Z-Index */}
                                    <div className="relative z-10">
                                        {/* Header with Slide-Up Mask Reveal */}
                                        <div className="overflow-hidden mb-3">
                                            <motion.h3
                                                variants={{
                                                    hidden: { y: '100%', opacity: 0 },
                                                    visible: {
                                                        y: 0,
                                                        opacity: 1,
                                                        transition: { type: "spring", stiffness: 400, damping: 30 }
                                                    }
                                                }}
                                                className="text-lg font-bold tracking-tight text-white flex items-center gap-2"
                                            >
                                                {bubble.title}
                                            </motion.h3>
                                        </div>

                                        {/* Body text with fade and slight drift */}
                                        <motion.div
                                            variants={{
                                                hidden: { opacity: 0, y: 5 },
                                                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
                                            }}
                                        >
                                            <p className="text-[14px] text-gray-300 leading-relaxed font-medium">
                                                {bubble.description}
                                            </p>
                                        </motion.div>

                                        {/* Dynamic Progress Indicator */}
                                        <motion.div
                                            className="mt-6 flex items-center gap-1.5"
                                            variants={{
                                                hidden: { opacity: 0 },
                                                visible: { opacity: 1, transition: { delay: 0.3 } }
                                            }}
                                        >
                                            {showcaseSteps.map((_, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={false}
                                                    animate={{
                                                        width: idx === currentStepIndex ? 20 : 6,
                                                        backgroundColor: idx === currentStepIndex ? '#a855f7' : 'rgba(255,255,255,0.15)',
                                                        opacity: idx === currentStepIndex ? 1 : 0.5
                                                    }}
                                                    className="h-1 rounded-full"
                                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                />
                                            ))}
                                        </motion.div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </AnimatePresence>

            {/* Welcome Portal (Separate) */}
            <AnimatePresence>
                {welcomePortalOpen && (
                    <WelcomePortal
                        isOpen={true}
                        onClose={closeWelcomePortal}
                        onStart={startOnboarding}
                        introConfig={activeIntro || {
                            title: 'Bem-vindo',
                            description: 'Explore sua nova plataforma.',
                            steps: []
                        }}
                    />
                )}
            </AnimatePresence>
        </TutorialContext.Provider>
    );
}

export function useTutorial() {
    const context = useContext(TutorialContext);
    if (context === undefined) {
        throw new Error('useTutorial must be used within a TutorialProvider');
    }
    return context;
}
