
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, ChevronLeft, Loader2, Search, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Notification state sync
let globalUnreadCount = 0;
let globalSetUnreadCount: ((count: number) => void) | null = null;

export const NotificationBadge = () => {
    const [count, setCount] = useState(globalUnreadCount);

    useEffect(() => {
        globalSetUnreadCount = setCount;

        // Fetch real unread count on mount
        const fetchCount = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { count: unread } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('read', false);

                const c = unread || 0;
                setCount(c);
                globalUnreadCount = c;
            } catch { /* table may not exist yet */ }
        };

        fetchCount();
        return () => { globalSetUnreadCount = null; };
    }, []);

    if (count <= 0) return null;

    return (
        <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500 border border-white box-content animate-pulse" />
    );
};

interface Notification {
    id: string;
    type: string;
    title: string;
    description: string | null;
    read: boolean;
    created_at: string;
    metadata?: {
        schedule_id?: string;
        event_title?: string;
        action_taken?: 'confirmado' | 'recusado';
        [key: string]: any;
    };
}

const getIcon = (type: string) => {
    switch (type) {
        case 'system': return { icon: '⚙️', bg: 'bg-slate-100', ring: 'ring-slate-200' };
        case 'member': return { icon: '👤', bg: 'bg-blue-50', ring: 'ring-blue-100' };
        case 'event': return { icon: '📅', bg: 'bg-emerald-50', ring: 'ring-emerald-100' };
        case 'finance': return { icon: '💰', bg: 'bg-amber-50', ring: 'ring-amber-100' };
        case 'pastoral': return { icon: '🙏', bg: 'bg-rose-50', ring: 'ring-rose-100' };
        case 'group': return { icon: '👥', bg: 'bg-violet-50', ring: 'ring-violet-100' };
        case 'escala': return { icon: '🎯', bg: 'bg-indigo-50', ring: 'ring-indigo-100' };
        default: return { icon: '🔔', bg: 'bg-gray-100', ring: 'ring-gray-200' };
    }
};

const formatTimeAgo = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const getGroup = (dateStr: string): string => {
    const now = new Date();
    const date = new Date(dateStr);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

    if (date >= today) return 'hoje';
    if (date >= yesterday) return 'ontem';
    if (date >= weekAgo) return 'semana';
    return 'anterior';
};

