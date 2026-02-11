import { ReactNode } from 'react';
import { Sidebar, TopNav } from './Sidebar';

interface DashboardLayoutProps {
    children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    return (
        <div className="h-screen w-screen overflow-hidden bg-cream-50 flex selection:bg-marinho/10 selection:text-marinho">
            {/* Sidebar: Fixed width, no shrink, more compact */}
            <div className="flex-none w-20">
                <Sidebar />
            </div>

            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header Area: Height adjusted to 64px (h-16) */}
                <header className="flex-none h-16 px-4 z-40 bg-cream-50/80 backdrop-blur-md border-b border-marinho/5">
                    <div className="max-w-screen-2xl mx-auto h-full flex items-center">
                        <TopNav />
                    </div>
                </header>

                {/* Content Area: Integrated height control */}
                <main className="flex-1 min-h-0 relative">
                    <div className="h-full page-entrance">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
