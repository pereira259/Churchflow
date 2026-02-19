import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  UsersRound,
  Calendar,
  CalendarRange,
  DollarSign,
  Bell,
  MessageSquare,
  Sparkles,
  LogOut,
  Newspaper,
  Briefcase,
  Menu,
  Search,
  Book
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, UserRole } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { NotificationBadge, NotificationsPopover, MessagesPopover } from './TopNavComponents';

// --- Types & Data ---

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: UserRole[];
}

interface NavGroup {
  id: string;
  name: string;
  icon: any;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    id: 'hub',
    name: 'Central',
    icon: Newspaper,
    items: [
      { name: 'Jornal', href: '/membro', icon: Newspaper, roles: ['admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro', 'membro', 'visitante'] },
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'pastor_chefe'] },
      { name: 'Estudo', href: '/biblia', icon: Book, roles: ['admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro', 'membro', 'visitante'] },
    ]
  },
  {
    id: 'people',
    name: 'Relacionamento',
    icon: Users,
    items: [
      { name: 'Membros', href: '/membros', icon: Users, roles: ['admin', 'pastor_chefe', 'pastor_lider'] },
      { name: 'Visitantes', href: '/visitantes', icon: UserPlus, roles: ['admin', 'pastor_chefe', 'pastor_lider'] },
      { name: 'Grupos', href: '/grupos', icon: UsersRound, roles: ['admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro', 'membro', 'visitante'] },
    ]
  },
  {
    id: 'ops',
    name: 'Gestão',
    icon: Briefcase,
    items: [
      { name: 'Ministérios', href: '/ministerios', icon: Briefcase, roles: ['admin', 'pastor_chefe', 'pastor_lider', 'lider'] },
      { name: 'Eventos', href: '/eventos', icon: CalendarRange, roles: ['admin', 'pastor_chefe', 'pastor_lider'] },
      { name: 'Agenda do Reino', href: '/membro/agenda', icon: Calendar, roles: ['admin', 'pastor_chefe', 'pastor_lider', 'lider', 'financeiro', 'membro', 'visitante'] },
    ]
  },
  {
    id: 'finance',
    name: 'Recursos',
    icon: DollarSign,
    items: [
      { name: 'Financeiro', href: '/financeiro', icon: DollarSign, roles: ['admin', 'pastor_chefe', 'financeiro'] },
    ]
  }
];

