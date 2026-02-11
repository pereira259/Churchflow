
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, User, ChevronLeft, Loader2, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// State management for notifications (Global/Shared in context ideally, but local for now)
let globalUnreadCount = 3;
let globalSetUnreadCount: ((count: number) => void) | null = null;

export const NotificationBadge = () => {
    const [count, setCount] = useState(globalUnreadCount);

    useEffect(() => {
        globalSetUnreadCount = setCount;
        return () => { globalSetUnreadCount = null; };
    }, []);

    if (count <= 0) return null;

    return (
        <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500 border border-white box-content animate-pulse" />
    );
};

export const NotificationsPopover = ({ onClose: _onClose }: { onClose: () => void }) => {
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'Atualização do Sistema', desc: 'Funcionalidades novas no perfil.', time: 'Há 1 hora', read: false },
        { id: 2, title: 'Novo Membro', desc: 'João Silva entrou na igreja.', time: 'Há 3 horas', read: false },
        { id: 3, title: 'Escala Confirmada', desc: 'Você está escalado para domingo.', time: 'Há 5 horas', read: false },
    ]);

    const markAllRead = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        globalUnreadCount = 0;
        if (globalSetUnreadCount) globalSetUnreadCount(0);

        // Optional: Keep popover open or close it? User usually expects feedback.
        // We'll just clear the Badge state.
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="header-popover absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-[#1e1b4b]/5 overflow-hidden z-[100]"
        >
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-[#1e1b4b] text-sm">Notificações</h3>
                <button
                    className="text-[10px] font-bold text-[#d4af37] uppercase tracking-wider hover:underline transition-all"
                    onClick={markAllRead}
                >
                    Marcar lidas
                </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs">Nenhuma notificação.</div>
                ) : (
                    notifications.map((n) => (
                        <div key={n.id} className={`p-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer flex gap-3 ${n.read ? 'opacity-60' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.read ? 'bg-gray-100' : 'bg-[#d4af37]/10'}`}>
                                <User className={`w-3.5 h-3.5 ${n.read ? 'text-gray-400' : 'text-[#d4af37]'}`} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-[#1e1b4b] leading-tight">{n.title}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{n.desc}</p>
                                <span className="text-[9px] text-gray-300 font-medium mt-1 block">{n.time}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                <button className="text-xs font-bold text-[#1e1b4b] hover:text-[#d4af37] transition-colors">Ver todas</button>
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
