import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
// import { useNavigate } from 'react-router-dom';
import { MapPin, Search, ChevronRight, Church as ChurchIcon, Loader2, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PremiumToast, ToastType } from '@/components/ui/PremiumToast';

interface Church {
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    logo_url: string | null;
    distance?: number;
}

interface ChurchSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ChurchSelectionModal({ isOpen, onClose }: ChurchSelectionModalProps) {
    const { user, refreshProfile } = useAuth();
    // const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [churches, setChurches] = useState<Church[]>([]);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);

    const [toast, setToast] = useState<{
        visible: boolean;
        message: string;
        type: ToastType;
    }>({
        visible: false,
        message: '',
        type: 'success'
    });

    useEffect(() => {
        if (isOpen) {
            searchChurches();
        }
    }, [isOpen, searchTerm]);

    useEffect(() => {
        if (userLocation) {
            searchChurches();
        }
    }, [userLocation]);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ visible: true, message, type });
    };

    const searchChurches = async () => {
        setSearching(true);
        try {
            let query = supabase
                .from('churches')
                .select('id, name, city, state, logo_url, latitude, longitude')
                .limit(20);

            if (searchTerm) {
                query = query.ilike('name', `%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            let sortedData = data || [];
            if (userLocation && sortedData.length > 0) {
                sortedData = sortedData.map((church: any) => ({
                    ...church,
                    distance: calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        church.latitude || 0,
                        church.longitude || 0
                    )
                })).sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0));
            }

            setChurches(sortedData);
        } catch (err) {
            console.error('Erro ao buscar igrejas:', err);
        } finally {
            setSearching(false);
        }
    };

    const handleGetLocation = () => {
        setSearching(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocalização não suportada');
            setSearching(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setSearching(false);
            },
            (error) => {
                console.error('Erro de geolocalização:', error);
                setLocationError('Não foi possível obter sua localização.');
                setSearching(false);
            }
        );
    };

    const handleSelect = async (churchId: string) => {
        if (!user) return;
        setLoading(true);

        try {
            const { error: updateError } = await supabase
                .from('users')
                .update({ church_id: churchId })
                .eq('id', user.id);

            if (updateError) throw updateError;

            const { data: existingMember } = await supabase
                .from('members')
                .select('id')
                .eq('user_id', user.id)
                .eq('church_id', churchId)
                .maybeSingle();

            if (!existingMember) {
                await supabase.from('members').insert({
                    church_id: churchId,
                    user_id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    email: user.email,
                    status: 'visitante',
                    notes: 'Entrou via App (Seleção de Igreja)'
                });
            }

            await refreshProfile();
            showToast('Bem-vindo à igreja!', 'success');
            onClose();
            // Optionally reload or navigate if needed, but for now just close modal and update profile
            // window.location.reload(); // Or cleaner state update

        } catch (err) {
            console.error('Erro ao entrar na igreja:', err);
            showToast('Erro ao conectar com a igreja. Tente novamente.', 'error');
        } finally {
            setLoading(false);
        }
    };

    function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Encontrar Igreja"
                headerAction={
                    <a
                        href="/criar-igreja"
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#d4af37] hover:bg-[#b5952f] text-[#1e1b4b] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 decoration-0"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Criar Igreja</span>
                    </a>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-slate-500 text-sm">Onde você congrega?</p>

                    <div className="relative group shrink-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#1e1b4b] transition-colors mt-0.5" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou cidade..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e1b4b]/10 focus:border-[#1e1b4b] transition-all shadow-sm placeholder:text-slate-400 text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="shrink-0">
                        <button
                            onClick={handleGetLocation}
                            disabled={searching || !!userLocation}
                            className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-medium transition-all duration-200 ${userLocation
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                                : 'bg-[#1e1b4b] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed'
                                }`}
                        >
                            {userLocation ? (
                                <>
                                    <MapPin className="w-5 h-5" />
                                    <span>Localização detectada</span>
                                </>
                            ) : (
                                <>
                                    <MapPin className="w-5 h-5" />
                                    <span>Usar minha localização atual</span>
                                </>
                            )}
                        </button>

                        {userLocation && (
                            <p className="text-xs text-center text-emerald-600 mt-2 font-medium">
                                Mostrando igrejas num raio de 50km
                            </p>
                        )}
                        {locationError && (
                            <p className="text-xs text-center text-red-500 mt-2 bg-red-50 py-1 px-2 rounded-md border border-red-100">
                                {locationError}
                            </p>
                        )}
                    </div>

                    <div className="space-y-3 pr-1 pb-4 max-h-[350px] overflow-y-auto custom-scrollbar">
                        {searching ? (
                            <div className="text-center py-12">
                                <Loader2 className="w-8 h-8 text-[#1e1b4b] animate-spin mx-auto mb-3" />
                                <p className="text-sm text-slate-500 font-medium">Buscando...</p>
                            </div>
                        ) : churches.length > 0 ? (
                            churches.map((church) => (
                                <button
                                    key={church.id}
                                    onClick={() => handleSelect(church.id)}
                                    disabled={loading}
                                    className="w-full group bg-white border border-slate-100 hover:border-[#1e1b4b]/30 p-3.5 rounded-xl flex items-center gap-4 transition-all hover:shadow-md active:scale-[0.99] text-left"
                                >
                                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 group-hover:border-[#1e1b4b]/10 transition-colors">
                                        {church.logo_url ? (
                                            <img src={church.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                        ) : (
                                            <ChurchIcon className="w-5 h-5 text-slate-400 group-hover:text-[#1e1b4b] transition-colors" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-[#1e1b4b] transition-colors text-sm">{church.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                            <span className="truncate max-w-[150px]">
                                                {church.city ? `${church.city}, ${church.state}` : 'Localização não informada'}
                                            </span>
                                            {church.distance !== undefined && church.distance < 9000 && (
                                                <>
                                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                                                        {church.distance < 1
                                                            ? `${Math.round(church.distance * 1000)}m`
                                                            : `${church.distance.toFixed(1)}km`}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1e1b4b] transition-all" />
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8 px-4 opacity-60">
                                <ChurchIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">Nenhuma igreja encontrada</p>
                            </div>
                        )}

                        {/* Sticky Footer CTA - Create Church */}
                    </div>
                </div>
            </Modal>

            <PremiumToast
                isVisible={toast.visible}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
            />
        </>
    );
}
