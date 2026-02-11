import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './Sidebar';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UsersRound, Home, Calendar, User, BookOpen } from 'lucide-react';

interface MemberLayoutProps {
    children: ReactNode;
}

export function MemberLayout({ children }: MemberLayoutProps) {
    const location = useLocation();

    // Mobile Nav Items (kept for mobile view only)
    const mobileNavItems = [
        { name: 'Início', href: '/membro', icon: Home },
        { name: 'Grupos', href: '/grupos', icon: UsersRound },
        { name: 'Estudos', href: '/membro/estudos', icon: BookOpen, isAction: true },
        { name: 'Agenda', href: '/membro/agenda', icon: Calendar },
        { name: 'Perfil', href: '/membro/perfil', icon: User },
    ];


    return (
        <div className="h-[100dvh] w-screen bg-[#fdfbf7] text-slate-800 font-sans selection:bg-[#d4af37]/30 selection:text-[#d4af37] overflow-hidden flex fixed inset-0">
            {/* Unified Premium Sidebar (Hidden on Mobile) */}
            <div className="hidden md:flex flex-none w-20">
                <Sidebar />
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">

                {/* Desktop Header (TopNav) - Matches DashboardLayout */}
                <header className="hidden md:flex flex-none h-16 px-4 z-40 bg-white/80 backdrop-blur-md border-b border-[#1e1b4b]/5 items-center">
                    <div className="w-full h-full">
                        <TopNav />
                    </div>
                </header>

                {/* Mobile Header (Visible only on mobile) */}
                <header className="md:hidden h-14 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 shrink-0 z-50 sticky top-0 shadow-sm">
                    <Link to="/membro" className="flex items-center gap-2">
                        <img src="/churchflow-logo.png" alt="Logo" className="h-8 w-auto object-contain" />
                        <span className="font-display font-bold text-[#1e1b4b] italic text-lg">Church<span className="text-[#d4af37]">Flow</span></span>
                    </Link>
                    <button className="text-slate-600">
                        <UsersRound className="h-6 w-6" />
                    </button>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <div className="h-full page-entrance pb-20 md:pb-0">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden flex items-center justify-around bg-white border-t border-slate-100 h-16 shrink-0 px-2 safe-area-bottom fixed bottom-0 w-full z-50">
                    {mobileNavItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center w-14 h-full gap-1 relative",
                                    isActive ? "text-[#1e1b4b]" : "text-slate-400"
                                )}
                            >
                                {item.isAction ? (
                                    <div className="absolute -top-6 bg-[#1e1b4b] text-[#d4af37] p-3 rounded-full shadow-xl border-4 border-[#fdfbf7] active:scale-95 transition-transform">
                                        <item.icon className="h-6 w-6" strokeWidth={2} />
                                    </div>
                                ) : (
                                    <>
                                        <item.icon className={cn("h-5 w-5", isActive ? "fill-current" : "")} strokeWidth={1.5} />
                                        <span className="text-[9px] font-bold mt-1">{item.name}</span>
                                    </>
                                )}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    );
}

