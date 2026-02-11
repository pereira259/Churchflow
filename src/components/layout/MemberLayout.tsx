import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './Sidebar';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { UsersRound, Home, Calendar, QrCode, User } from 'lucide-react';

interface MemberLayoutProps {
    children: ReactNode;
}

export function MemberLayout({ children }: MemberLayoutProps) {
    const location = useLocation();

    // Mobile Nav Items (kept for mobile view only)
    const mobileNavItems = [
        { name: 'Início', href: '/membro', icon: Home },
        { name: 'Grupos', href: '/grupos', icon: UsersRound },
        { name: 'Agenda', href: '/membro/agenda', icon: Calendar },
        { name: 'Check-in', href: '/membro/checkin', icon: QrCode, isAction: true },
        { name: 'Perfil', href: '/membro/perfil', icon: User },
    ];


    return (
        <div className="h-screen w-screen bg-[#fdfbf7] text-slate-800 font-sans selection:bg-[#d4af37]/30 selection:text-[#d4af37] overflow-hidden flex">
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
                <header className="md:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0">
                    <Link to="/membro" className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
                        <span className="font-display font-bold text-[#1e1b4b] italic">Church<span className="text-[#d4af37]">Flow</span></span>
                    </Link>
                    <button className="text-slate-600">
                        <UsersRound className="h-6 w-6" />
                    </button>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <div className="h-full page-entrance">
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Nav */}
                <nav className="md:hidden flex items-center justify-around bg-white border-t border-slate-100 h-16 shrink-0 px-2 safe-area-bottom">
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
                                    <div className="absolute -top-6 bg-[#1e1b4b] text-[#d4af37] p-2 rounded-full shadow-lg border-4 border-[#fdfbf7]">
                                        <item.icon className="h-6 w-6" strokeWidth={1.5} />
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

