import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState } from 'react';

import { MessageCircle, Send, Users, CheckCircle2 } from 'lucide-react';

export function ComunicacaoPage() {
    const [message, setMessage] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('louvor');

    const handleSendMessage = () => {
        if (!message) return;

        // WhatsApp URL Scheme
        // In a real app with backend, this would call an API.
        // For MVP, we open WhatsApp Web with the text pre-filled.
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    return (
        <DashboardLayout>
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="font-display text-2xl font-bold italic text-[#1e1b4b]">
                        Comunicação <span className="text-[#d4af37]">& Avisos</span>
                    </h1>
                    <p className="text-slate-500 text-sm">Envie mensagens rápidas para seus times e liderados.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sidebar / Groups */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-4 h-fit">
                        <h3 className="font-bold text-[#1e1b4b] mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Grupos
                        </h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => setSelectedGroup('louvor')}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex justify-between items-center ${selectedGroup === 'louvor'
                                    ? 'bg-[#1e1b4b] text-white'
                                    : 'hover:bg-slate-50 text-slate-600'
                                    }`}
                            >
                                Ministério de Louvor
                                {selectedGroup === 'louvor' && <CheckCircle2 className="w-3 h-3 text-[#d4af37]" />}
                            </button>
                            <button
                                onClick={() => setSelectedGroup('diaconia')}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex justify-between items-center ${selectedGroup === 'diaconia'
                                    ? 'bg-[#1e1b4b] text-white'
                                    : 'hover:bg-slate-50 text-slate-600'
                                    }`}
                            >
                                Diaconia
                            </button>
                            <button
                                onClick={() => setSelectedGroup('infantil')}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors flex justify-between items-center ${selectedGroup === 'infantil'
                                    ? 'bg-[#1e1b4b] text-white'
                                    : 'hover:bg-slate-50 text-slate-600'
                                    }`}
                            >
                                Ministério Infantil
                            </button>
                        </div>
                    </div>

                    {/* Message Area */}
                    <div className="md:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <MessageCircle className="w-40 h-40" />
                        </div>

                        <label className="block text-sm font-bold text-[#1e1b4b] mb-2">Mensagem</label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Digite sua mensagem aqui..."
                            className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 resize-none text-sm"
                        />

                        <div className="flex justify-between items-center mt-4">
                            <p className="text-xs text-slate-400">
                                Será aberto o WhatsApp Web para envio.
                            </p>
                            <button
                                onClick={handleSendMessage}
                                disabled={!message}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                                Enviar via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