// --- Sidebar Component (Premium Icon + Flyout) ---

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);

  // Helper: Extrai iniciais inteligentes
  const getInitials = (name?: string) => {
    if (!name || name === 'U') return '?'; // Fallback melhor
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const currentRole = profile?.role || 'membro';

  // Filter groups - Mostra itens baseado no cargo e conexão com igreja
  const filteredGroups = navigationGroups.map(group => ({
    ...group,
    items: group.items
      .filter(item => {
        // PERMISSÃO POR CARGO
        const effectiveRole = (currentRole as UserRole) || 'membro';
        if (effectiveRole !== 'super_admin' && !item.roles.includes(effectiveRole)) return false;

        // ITENS QUE SEMPRE APARECEM (independente de igreja)
        const alwaysVisible = ['/membro', '/perfil', '/biblia', '/grupos', '/membro/agenda'];
        if (alwaysVisible.includes(item.href)) return true;

        // ITENS QUE REQUEREM IGREJA
        const requiresChurch = ['/eventos', '/membros', '/visitantes', '/ministerios', '/financeiro', '/membro/agenda', '/membro/checkin'];

        // Se profile ainda não carregou, não esconde nada (espera carregar)
        if (!profile) return true;

        // Se o item requer igreja e o usuário não tem church_id, esconde (exceto admin)
        if (requiresChurch.includes(item.href) && !profile.church_id && effectiveRole !== 'admin') {
          return false;
        }

        return true;
      })
  })).filter(group => group.items.length > 0);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // DEFINITIVE FIX: Force close flyout on route change
  const mouseX = useMotionValue(Infinity);

  useEffect(() => {
    setHoveredGroup(null);
  }, [location.pathname]);

  return (
    <aside
      className="h-full w-full flex flex-col items-center py-4 transition-all duration-500 bg-cream-50 border-r border-[#1e1b4b]/5 z-50"
      onMouseMove={(e) => mouseX.set(e.clientY)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      <div className="flex flex-col items-center h-full w-[calc(100%-0.75rem)] rounded-[2rem] relative group">

        {/* Logo Section */}
        <Link
          id="sidebar-logo"
          to="/membro"
          className="my-4 relative group/logo"
        >
          <div className="h-10 w-10 flex items-center justify-center transition-all duration-500 group-hover/logo:scale-110">
            <img src="/churchflow-logo.png" alt="ChurchFlow Logo" className="h-full w-full object-contain" />
          </div>
        </Link>

        {/* Navigation Groups */}
        <nav className="flex-1 flex flex-col gap-4 px-1.5 mt-4">
          {filteredGroups.map((group) => {
            const isGroupActive = group.items.some(item => {
              // Exact match first
              if (location.pathname === item.href) return true;
              // For /membro specifically, only match exact path (not /membro/agenda, etc.)
              if (item.href === '/membro') return location.pathname === '/membro';
              // For other routes, allow startsWith matching
              return item.href !== '/' && location.pathname.startsWith(item.href + '/');
            });

            return (
              <div
                key={group.id}
                id={`nav-group-${group.id}`}
                data-testid={`nav-group-${group.id}`}
                className="relative group/nav"
                onMouseEnter={() => setHoveredGroup(group.id)}
                onMouseLeave={() => setHoveredGroup(null)}
              >
                {/* Main Group Link with Cycling Logic */}
                <DockIcon
                  mouseX={mouseX}
                  isActive={isGroupActive}
                  icon={group.icon}
                  onClick={() => {
                    const currentIndex = group.items.findIndex(item =>
                      location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
                    );
                    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % group.items.length;
                    navigate(group.items[nextIndex].href);
                  }}
                />

                {/* Flyout Menu (The "Impeccable Design" part) */}
                <AnimatePresence>
                  {hoveredGroup === group.id && (
                    <motion.div
                      initial={{ opacity: 0, x: 10, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 5, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-full top-0 ml-4 py-2 px-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-[#1e1b4b]/5 min-w-[180px] z-[100]"
                    >
                      <div className="px-3 py-2 border-b border-[#1e1b4b]/5 mb-1.5 flex items-center justify-between">
                        <p className="text-[9px] font-black text-[#1e1b4b]/40 uppercase tracking-[0.2em]">{group.name}</p>
                        <Sparkles className="h-3 w-3 text-[#d4af37] opacity-50" />
                      </div>
                      <div className="flex flex-col gap-1">
                        {group.items.map((item) => {
                          const isItemActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href + '/'));
                          return (
                            <Link
                              key={item.name}
                              to={item.href}
                              id={`nav-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                              data-testid={`nav-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group/link",
                                isItemActive
                                  ? "bg-[#1e1b4b]/5 text-[#1e1b4b]"
                                  : "text-[#1e1b4b]/50 hover:bg-[#fdfbf7] hover:text-[#1e1b4b]"
                              )}
                            >
                              <item.icon className={cn("h-4 w-4 transition-colors", isItemActive ? "text-[#1e1b4b]" : "text-[#1e1b4b]/30 group-hover/link:text-[#1e1b4b]/60")} />
                              <span className="text-[11px] font-display font-bold italic tracking-tight">{item.name}</span>
                              {isItemActive && (
                                <motion.div
                                  layoutId="active-dot"
                                  className="ml-auto w-1.5 h-1.5 rounded-full bg-[#d4af37]"
                                />
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* User Footer (Compact) */}
        <div id="user-profile-btn" className="mt-auto mb-4 relative group/user">
          <button className="h-10 w-10 rounded-full bg-[#1e1b4b] flex items-center justify-center text-[#d4af37] font-display font-bold text-xs shadow-lg border border-white/10 hover:scale-105 transition-transform overflow-hidden" onClick={() => navigate('/perfil')}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : (
              getInitials(profile?.full_name)
            )}
          </button>
          {/* Simple User Tooltip */}
          <div className="absolute left-full bottom-0 ml-3 px-4 py-3 bg-[#1e1b4b] text-white rounded-xl opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible translate-x-[-3px] group-hover/user:translate-x-0 transition-all duration-200 shadow-2xl whitespace-nowrap z-50 border border-[#d4af37]/20">
            <p className="text-xs font-bold text-[#d4af37]">{profile?.full_name}</p>
            <p className="text-[9px] opacity-70 uppercase tracking-wider font-bold mb-2">{profile?.role}</p>
            <div className="pt-2 border-t border-white/10 flex items-center gap-2 cursor-pointer hover:text-red-300 transition-colors" onClick={handleLogout}>
              <LogOut className="h-3 w-3" /> <span className="text-[9px] uppercase font-bold tracking-widest">Desconectar</span>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}

// --- TopNav Component (Preserved) ---

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activePopover, setActivePopover] = useState<'messages' | 'notifications' | null>(null);

  // Close popovers on click outside (simplified)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.header-action-btn')) return;
      if ((event.target as HTMLElement).closest('.header-popover')) return;
      setActivePopover(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper: Extrai iniciais inteligentes (primeira letra do 1º e 2º nome)
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Visão Geral';
    if (path.includes('/biblia')) return 'ChurchFlow';
    if (path.includes('/membros')) return 'ChurchFlow';
    if (path.includes('/financeiro')) return 'ChurchFlow';
    if (path.includes('/eventos')) return 'ChurchFlow';
    if (path.includes('/ministerios')) return 'ChurchFlow';
    if (path.includes('/escalas')) return 'ChurchFlow';

    if (path.includes('/perfil')) return 'ChurchFlow';
    if (path === '/membro') return 'ChurchFlow';

    return 'ChurchFlow';
  };

  const displayTitle = getPageTitle(location.pathname);

  return (
    <div className="flex items-center justify-between w-full h-full">
      {/* Left: Breadcrumb/Title */}
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 text-[#1e1b4b]/50 hover:bg-[#1e1b4b]/5 rounded-lg">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex flex-col">
          <h1 className="font-display font-bold text-xl text-[#1e1b4b] italic leading-none">{displayTitle}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#1e1b4b]/30">Igreja Conectada</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">

        <div className="h-8 w-px bg-[#1e1b4b]/5 hidden md:block" />

        {/* Search (Active) */}
        <div className="relative hidden md:block group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#1e1b4b]/30 group-hover:text-[#1e1b4b]/50 transition-colors" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-1.5 rounded-xl bg-white border border-[#1e1b4b]/5 text-xs font-semibold text-[#1e1b4b] focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 shadow-sm w-64 placeholder:text-[#1e1b4b]/30 transition-all hover:bg-white/80"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                if (target.value.trim()) {
                  // Basic feedback for now, in a real app this would filter or redirect
                  alert(`Buscando por: ${target.value} (Funcionalidade em desenvolvimento)`);
                  target.value = '';
                }
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2 border-r border-[#1e1b4b]/5 pr-4 mr-1 relative">

          {/* Messages Button */}
          <button
            onClick={() => setActivePopover(activePopover === 'messages' ? null : 'messages')}
            className={cn(
              "header-action-btn h-9 w-9 flex items-center justify-center rounded-xl border transition-all shadow-sm relative group",
              activePopover === 'messages'
                ? "bg-[#1e1b4b] text-[#d4af37] border-[#1e1b4b] scale-105"
                : "bg-white border-[#1e1b4b]/5 text-[#1e1b4b]/40 hover:bg-[#1e1b4b]/5 hover:text-[#1e1b4b] hover:scale-105"
            )}
          >
            <MessageSquare className="h-4 w-4" />
          </button>

          {/* Messages Popover */}
          <AnimatePresence>
            {activePopover === 'messages' && (
              <MessagesPopover
                onClose={() => setActivePopover(null)}
                currentUserId={profile?.id}
                churchId={profile?.church_id}
              />
            )}
          </AnimatePresence>

          {/* Notifications Button */}
          <button
            onClick={() => setActivePopover(activePopover === 'notifications' ? null : 'notifications')}
            className={cn(
              "header-action-btn h-9 w-9 flex items-center justify-center rounded-xl border transition-all shadow-sm relative group",
              activePopover === 'notifications'
                ? "bg-[#1e1b4b] text-[#d4af37] border-[#1e1b4b] scale-105"
                : "bg-white border-[#1e1b4b]/5 text-[#1e1b4b]/40 hover:text-[#1e1b4b] hover:bg-[#1e1b4b]/5 hover:scale-105"
            )}
          >
            <Bell className="h-4 w-4" />
            <NotificationBadge />
          </button>

          {/* Notifications Popover */}
          <AnimatePresence>
            {activePopover === 'notifications' && (
              <NotificationsPopover onClose={() => setActivePopover(null)} />
            )}
          </AnimatePresence>

        </div>

        <div
          className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => navigate('/perfil')}
        >
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-[#1e1b4b]">{profile?.full_name}</p>
            <p className="text-[9px] font-black text-[#1e1b4b]/40 uppercase tracking-wider">{profile?.role}</p>
          </div>
          <div className="h-9 w-9 rounded-full bg-[#1e1b4b] flex items-center justify-center text-[#d4af37] font-display font-bold text-xs shadow-md border-2 border-white ring-1 ring-[#1e1b4b]/5 overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : (
              getInitials(profile?.full_name)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DockIcon({ mouseX, isActive, icon: Icon, onClick }: { mouseX: any, isActive: boolean, icon: any, onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { y: 0, height: 0 };
    return val - bounds.y - bounds.height / 2;
  });

  const widthSync = useTransform(distance, [-100, 0, 100], [48, 60, 48]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <motion.button
      ref={ref}
      style={{ width, height: width }}
      onClick={onClick}
      className={cn(
        'group relative flex items-center justify-center rounded-2xl transition-colors duration-300 aspect-square',
        isActive
          ? "bg-[#1e1b4b] text-white shadow-xl shadow-[#1e1b4b]/20"
          : "text-[#1e1b4b]/30 hover:bg-white hover:text-[#1e1b4b] hover:shadow-lg"
      )}
    >
      <Icon className={cn("transition-transform duration-300 h-5 w-5", isActive ? "text-[#d4af37] scale-110" : "group-hover:scale-110")} strokeWidth={isActive ? 2.5 : 2} />
    </motion.button>
  );
}