export const NotificationsPopover = ({ onClose: _onClose }: { onClose: () => void }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setLoading(false); return; }

                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (!error && data) {
                    setNotifications(data as Notification[]);
                    const unread = data.filter((n: any) => !n.read).length;
                    globalUnreadCount = unread;
                    if (globalSetUnreadCount) globalSetUnreadCount(unread);
                }
            } catch { /* table may not exist yet */ }
            setLoading(false);
        };

        fetchNotifications();
    }, []);

    const markAllRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        globalUnreadCount = 0;
        if (globalSetUnreadCount) globalSetUnreadCount(0);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('user_id', user.id)
                    .eq('read', false);
            }
        } catch { /* silent */ }
    };

    const handleScheduleAction = async (notifId: string, scheduleId: string, action: 'confirmado' | 'recusado') => {
        // Optimistic update
        setNotifications(prev => prev.map(n =>
            n.id === notifId
                ? { ...n, read: true, metadata: { ...n.metadata, action_taken: action } }
                : n
        ));

        try {
            // Update schedule status
            await supabase
                .from('schedules')
                .update({ status: action })
                .eq('id', scheduleId);

            // Mark notification as read and store action
            await supabase
                .from('notifications')
                .update({ read: true, metadata: { schedule_id: scheduleId, action_taken: action } })
                .eq('id', notifId);

            // Sync badge
            const newUnread = notifications.filter(n => !n.read && n.id !== notifId).length;
            globalUnreadCount = newUnread;
            if (globalSetUnreadCount) globalSetUnreadCount(newUnread);
        } catch { /* silent */ }
    };

    const groups = [
        { key: 'hoje', label: 'Hoje' },
        { key: 'ontem', label: 'Ontem' },
        { key: 'semana', label: 'Esta Semana' },
        { key: 'anterior', label: 'Anteriores' },
    ];

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="header-popover absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-[#1e1b4b]/5 overflow-hidden z-[100]"
        >
            {/* Header */}
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/80 to-white">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-[#1e1b4b] text-xs">Notificações</h3>
                    {unreadCount > 0 && (
                        <span className="text-[8px] font-black bg-[#d4af37] text-white px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        className="text-[9px] font-bold text-[#d4af37] uppercase tracking-wider hover:underline transition-all"
                        onClick={markAllRead}
                    >
                        Marcar lidas
                    </button>
                )}
            </div>

            {/* Grouped Notifications */}
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-marinho/10">
                {loading ? (
                    <div className="p-8 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-marinho/20" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Tudo limpo por aqui ✨</p>
                    </div>
                ) : (
                    groups.map(group => {
                        const groupNotifs = notifications.filter(n => getGroup(n.created_at) === group.key);
                        if (groupNotifs.length === 0) return null;
                        return (
                            <div key={group.key}>
                                <div className="px-3 py-1.5 bg-cream-50/50 border-b border-marinho/5">
                                    <span className="text-[8px] font-black text-marinho/30 uppercase tracking-[0.2em]">{group.label}</span>
                                </div>
                                {groupNotifs.map((n) => {
                                    const style = getIcon(n.type);
                                    return (
                                        <div key={n.id} className={`p-2.5 border-b border-gray-50 hover:bg-cream-50/50 transition-all cursor-pointer flex gap-2.5 group ${n.read ? 'opacity-50' : ''}`}>
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.bg} ring-1 ${style.ring} text-xs group-hover:scale-105 transition-transform`}>
                                                {style.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className="text-[11px] font-semibold text-[#1e1b4b] leading-tight truncate">{n.title}</p>
                                                    {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shrink-0 animate-pulse" />}
                                                </div>
                                                {n.description && <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed truncate">{n.description}</p>}
                                                {/* Escala Actions */}
                                                {n.type === 'escala' && n.metadata?.schedule_id && !n.metadata?.action_taken ? (
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleScheduleAction(n.id, n.metadata!.schedule_id!, 'confirmado'); }}
                                                            className="flex items-center gap-1 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all active:scale-95"
                                                        >
                                                            <Check className="w-2.5 h-2.5" /> Aceitar
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleScheduleAction(n.id, n.metadata!.schedule_id!, 'recusado'); }}
                                                            className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all active:scale-95"
                                                        >
                                                            <X className="w-2.5 h-2.5" /> Recusar
                                                        </button>
                                                    </div>
                                                ) : n.type === 'escala' && n.metadata?.action_taken ? (
                                                    <span className={`text-[8px] font-bold mt-1 block ${n.metadata.action_taken === 'confirmado' ? 'text-emerald-500' : 'text-red-400'}`}>
                                                        {n.metadata.action_taken === 'confirmado' ? '✅ Aceito' : '❌ Recusado'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] text-gray-300 font-medium mt-0.5 block">{formatTimeAgo(n.created_at)}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                )}
            </div>
        </motion.div>
    );
};

export const MessagesPopover = ({ onClose, currentUserId, churchId: _churchId }: { onClose: () => void, currentUserId?: string, churchId?: string | null }) => {
    const [view, setView] = useState<'list' | 'chat'>('list');
    const [activeChat, setActiveChat] = useState<any>(null);
    const [messageInput, setMessageInput] = useState('');
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    // Mock Chats
    const [_chats, _setChats] = useState<any[]>([
        // Example mock chat
        // { id: 1, user: { name: 'Pr. Carlos', avatar: null }, lastMessage: 'Deus abençoe!', time: '10:00' }
    ]);

    // Fetch users logic
    useEffect(() => {
        const fetchMembers = async () => {
            setIsLoadingUsers(true);
            try {
                // Try to search for members. Assuming 'members' table links to 'users' via 'profile_id' or 'user_id'
                // This is a "best guess" query based on typical Supabase schemas for this app type
                // If it fails, we fall back to empty list or mocks
                const { data, error } = await supabase
                    .from('members')
                    .select(`
                        id,
                        user_id,
                        users (
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .limit(10); // Limit for performance in dropdown

                if (!error && data) {
                    const formatted = data.map((m: any) => ({
                        id: m.users?.id || m.user_id,
                        name: m.users?.full_name || 'Membro',
                        avatar: m.users?.avatar_url,
                        role: 'Membro'
                    })).filter((u: any) => u.id !== currentUserId); // Exclude self

                    // Deduplicate
                    const unique = Array.from(new Set(formatted.map((a: any) => a.id)))
                        .map(id => formatted.find((a: any) => a.id === id));

                    setAvailableUsers(unique);
                }
            } catch (e) {
                console.error("Error fetching chat users", e);
            } finally {
                setIsLoadingUsers(false);
            }
        };

        fetchMembers();
    }, [currentUserId]);

    const handleSendMessage = () => {
        if (!messageInput.trim()) return;

        // Optimistic update
        const newMessage = {
            id: Date.now(),
            text: messageInput,
            sender: 'me',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (activeChat.messages) {
            activeChat.messages.push(newMessage);
        } else {
            activeChat.messages = [newMessage];
        }

        setMessageInput('');

        // Force re-render/update
        setActiveChat({ ...activeChat });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="header-popover absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-[#1e1b4b]/5 overflow-hidden z-[100] flex flex-col h-[400px]"
        >
            {view === 'list' ? (
                <>
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="font-bold text-[#1e1b4b] text-sm">Mensagens</h3>
                        <div className="flex gap-1">
                            <button className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <Search className="w-4 h-4 text-[#1e1b4b]/50" />
                            </button>
                            <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-4 h-4 text-[#1e1b4b]/50" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {isLoadingUsers ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-6 h-6 text-[#d4af37] animate-spin" />
                            </div>
                        ) : availableUsers.length === 0 ? (
                            <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                    <MessageSquare className="w-5 h-5 text-gray-300" />
                                </div>
                                <p className="text-sm font-medium text-gray-500">Nenhum contato.</p>
                                <p className="text-xs text-gray-400 mt-1">Convide membros para sua igreja.</p>
                            </div>
                        ) : (
                            <>
                                <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">Sua Igreja</div>
                                {availableUsers.map(user => (
                                    <div
                                        key={user.id}
                                        className="p-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer flex gap-3 items-center group"
                                        onClick={() => {
                                            setActiveChat({ ...user, messages: [] });
                                            setView('chat');
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-[#1e1b4b] text-[#d4af37] flex items-center justify-center font-bold text-sm overflow-hidden border border-[#d4af37]/20">
                                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <h4 className="text-sm font-bold text-[#1e1b4b] truncate group-hover:text-[#d4af37] transition-colors">{user.name}</h4>
                                                <span className="text-[10px] text-gray-300">Novo</span>
                                            </div>
                                            <p className="text-xs text-gray-400 truncate">Clique para iniciar uma conversa</p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </>
            ) : (
                <>
                    {/* Chat Header */}
                    <div className="p-3 border-b border-gray-100 flex items-center gap-3 bg-[#1e1b4b] text-white">
                        <button onClick={() => setView('list')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white text-[#1e1b4b] flex items-center justify-center font-bold text-xs overflow-hidden">
                                {activeChat?.avatar ? <img src={activeChat.avatar} className="w-full h-full object-cover" /> : activeChat?.name[0]}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm leading-none">{activeChat?.name}</h3>
                                <span className="text-[10px] opacity-70">Online agora</span>
                            </div>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 bg-gray-50 overflow-y-auto p-4 flex flex-col gap-3">
                        <div className="text-center text-[10px] text-gray-400 my-2">Hoje</div>

                        {/* Fake Welcome Message */}
                        <div className="self-center bg-[#d4af37]/10 text-[#d4af37] px-3 py-1 rounded-full text-[10px] font-bold mb-4">
                            Início da conversa com {activeChat?.name}
                        </div>

                        {activeChat?.messages?.map((msg: any) => (
                            <div key={msg.id} className={`max-w-[80%] p-3 rounded-2xl text-xs ${msg.sender === 'me' ? 'bg-[#1e1b4b] text-white self-end rounded-tr-none' : 'bg-white border border-gray-100 self-start rounded-tl-none shadow-sm'}`}>
                                <p>{msg.text}</p>
                                <span className={`text-[9px] block text-right mt-1 ${msg.sender === 'me' ? 'opacity-50' : 'text-gray-300'}`}>{msg.time}</span>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-gray-100">
                        <div className="relative flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Digite sua mensagem..."
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-full py-2 px-4 text-xs focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/20 transition-all"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            />
                            <button
                                onClick={handleSendMessage}
                                className="p-2 bg-[#1e1b4b] text-[#d4af37] rounded-full hover:scale-105 transition-transform shadow-md"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </motion.div>
    );
};
