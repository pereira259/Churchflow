import {
    UsersRound,
    MapPin,
    AlertTriangle,
    Save,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Calendar,
    Users,
    Trash2,
    X,
    Map as MapIcon,
    ImageIcon,
    Plus,
    Search,
    Repeat,
    MessageCircle,
    Minus,
    Navigation
} from 'lucide-react';
// Version: 2.0 - Uber-style split screen mobile layout
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MemberLayout } from '@/components/layout/MemberLayout';
import { useState, useEffect, useMemo, useRef } from 'react';
import { getGroups, createGroup, updateGroup, deleteGroup, Group } from '@/lib/supabase-queries';
import { Modal } from '@/components/ui/Modal';
import { CustomDatePicker } from '@/components/ui/CustomDatePicker';
import { PremiumToast, ToastType } from '@/components/ui/PremiumToast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';


import { useAuth } from '@/lib/auth';

// Church ID padrão
// Church ID padrão - REMOVED
// const DEFAULT_CHURCH_ID = '00000000-0000-0000-0000-000000000001';

export function GruposPage() {
    const { profile } = useAuth();
    const canManageAll = profile?.role === 'admin' || profile?.role === 'pastor_chefe' || profile?.role === 'pastor_lider';
    const canCreate = canManageAll || profile?.role === 'lider';

    const [groups, setGroups] = useState<Group[]>([]);
    const [, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState<Group | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [viewingGallery, setViewingGallery] = useState<{ urls: string[], index: number } | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        leader: '',
        leader_phone: '',
        day: '2026-02-01',
        time: '',
        location: '',
        cep: '',
        category: 'Célula',
        latitude: -23.5505,
        longitude: -46.6333,
        gallery_urls: [] as string[]
    });
    const [isSatellite, setIsSatellite] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [tempCoords, setTempCoords] = useState<{ lat: number; lng: number } | null>(null);

    const [isSameAsChurch, setIsSameAsChurch] = useState(true);

    // Toast State
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: ToastType }>({
        visible: false,
        message: '',
        type: 'success'
    });

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ visible: true, message, type });
    };
    // const [zoom, setZoom] = useState(11); // Unused for now

    // Map Loop Ref
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [churchInfo, setChurchInfo] = useState<{ lat: number, lng: number, address: string, cep: string } | null>(null);

    // Fetch Church Info for default positioning
    useEffect(() => {
        const fetchChurch = async () => {
            if (!profile?.church_id) return;
            try {
                const { data, error } = await supabase
                    .from('churches')
                    .select('latitude, longitude, address, cep')
                    .eq('id', profile.church_id)
                    .single();

                if (!error && data) {
                    let lat = data.latitude || -23.5505;
                    let lng = data.longitude || -46.6333;

                    // Se as coordenadas não existem ou são o centro padrão de SP, tenta geocodificar o CEP
                    const isDefaultCoords = (Math.abs(lat - (-23.5505)) < 0.001 && Math.abs(lng - (-46.6333)) < 0.001);

                    if (data.cep) {
                        try {
                            const cepClean = data.cep.replace(/\D/g, '');
                            if (cepClean.length === 8 && isDefaultCoords) {
                                // Usa 'q=' que é mais flexível que 'postalcode=' no Nominatim
                                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${cepClean}&country=Brazil`);
                                const results = await res.json();
                                if (results && results.length > 0) {
                                    lat = parseFloat(results[0].lat);
                                    lng = parseFloat(results[0].lon);
                                }
                            }
                        } catch (e) {
                            console.error("Erro ao geocodificar CEP da igreja:", e);
                        }
                    }

                    setChurchInfo({
                        lat,
                        lng,
                        address: data.address || '',
                        cep: data.cep || ''
                    });
                }
            } catch (err) {
                console.error("Erro ao buscar dados da igreja:", err);
            }
        };
        fetchChurch();
    }, [profile?.church_id]);

    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1000;
                    const MAX_HEIGHT = 1000;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const remainingSlots = 10 - (formData.gallery_urls?.length || 0);
            if (remainingSlots <= 0) return showToast('Máximo de 10 fotos por galeria.', 'warning');

            const filesToProcess = Array.from(files).slice(0, remainingSlots);

            try {
                const compressedImages = await Promise.all(
                    filesToProcess.map(file => compressImage(file))
                );

                setFormData(prev => ({
                    ...prev,
                    gallery_urls: [...(prev.gallery_urls || []), ...compressedImages]
                }));
            } catch (err) {
                console.error("Erro ao processar imagens", err);
                showToast("Erro ao processar imagens. Tente novamente.", 'error');
            }
        }
    };


    const removeImage = (index: number) => {
        setFormData(prev => ({
            ...prev,
            gallery_urls: prev.gallery_urls.filter((_, i) => i !== index)
        }));
    };

    useEffect(() => {
        loadGroups();
    }, []);

    // Initializing Leaflet Map
    useEffect(() => {
        // Robust initialization loop
        const initMap = () => {
            // Check if L is loaded and container exists
            if (!(window as any).L || !mapContainerRef.current) return;

            // Clean up existing map instance
            if ((window as any).leafletMap) {
                (window as any).leafletMap.remove();
                (window as any).leafletMap = null;
            }

            const L = (window as any).L;
            const map = L.map(mapContainerRef.current, {
                center: churchInfo ? [churchInfo.lat, churchInfo.lng] : [-23.5505, -46.6333],
                zoom: 11,
                zoomControl: false,
                attributionControl: false
            });

            // Save map instance
            (window as any).leafletMap = map;

            // Define Layers
            const streets = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                attribution: 'Google'
            });

            const satellite = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
                attribution: 'Google'
            });

            // Add Initial Layer
            if (isSatellite) {
                satellite.addTo(map);
            } else {
                streets.addTo(map);
            }

            // Sync visual zoom state - Disabled for now
            // map.on('zoomend', () => {
            //    setZoom(map.getZoom());
            // });

            // Force redraw after init to prevent gray tiles
            setTimeout(() => {
                map.invalidateSize();
            }, 250);
        };

        // Try to init immediately, then retry if L is not ready (e.g. slow CDN)
        initMap();

        const intervalId = setInterval(() => {
            if (!(window as any).leafletMap) {
                initMap();
            } else {
                clearInterval(intervalId);
            }
        }, 500);

        return () => {
            clearInterval(intervalId);
            if ((window as any).leafletMap) {
                // optionally remove, but persisting might be smoother for dev
                (window as any).leafletMap.remove();
                (window as any).leafletMap = null;
            }
        };
    }, [churchInfo]); // Run on mount and when churchInfo is loaded

    // Effect to update layers when isSatellite changes
    useEffect(() => {
        const map = (window as any).leafletMap;
        const L = (window as any).L;
        if (!map || !L) return;

        // Simple layer switcher hack: remove all layers and add current
        map.eachLayer((layer: any) => {
            if (layer instanceof L.TileLayer) {
                map.removeLayer(layer);
            }
        });

        if (isSatellite) {
            L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }).addTo(map);
        } else {
            L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                maxZoom: 20,
                subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
            }).addTo(map);
        }
    }, [isSatellite]);

    // Effect to add markers when groups data changes
    useEffect(() => {
        if (!showMapModal) return;

        // Small timeout to wait for modal rendering
        const timer = setTimeout(() => {
            const container = document.getElementById('selection-map');
            if (!container) return;

            const L = (window as any).L;
            if (!L) return;

            // Cleanup prev map if exists in this container (though modal unmounts it usu., good practice)
            if ((container as any)._leaflet_id) {
                // simple cleanup or check
                // For simplicity assuming re-init is fine or handled by unique id
            }

            const map = L.map('selection-map', {
                center: [
                    tempCoords?.lat || formData.latitude || (churchInfo?.lat ?? -23.5505),
                    tempCoords?.lng || formData.longitude || (churchInfo?.lng ?? -46.6333)
                ],
                zoom: 15,
                zoomControl: true,
                attributionControl: false,
                scrollWheelZoom: true
            });

            if (isSatellite) {
                L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
                    maxZoom: 20,
                    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
                }).addTo(map);
            } else {
                L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                    maxZoom: 20,
                    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
                }).addTo(map);
            }

            let marker: any = null;

            // Add initial marker if exists
            if (formData.latitude && formData.longitude) {
                marker = L.marker([formData.latitude, formData.longitude]).addTo(map);
                setTempCoords({ lat: formData.latitude, lng: formData.longitude });
            }

            map.on('click', (e: any) => {
                const { lat, lng } = e.latlng;
                if (marker) {
                    marker.setLatLng([lat, lng]);
                } else {
                    marker = L.marker([lat, lng]).addTo(map);
                }
                setTempCoords({ lat, lng });
            });

            // Save instance to cleanup later if needed, but modal usually destroys DOM
            (window as any).selectionMap = map;
            (window as any).selectionMarker = marker;

            // Invalidate size to ensure full render
            setTimeout(() => {
                map.invalidateSize();
            }, 100);

        }, 100);

        return () => {
            clearTimeout(timer);
            if ((window as any).selectionMap) {
                (window as any).selectionMap.remove();
                (window as any).selectionMap = null;
            }
        };
    }, [showMapModal, isSatellite]); // Re-run when map opens or view mode changes

    // Main map effect for markers
    useEffect(() => {
        const map = (window as any).leafletMap;
        const L = (window as any).L;
        if (!map || !L || groups.length === 0) return;

        // Clean existing markers
        map.eachLayer((layer: any) => {
            // Keep tiles, remove markers
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        groups.forEach((group) => {
            if (group.latitude && group.longitude) {
                const icon = L.divIcon({
                    className: 'custom-pin',
                    html: `<div class="w-8 h-8 flex items-center justify-center filter drop-shadow-md relative">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ea4335" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-8 w-8 fill-[#ea4335]/20"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full flex items-center justify-center animate-pulse shadow-sm">
                                    <div class="w-1.5 h-1.5 bg-[#ea4335] rounded-full"></div>
                                </div>
                            </div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 32]
                });

                // const groupTypeColor = group.category === 'Célula' ? '#ea4335' : '#1e1b4b'; // Logic prepared for future use

                L.marker([group.latitude, group.longitude], { icon }).addTo(map)
                    .bindPopup(`<b>${group.name}</b><br>${group.leader}`);
            }
        });

    }, [groups]);

    const loadGroups = async () => {
        setLoading(true);
        try {
            const currentChurchId = profile?.church_id;
            if (!currentChurchId) return;
            const { data, error } = await getGroups(currentChurchId);
            if (error) throw error;
            setGroups(data);
        } catch (error: any) {
            console.error('Erro ao carregar grupos:', error);
            // alert('Erro ao carregar grupos: ' + (error.message || 'Erro desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    const openNewGroupModal = () => {
        if (!profile?.church_id) {
            showToast("Para cadastrar um grupo, sua igreja precisa estar cadastrada primeiro.", 'warning');
            return;
        }

        setEditingGroup(null);
        setFormData({
            name: '',
            leader: '',
            leader_phone: '',
            day: '2026-02-01',
            time: '',
            location: churchInfo?.address || '',
            cep: churchInfo?.cep || '',
            category: 'Célula',
            latitude: churchInfo?.lat || -23.5505,
            longitude: churchInfo?.lng || -46.6333,
            gallery_urls: []
        });
        setTempCoords(churchInfo ? { lat: churchInfo.lat, lng: churchInfo.lng } : null);
        setIsSameAsChurch(true);
        setShowModal(true);
    };

    const openEditModal = (group: Group) => {
        setEditingGroup(group);

        // Determine if it's currently at the church location
        const groupLocation = group.location || '';
        const sameAddress = groupLocation === churchInfo?.address ||
            groupLocation.toLowerCase() === 'templo' ||
            groupLocation.toLowerCase() === 'sede';

        const sameCoords = churchInfo ? (
            Math.abs((group.latitude || 0) - (churchInfo.lat || 0)) < 0.0005 &&
            Math.abs((group.longitude || 0) - (churchInfo.lng || 0)) < 0.0005
        ) : false;

        const isSame = sameAddress || sameCoords;
        setIsSameAsChurch(isSame);

        const initialIsSame = isSame || (group.latitude === 0 && group.longitude === 0);
        setIsSameAsChurch(initialIsSame);

        setFormData({
            ...formData,
            name: group.name,
            leader: group.leader || '',
            leader_phone: group.leader_phone || '',
            day: group.day || '2026-02-01',
            time: group.time || '',
            location: groupLocation,
            cep: isSame && churchInfo ? (churchInfo.cep || '') : (('cep' in group ? (group as any).cep : '') || ''),
            category: group.category || 'Célula',
            latitude: isSame && churchInfo ? churchInfo.lat : (group.latitude || (churchInfo?.lat ?? -23.5505)),
            longitude: isSame && churchInfo ? churchInfo.lng : (group.longitude || (churchInfo?.lng ?? -46.6333)),
            gallery_urls: group.gallery_urls || []
        });

        setShowModal(true);
    };

    const handleDeleteGroup = (id: string) => {
        setGroupToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDeleteGroup = async () => {
        if (!groupToDelete) return;

        try {
            const { error } = await deleteGroup(groupToDelete);
            if (error) throw error;
            await loadGroups();
            setShowDeleteModal(false);
            setGroupToDelete(null);
            setShowModal(false); // Fecha o modal de edição/cadastro

            // Feedback visual de sucesso (com pequeno delay para permitir o fechamento visual dos modais)

            setTimeout(() => {
                showToast('Grupo excluído com sucesso!', 'success');
            }, 100);

        } catch (error: any) {
            console.error('Erro ao excluir:', error);
            showToast('Erro ao excluir grupo.', 'error');
        }
    };


    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        const churchId = (window as any).profile?.church_id; // Placeholder
        if (!churchId) return; // Guard clause
        setIsSaving(true);

        try {
            const finalData = isSameAsChurch && churchInfo ? {
                ...formData,
                // Ensure the location starts with the church address, preserving any complement
                location: formData.location.includes(churchInfo.address) ? formData.location : churchInfo.address,
                cep: churchInfo.cep || '',
                latitude: churchInfo.lat,
                longitude: churchInfo.lng
            } : formData;

            if (editingGroup) {
                const { error } = await updateGroup(editingGroup.id, {
                    ...finalData,
                    church_id: churchId,
                });
                if (error) throw error;
            } else {
                const { error } = await createGroup({
                    ...finalData,
                    church_id: churchId,
                    created_by: profile?.id
                });
                if (error) throw error;
            }

            await loadGroups();
            setShowModal(false);
        } catch (error: any) {
            console.error('Erro ao salvar grupo:', error);
            if (error.code === 'PGRST204' || error.message?.includes('column')) {
                showToast('Erro de Configuração: Banco de dados desatualizado.', 'error');
            } else {
                showToast("Erro ao salvar os dados. Tente novamente.", 'error');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const metrics = useMemo(() => {
        const totalMembers = groups.reduce((acc, g) => acc + (g.members?.length || 0), 0);
        const uniqueLocations = new Set(groups.map(g => g.location)).size;
        return {
            totalGroups: groups.length,
            totalMembers,
            locations: uniqueLocations
        };
    }, [groups]);

    const [searchTerm, setSearchTerm] = useState('');

    const filteredGroups = useMemo(() => {
        return groups.filter(g =>
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (g.leader || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (g.location || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [groups, searchTerm]);

    const Layout = (profile?.role === 'admin' || profile?.role === 'pastor_chefe' || profile?.role === 'pastor_lider') ? DashboardLayout : MemberLayout;

    const canEditCurrent = canManageAll || (editingGroup?.created_by === profile?.id);

    const modalFooter = (!canEditCurrent && editingGroup) ? null : (
        <div className="flex items-center justify-between gap-4 w-full">
            {editingGroup && canEditCurrent ? (
                <button
                    type="button"
                    onClick={() => handleDeleteGroup(editingGroup.id)}
                    className="h-12 px-6 rounded-2xl border border-red-50 text-red-500 hover:bg-red-50 hover:border-red-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
                >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                </button>
            ) : (
                <div className="flex-1" />
            )}

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="h-12 px-7 rounded-2xl text-slate-400 hover:text-marinho hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    Cancelar
                </button>
                {(canCreate || (editingGroup && canEditCurrent)) && (
                    <button
                        type="submit"
                        form="group-form"
                        disabled={isSaving}
                        className="h-12 px-10 bg-marinho text-white rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-slate-800 transition-all shadow-[0_10px_25px_-8px_rgba(30,27,75,0.4)] disabled:opacity-50 active:scale-95 group/save"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin text-gold" />
                        ) : (
                            <Save className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />
                        )}
                        <span>Confirmar</span>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <Layout>
            <PremiumToast
                isVisible={toast.visible}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingGroup ? (canEditCurrent ? "Editar Grupo" : "Ver Detalhes") : "Novo Grupo"}
                footer={modalFooter}
            >
                {editingGroup && !canEditCurrent ? (
                    // VIEW MODE (Members) - Optimized for Reading & Aesthetic
                    <div className="space-y-2 pt-0 pb-1 px-1">
                        {/* Header Info - Centered & Clean */}
                        <div className="text-center space-y-1.5">
                            <span className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-[#1e1b4b]/5 text-[#1e1b4b] text-[10px] font-black uppercase tracking-widest border border-[#1e1b4b]/10 shadow-sm">
                                {formData.category}
                            </span>
                            <h2 className="text-2xl font-bold text-[#1e1b4b] font-display tracking-tight leading-none">
                                {formData.name}
                            </h2>
                        </div>

                        {/* Info Cards Grid - Compact & Visual */}
                        <div className="grid grid-cols-2 gap-2">
                            {/* Leader Card */}
                            <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-1 group hover:border-[#d4af37]/30 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[#1e1b4b] shadow-sm group-hover:scale-110 transition-transform">
                                    <UsersRound className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Líder</p>
                                    <p className="text-xs font-bold text-[#1e1b4b] truncate max-w-[130px]">{formData.leader}</p>
                                </div>
                            </div>

                            {/* Date/Time Card */}
                            <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col items-center text-center gap-1 group hover:border-[#d4af37]/30 transition-colors">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-[#1e1b4b] shadow-sm group-hover:scale-110 transition-transform">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Encontro</p>
                                    <p className="text-xs font-bold text-[#1e1b4b] capitalize">
                                        {formData.day && !['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(formData.day)
                                            ? new Date(formData.day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' }).replace('.', '')
                                            : formData.day}
                                        <span className="mx-1.5 opacity-30">|</span>
                                        {formData.time?.slice(0, 5)}h
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Location & WhatsApp - Unified */}
                        <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm space-y-3 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#d4af37]/5 to-transparent rounded-bl-full -mr-4 -mt-4" />

                            <div className="flex items-start gap-3 relative z-10">
                                <div className="shrink-0 mt-1 w-8 h-8 rounded-full bg-[#1e1b4b]/5 flex items-center justify-center text-[#1e1b4b]">
                                    <MapPin className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Localização</p>
                                    <p className="text-sm font-bold text-[#1e1b4b] leading-tight pr-4">{formData.location}</p>
                                </div>
                            </div>

                            {formData.leader_phone ? (
                                <button
                                    onClick={() => {
                                        const phone = formData.leader_phone.replace(/\D/g, '');
                                        window.open(`https://wa.me/55${phone}`, '_blank');
                                    }}
                                    className="w-full h-9 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all group relative z-10"
                                >
                                    <div className="p-1 rounded-full bg-white/20">
                                        <MessageCircle className="w-4 h-4" />
                                    </div>
                                    Chamar no WhatsApp
                                </button>
                            ) : (
                                <div className="w-full h-9 border border-slate-200 bg-slate-50 rounded-lg flex items-center justify-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest cursor-not-allowed">
                                    <MessageCircle className="w-4 h-4 opacity-50" />
                                    Sem WhatsApp
                                </div>
                            )}
                        </div>

                        {/* Group Photos Mural */}
                        {editingGroup?.gallery_urls && editingGroup.gallery_urls.length > 0 && (
                            <div className="pt-1">
                                <div className="flex items-center justify-center mb-2">
                                    <div className="h-px w-6 bg-slate-200" />
                                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
                                        Mural ({editingGroup.gallery_urls.length})
                                    </h3>
                                    <div className="h-px w-6 bg-slate-200" />
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                    {editingGroup.gallery_urls.map((url, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setViewingGallery({ urls: editingGroup.gallery_urls!, index: i })}
                                            className="shrink-0 w-14 h-14 rounded-lg border-2 border-white shadow-sm overflow-hidden active:scale-95 transition-transform hover:border-[#d4af37]/30"
                                        >
                                            <img src={url} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Members Gallery */}
                        {editingGroup && (
                            <div className="pt-2">
                                <div className="flex items-center justify-center mb-3">
                                    <div className="h-px w-8 bg-slate-200" />
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">
                                        Quem participa ({editingGroup.members?.length || 0})
                                    </h3>
                                    <div className="h-px w-8 bg-slate-200" />
                                </div>

                                <div className="flex flex-wrap justify-center gap-2 px-1 max-h-[100px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                                    {editingGroup.members && editingGroup.members.length > 0 ? (
                                        editingGroup.members.map((member) => (
                                            <div key={member.id} className="group/member flex flex-col items-center gap-1.5 w-[60px]">
                                                <div className="h-11 w-11 rounded-full bg-slate-100 border-2 border-white shadow-sm overflow-hidden group-hover/member:scale-110 group-hover/member:border-[#d4af37]/30 transition-all duration-300 relative">
                                                    {member.photo_url ? (
                                                        <img src={member.photo_url} alt={member.full_name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-400">
                                                            <Users className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center leading-none group-hover/member:text-[#1e1b4b] transition-colors">
                                                    {member.full_name.split(' ')[0]}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-400 italic py-2">Nenhum membro visível</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <form id="group-form" onSubmit={handleSaveGroup} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch h-full">
                            {/* Left Column: Data Inputs - Compact & Dense */}
                            <div className="md:col-span-7 flex flex-col gap-3">
                                {/* Identification Bubble */}
                                <div className="p-3 bg-slate-50/50 rounded-[1.2rem] border border-slate-100 flex flex-col gap-2.5 shadow-sm">
                                    <div className="space-y-0.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] pl-1">Nome do Grupo</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full h-9 px-3 text-sm bg-white text-marinho font-bold border-0 rounded-lg focus:ring-2 focus:ring-marinho/10 transition-all placeholder:text-marinho/20 shadow-sm"
                                            placeholder="Ex: PG Morumbi - Jovens"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="space-y-0.5">
                                            <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] pl-1">Líder</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.leader}
                                                onChange={(e) => setFormData({ ...formData, leader: e.target.value })}
                                                className="w-full h-9 px-3 text-xs bg-white text-slate-700 font-medium border-0 rounded-lg focus:ring-2 focus:ring-marinho/10 shadow-sm"
                                                placeholder="Nome do líder"
                                            />
                                        </div>

                                        <div className="space-y-0.5">
                                            <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] pl-1">WhatsApp</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.leader_phone}
                                                    onChange={(e) => setFormData({ ...formData, leader_phone: e.target.value })}
                                                    className="w-full h-9 pl-3 pr-10 text-xs bg-white text-slate-700 font-medium border-0 rounded-lg focus:ring-2 focus:ring-marinho/10 shadow-sm placeholder:text-slate-300"
                                                    placeholder="(00) 00000"
                                                />
                                                {formData.leader_phone && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const phone = formData.leader_phone.replace(/\D/g, '');
                                                            window.open(`https://wa.me/55${phone}`, '_blank');
                                                        }}
                                                        className="absolute right-1 top-1 bottom-1 aspect-square bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"
                                                        title="Abrir WhatsApp"
                                                    >
                                                        <MessageCircle className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Logistics Bubble */}
                                <div className="p-3 bg-slate-50/50 rounded-[1.2rem] border border-slate-100 flex flex-col gap-2.5 shadow-sm flex-1">
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="space-y-0.5">
                                            <div className="flex items-end justify-between px-1 h-4">
                                                <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] leading-none mb-px">
                                                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(formData.day) ? 'Dia Fixo' : 'Data'}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                                        const isFixed = weekdays.includes(formData.day);

                                                        if (isFixed) {
                                                            // Desfazer: volta para uma data específica (hoje)
                                                            setFormData({ ...formData, day: new Date().toISOString().split('T')[0] });
                                                        } else {
                                                            // Fixar: pega o dia da semana da data atual
                                                            const date = new Date(formData.day + 'T12:00:00');
                                                            const weekday = weekdays[date.getDay()];
                                                            setFormData({ ...formData, day: weekday });
                                                        }
                                                    }}
                                                    className={cn(
                                                        "text-[8px] font-bold transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 leading-none mb-px",
                                                        ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(formData.day) ? "text-gold" : "text-marinho hover:text-gold"
                                                    )}
                                                    title={['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(formData.day) ? "Remover fixação" : "Fixar este dia da semana"}
                                                >
                                                    <Repeat className={cn("w-3 h-3", ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(formData.day) && "text-gold")} />
                                                    <span>{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(formData.day) ? "Fixado" : "Fixar Dia"}</span>
                                                </button>
                                            </div>
                                            <CustomDatePicker
                                                value={!['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(formData.day) ? formData.day : ""}
                                                displayValue={['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(formData.day) ? ({
                                                    'Seg': 'Segunda-feira', 'Ter': 'Terça-feira', 'Qua': 'Quarta-feira',
                                                    'Qui': 'Quinta-feira', 'Sex': 'Sexta-feira', 'Sáb': 'Sábado', 'Dom': 'Domingo'
                                                } as Record<string, string>)[formData.day] : undefined}
                                                onChange={(date) => {
                                                    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                                                    const isFixed = weekdays.includes(formData.day);
                                                    if (isFixed) {
                                                        const d = new Date(date + 'T12:00:00');
                                                        setFormData({ ...formData, day: weekdays[d.getDay()] });
                                                    } else {
                                                        setFormData({ ...formData, day: date });
                                                    }
                                                }}
                                                className="w-full h-9 px-3 text-xs bg-white text-slate-700 font-medium border border-slate-100 rounded-[0.5rem] focus:ring-2 focus:ring-marinho/10 shadow-sm"
                                            />
                                        </div>

                                        <div className="space-y-0.5">
                                            <div className="flex items-end justify-between px-1 h-4">
                                                <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] leading-none mb-px">Horário</label>
                                            </div>
                                            <div className="bg-white border border-slate-100 rounded-[0.5rem] h-9 shadow-sm flex items-center overflow-hidden">
                                                <input
                                                    type="time"
                                                    required
                                                    value={formData.time}
                                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                                    className="w-full h-full px-3 text-xs text-slate-700 font-medium border-0 bg-transparent focus:ring-0 outline-none cursor-pointer"
                                                />
                                            </div>
                                        </div>

                                    </div>

                                    {/* Map-First Location System */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5" />
                                                Localização do Grupo
                                            </label>
                                            {isSameAsChurch && (
                                                <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Sede Detectada</span>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                const initialCoords = {
                                                    lat: formData.latitude || (churchInfo?.lat ?? -23.5505),
                                                    lng: formData.longitude || (churchInfo?.lng ?? -46.6333)
                                                };
                                                setTempCoords(initialCoords);
                                                setShowMapModal(true);
                                            }}
                                            className="w-full group/map h-14 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-marinho/20 transition-all flex items-center gap-4 px-4 overflow-hidden relative"
                                        >
                                            <div className="absolute inset-0 bg-marinho/[0.02] group-hover/map:bg-marinho/[0.04] transition-colors" />
                                            <div className="w-8 h-8 rounded-xl bg-marinho/5 text-marinho flex items-center justify-center shrink-0 group-hover/map:scale-110 transition-transform">
                                                <MapIcon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-left relative z-10">
                                                <p className="text-[8px] font-black text-marinho/40 uppercase tracking-widest leading-none mb-1">Ponto no Mapa / Endereço</p>
                                                <p className="text-xs font-bold text-marinho truncate">{formData.location || 'Clique para definir local no mapa'}</p>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover/map:text-marinho/50 transition-colors">
                                                <Search className="w-4 h-4" />
                                            </div>
                                        </button>

                                        {/* Complementary Space Info */}
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-500 delay-150">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] pl-1">
                                                    Ambiente / Sala / Complemento
                                                </label>
                                                <input
                                                    type="text"
                                                    value={isSameAsChurch && churchInfo ? formData.location.replace(churchInfo.address, '').replace(/^,\s*/, '') : formData.location.includes(', ') ? formData.location.split(', ').slice(1).join(', ') : ''}
                                                    onChange={(e) => {
                                                        const complement = e.target.value;
                                                        if (isSameAsChurch && churchInfo) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                location: complement ? `${churchInfo.address}, ${complement}` : churchInfo.address
                                                            }));
                                                        } else {
                                                            // For custom address, we mostly rely on the map for the main part, but let users add a room/apt
                                                            const mainParts = formData.location.split(', ');
                                                            const mainAddr = mainParts[0];
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                location: complement ? `${mainAddr}, ${complement}` : mainAddr
                                                            }));
                                                        }
                                                    }}
                                                    className="w-full h-10 px-4 text-xs bg-white text-marinho font-bold border border-slate-100 rounded-xl shadow-sm focus:ring-2 focus:ring-marinho/10 transition-all placeholder:text-marinho/20"
                                                    placeholder={isSameAsChurch ? "Ex: Sala 02, Templo Principal, Anexo..." : "Nº da casa, Apt, Bloco..."}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-0.5">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] pl-1">Categoria</label>
                                        <div className="relative">
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full h-9 px-3 text-xs bg-white text-marinho font-bold border-0 rounded-lg focus:ring-2 focus:ring-marinho/10 shadow-sm outline-none cursor-pointer appearance-none"
                                            >
                                                <option>Célula</option>
                                                <option>Jovens</option>
                                                <option>Infantil</option>
                                                <option>Casais</option>
                                                <option>Ministério</option>
                                                <option>Outros</option>
                                            </select>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-marinho/30">
                                                <UsersRound className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Visuals */}
                            <div className="md:col-span-5 flex flex-col gap-3 h-full">
                                {/* Gallery Section */}
                                <div className="flex-1 min-h-[140px] p-3 bg-slate-50/50 rounded-[1.2rem] border border-slate-100 flex flex-col shadow-sm">
                                    <div className="flex items-center justify-between mb-2 px-1">
                                        <label className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            Galeria
                                        </label>
                                        <span className="text-[8px] font-black text-marinho/30 bg-white border border-slate-100 px-1.5 py-0.5 rounded-md">
                                            {(formData.gallery_urls || []).length}/10
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-4 gap-1.5 content-start">
                                        {(formData.gallery_urls || []).map((url, i) => (
                                            <div key={i} className="aspect-square relative group rounded-lg overflow-hidden bg-white border border-slate-200 shadow-sm">
                                                <img src={url} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(i)}
                                                    className="absolute inset-0 bg-red-600/90 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {(formData.gallery_urls || []).length < 10 && (
                                            <label className="aspect-square flex flex-col items-center justify-center gap-1 cursor-pointer bg-white border border-dashed border-marinho/20 rounded-lg hover:border-marinho/50 hover:bg-white/80 transition-all text-marinho/30 hover:text-marinho active:scale-95 group">
                                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                                <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Members Mini Section */}
                                {editingGroup && (
                                    <div className="p-3 bg-slate-50/50 rounded-[1.2rem] border border-slate-100 shadow-sm shrink-0">
                                        <div className="flex items-center justify-between mb-2 px-1">
                                            <h3 className="text-[9px] font-black text-marinho/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5" />
                                                Participantes
                                            </h3>
                                            <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[8px] font-black">
                                                {editingGroup.members?.length || 0}
                                            </span>
                                        </div>

                                        <div className="flex -space-x-2 overflow-hidden py-1 px-1">
                                            {editingGroup.members && editingGroup.members.length > 0 ? (
                                                <>
                                                    {editingGroup.members.slice(0, 6).map((member) => (
                                                        <div key={member.id} className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-slate-200 overflow-hidden relative" title={member.full_name}>
                                                            {member.photo_url ? (
                                                                <img src={member.photo_url} alt={member.full_name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                                                                    {member.full_name[0]}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {editingGroup.members.length > 6 && (
                                                        <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500">
                                                            +{editingGroup.members.length - 6}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-[9px] text-slate-400 italic pl-1">Aguardando...</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>


                    </>
                )}
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Excluir Grupo"
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-red-50 text-red-900 rounded-xl border border-red-100">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm">Tem certeza?</h4>
                            <p className="text-xs opacity-80 mt-0.5">Esta ação não pode ser desfeita. Todos os dados deste grupo serão perdidos.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1 h-10 rounded-xl border border-charcoal-200 text-charcoal-600 text-xs font-bold hover:bg-charcoal-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDeleteGroup}
                            className="flex-1 h-10 rounded-xl bg-red-500 text-white text-xs font-bold hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
                        >
                            Sim, Excluir
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Map Selection Modal */}
            <Modal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                title="Selecionar Localização"
            >
                <div className="space-y-4">
                    <div className="h-[300px] w-full bg-slate-100 rounded-xl relative overflow-hidden border border-slate-200 shadow-inner">
                        <div id="selection-map" className="absolute inset-0 z-0" />
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-lg z-10 text-[10px] font-black text-marinho uppercase tracking-widest border border-marinho/10">
                            Clique no mapa para marcar o local
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-4 gap-2">
                    <button
                        onClick={() => setShowMapModal(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={async () => {
                            if (tempCoords) {
                                // Check distance to church
                                const isNearChurch = churchInfo ? (
                                    Math.abs(tempCoords.lat - churchInfo.lat) < 0.0005 &&
                                    Math.abs(tempCoords.lng - churchInfo.lng) < 0.0005
                                ) : false;

                                setIsSameAsChurch(isNearChurch);

                                try {
                                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${tempCoords.lat}&lon=${tempCoords.lng}`);
                                    const data = await res.json();
                                    const address = isNearChurch && churchInfo ? churchInfo.address : (data.display_name || `${tempCoords.lat}, ${tempCoords.lng}`);

                                    setFormData(prev => ({
                                        ...prev,
                                        latitude: tempCoords.lat,
                                        longitude: tempCoords.lng,
                                        location: address
                                    }));
                                } catch (e) {
                                    setFormData(prev => ({
                                        ...prev,
                                        latitude: tempCoords.lat,
                                        longitude: tempCoords.lng
                                    }));
                                }
                                setShowMapModal(false);
                            }
                        }}
                        className="px-4 py-2 bg-marinho text-white rounded-lg text-xs font-bold hover:bg-marinho/90 shadow-lg shadow-marinho/20"
                    >
                        Confirmar Local
                    </button>
                </div>
            </Modal>

            <div className="h-full flex flex-col overflow-hidden bg-[#f8f9fa] relative">
                {/* Single full-screen map container */}
                <div className="flex-1 relative bg-[#e5e3df] overflow-hidden">
                    <div ref={mapContainerRef} id="map" className="absolute inset-0 z-0 bg-[#e5e3df]" />

                    {/* ===== MOBILE OVERLAY: Bottom Sheet ===== */}
                    <div className="md:hidden absolute inset-x-0 bottom-0 top-[33%] z-20 flex flex-col pointer-events-none">
                        {/* Mobile Map Controls - above the sheet */}
                        <div className="absolute top-[-30%] right-3 flex flex-col gap-1.5 z-[500] pointer-events-auto">
                            <div className="bg-white rounded-lg shadow-lg border border-black/5 p-0.5 flex flex-col overflow-hidden">
                                <button
                                    onClick={(e) => { e.stopPropagation(); const map = (window as any).leafletMap; if (map) map.zoomIn(); }}
                                    className="p-2 hover:bg-slate-50 text-[#1e1b4b] transition-colors border-b border-slate-100 active:bg-blue-50"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); const map = (window as any).leafletMap; if (map) map.zoomOut(); }}
                                    className="p-2 hover:bg-slate-50 text-[#1e1b4b] transition-colors active:bg-blue-50"
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Satellite Toggle - Mobile, on the map */}
                        <div className="absolute top-[-8%] right-3 z-[500] pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsSatellite(!isSatellite); }}
                                className={cn(
                                    "flex items-center gap-2 px-2.5 py-1.5 rounded-xl shadow-xl border border-black/5 transition-all active:scale-90",
                                    isSatellite ? "bg-[#1e1b4b] text-[#d4af37]" : "bg-white text-slate-700"
                                )}
                            >
                                <div
                                    className="w-8 h-8 rounded-md border border-white/20 shadow-sm bg-cover bg-center"
                                    style={{
                                        backgroundImage: isSatellite ? "url('https://a.tile.openstreetmap.org/11/658/1199.png')" : "url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/11/1199/658')"
                                    }}
                                />
                                <span className="text-[10px] font-black uppercase tracking-wider">{isSatellite ? 'Mapa' : 'Satélite'}</span>
                            </button>
                        </div>

                        {/* Sheet Body */}
                        <div className="flex-1 flex flex-col bg-white rounded-t-[28px] shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.15)] overflow-hidden pointer-events-auto">
                            {/* Drag Handle */}
                            <div className="flex justify-center pt-3 pb-2 shrink-0">
                                <div className="w-10 h-1 rounded-full bg-slate-300" />
                            </div>

                            {/* Header + Stats */}
                            <div className="px-5 pb-3 shrink-0">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <span className="text-[8px] font-black uppercase text-[#d4af37] tracking-[0.2em] leading-none">Gestão de Relacionamento</span>
                                        <h1 className="text-lg font-bold tracking-tight text-[#1e1b4b] flex items-center gap-1.5 leading-tight mt-0.5">
                                            <MapPin className="h-4 w-4 text-[#d4af37] shrink-0" />
                                            <span>Grupos</span>
                                            <span className="font-serif italic text-[#d4af37] font-normal text-xl">&</span>
                                            <span>Células</span>
                                        </h1>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="flex flex-col items-center px-2.5 py-1.5 bg-slate-50 rounded-xl">
                                            <span className="text-sm font-black text-marinho leading-none">{metrics.totalGroups}</span>
                                            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Grupos</span>
                                        </div>
                                        <div className="flex flex-col items-center px-2.5 py-1.5 bg-slate-50 rounded-xl">
                                            <span className="text-sm font-black text-gold leading-none">{metrics.totalMembers}</span>
                                            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Vidas</span>
                                        </div>
                                        <div className="flex flex-col items-center px-2.5 py-1.5 bg-slate-50 rounded-xl">
                                            <span className="text-sm font-black text-emerald-600 leading-none">{metrics.locations}</span>
                                            <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Áreas</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <input
                                        type="text"
                                        placeholder="Buscar grupos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-11 pl-11 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold text-[#1e1b4b] placeholder:text-slate-400 focus:ring-2 focus:ring-[#d4af37]/10 focus:border-[#d4af37]/20 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mx-6 shrink-0" />

                            {/* Results Header */}
                            <div className="px-5 py-2.5 shrink-0 flex items-center justify-between">
                                <span className="text-[9px] font-black text-[#1e1b4b] uppercase tracking-[0.2em]">Resultados ({filteredGroups.length})</span>
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>

                            {/* Scrollable Group Cards */}
                            <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-3">
                                {filteredGroups.length === 0 ? (
                                    <div className="py-10 text-center">
                                        <div className="w-14 h-14 bg-[#d4af37]/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-[#d4af37]/20">
                                            <UsersRound className="h-7 w-7 text-[#d4af37]" />
                                        </div>
                                        <p className="text-sm font-bold text-[#1e1b4b] mb-1">Crie seu primeiro grupo</p>
                                        <p className="text-[11px] text-slate-400 max-w-[250px] mx-auto">
                                            Grupos são células de conexão onde sua comunidade se encontra semanalmente.
                                        </p>
                                    </div>
                                ) : filteredGroups.map((group: Group) => (
                                    <motion.div
                                        key={group.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer"
                                        onClick={() => openEditModal(group)}
                                    >
                                        <div className="flex gap-3.5">
                                            <div className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-[#1e1b4b] to-[#2e2a6b] flex items-center justify-center text-[#d4af37] shadow-lg">
                                                <UsersRound className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <h3 className="text-sm font-bold text-[#1e1b4b] truncate pr-2">{group.name}</h3>
                                                    <span className="shrink-0 px-2 py-0.5 bg-[#1e1b4b]/5 rounded-lg text-[7px] font-black uppercase text-[#1e1b4b] tracking-widest">{group.category}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-semibold mb-1.5">
                                                    {group.leader} · {group.day && !['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(group.day)
                                                        ? new Date(group.day + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })
                                                        : group.day} {group.time?.slice(0, 5)}h
                                                </p>
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <MapPin className="h-3 w-3 text-[#d4af37]" />
                                                        <span className="text-[9px] font-bold truncate max-w-[140px]">{group.location}</span>
                                                    </div>
                                                    {group.leader_phone && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const phone = group.leader_phone?.replace(/\D/g, '') || '';
                                                                window.open(`https://wa.me/55${phone}`, '_blank');
                                                            }}
                                                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 active:bg-emerald-500 active:text-white border border-emerald-100 transition-all"
                                                        >
                                                            <MessageCircle className="h-3 w-3" />
                                                            <span className="text-[7px] font-black uppercase tracking-wider">WhatsApp</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* FAB - New Group (Admin only) */}
                            {canCreate && (
                                <button
                                    onClick={openNewGroupModal}
                                    className="absolute bottom-24 right-4 h-14 w-14 bg-[#1e1b4b] text-[#d4af37] rounded-2xl shadow-[0_8px_25px_-5px_rgba(30,27,75,0.5)] flex items-center justify-center active:scale-90 transition-all z-30"
                                >
                                    <Plus className="h-6 w-6" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ===== DESKTOP OVERLAY: Sidebar + Map Controls ===== */}
                    {/* Desktop Sidebar */}
                    <div className="hidden md:block absolute top-4 left-4 z-20 w-[380px] h-[calc(100%-2rem)] pointer-events-none">
                        <div className="h-full flex flex-col bg-white/80 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/40 pointer-events-auto overflow-hidden relative group">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#d4af37]/10 transition-colors duration-700" />

                            <div className="p-6 pb-5 flex flex-col gap-4 relative z-10">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-black uppercase text-[#d4af37] tracking-[0.2em] mb-0.5 ml-0.5 leading-none">Gestão de Relacionamento</span>
                                    <h1 className="text-xl font-bold tracking-tight text-[#1e1b4b] flex items-center gap-2 leading-none">
                                        <MapPin className="h-5 w-5 text-[#d4af37]" />
                                        <span>Grupos</span>
                                        <span className="font-serif italic text-[#d4af37] font-normal text-2xl">&</span>
                                        <span>Células</span>
                                    </h1>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col items-center py-2 bg-white/70 border border-white/60 rounded-xl shadow-sm">
                                        <span className="text-[14px] font-black text-marinho leading-none">{metrics.totalGroups}</span>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Grupos</span>
                                    </div>
                                    <div className="flex flex-col items-center py-2 bg-white/70 border border-white/60 rounded-xl shadow-sm">
                                        <span className="text-[14px] font-black text-gold leading-none">{metrics.totalMembers}</span>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Vidas</span>
                                    </div>
                                    <div className="flex flex-col items-center py-2 bg-white/70 border border-white/60 rounded-xl shadow-sm">
                                        <span className="text-[14px] font-black text-emerald-600 leading-none">{metrics.locations}</span>
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Áreas</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-300 group-focus-within:text-[#d4af37] transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Buscar grupos..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full h-12 pl-12 pr-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold text-[#1e1b4b] placeholder:text-slate-400 focus:ring-4 focus:ring-[#d4af37]/10 focus:border-[#d4af37]/20 transition-all outline-none shadow-sm"
                                        />
                                    </div>
                                    {canCreate && (
                                        <button
                                            onClick={openNewGroupModal}
                                            className="h-12 px-7 bg-[#1e1b4b] hover:bg-[#d4af37] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_8px_20px_-8px_rgba(30,27,75,0.4)] active:scale-95 group/btn flex items-center gap-2.5"
                                        >
                                            <Plus className="h-5 w-5 text-gold group-hover/btn:rotate-90 transition-transform" />
                                            Novo
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-gradient-to-r from-transparent via-marinho/10 to-transparent mx-8 mb-2" />

                            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                                <div className="px-8 py-4 shrink-0 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-[#1e1b4b] uppercase tracking-[0.2em]">Resultados Ativos ({filteredGroups.length})</span>
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                                <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-4 custom-scrollbar">
                                    {filteredGroups.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <div className="w-16 h-16 bg-[#d4af37]/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#d4af37]/20 shadow-sm">
                                                <UsersRound className="h-8 w-8 text-[#d4af37]" />
                                            </div>
                                            <p className="text-sm font-bold text-[#1e1b4b] mb-1">Crie seu primeiro grupo</p>
                                            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                                                Grupos são células de conexão onde sua comunidade se encontra semanalmente.
                                            </p>
                                        </div>
                                    ) : filteredGroups.map((group: Group) => (
                                        <div
                                            key={group.id}
                                            className="p-3.5 rounded-2xl bg-white/50 border border-white/60 hover:bg-white hover:border-[#d4af37]/30 hover:shadow-xl hover:shadow-[#1e1b4b]/5 transition-all duration-300 relative overflow-hidden group/card cursor-pointer"
                                            onClick={() => openEditModal(group)}
                                        >
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-[#d4af37]/5 rounded-full -mr-8 -mt-8 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                                            <div className="flex gap-4 relative z-10">
                                                <div className="shrink-0 h-10 w-10 rounded-xl bg-gradient-to-br from-[#1e1b4b] to-[#2e2a6b] flex items-center justify-center text-[#d4af37] shadow-lg group-hover/card:scale-110 transition-transform">
                                                    <UsersRound className="h-4.5 w-4.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <h3 className="text-sm font-bold text-[#1e1b4b] truncate group-hover/card:text-[#d4af37] transition-colors">{group.name}</h3>
                                                        <span className="shrink-0 px-2 py-0.5 bg-[#1e1b4b]/5 rounded-lg text-[7px] font-black uppercase text-[#1e1b4b] tracking-widest">{group.category}</span>
                                                    </div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1 flex items-center gap-2 leading-none">
                                                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                                                        Líder: <span className="text-[#1e1b4b]">{group.leader}</span>
                                                    </p>
                                                    <p className="text-[8px] font-black text-marinho uppercase tracking-widest mb-2 flex items-center gap-2 leading-none opacity-60">
                                                        {group.day && !['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].includes(group.day)
                                                            ? new Date(group.day + 'T12:00:00').toLocaleDateString('pt-BR')
                                                            : group.day} • {group.time?.slice(0, 5)}h
                                                    </p>
                                                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 text-slate-600 group-hover/card:text-marinho transition-colors">
                                                            <MapPin className="h-3 w-3 text-slate-400 group-hover/card:text-[#d4af37] transition-colors" />
                                                            <span className="text-[9px] font-bold uppercase tracking-wider truncate max-w-[110px]">{group.location}</span>
                                                        </div>
                                                        {group.leader_phone && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const phone = group.leader_phone?.replace(/\D/g, '') || '';
                                                                    window.open(`https://wa.me/55${phone}`, '_blank');
                                                                }}
                                                                className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-emerald-50/50 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-100/50 hover:border-emerald-500 transition-all group/wa"
                                                            >
                                                                <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center group-hover/wa:bg-white/20 transition-colors">
                                                                    <MessageCircle className="h-2.5 w-2.5" />
                                                                </div>
                                                                <span className="text-[8px] font-black uppercase tracking-widest">WhatsApp</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Map Overlays */}
                    {!showModal && !showDeleteModal && (
                        <>
                            {/* Legend - Desktop only */}
                            <div className="hidden md:block absolute top-4 left-[404px] z-[500] pointer-events-none">
                                <div className="bg-white/80 backdrop-blur-md border border-white shadow-lg rounded-2xl px-5 py-2 flex items-center gap-6 pointer-events-auto">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#ea4335] shadow-sm shadow-red-500/20" />
                                        <span className="text-[8px] font-black uppercase text-[#1e1b4b] tracking-[0.15em]">Grupo Ativo</span>
                                    </div>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.15em]">Em Expansão</span>
                                    </div>
                                </div>
                            </div>

                            {/* Zoom Controls - Desktop only */}
                            <div className="hidden md:flex absolute top-4 right-4 flex-col gap-2 z-[500] pointer-events-auto">
                                <div className="bg-white rounded-lg shadow-lg border border-black/5 p-1 flex flex-col overflow-hidden">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); const map = (window as any).leafletMap; if (map) map.zoomIn(); }}
                                        className="p-2 hover:bg-slate-50 text-[#1e1b4b] transition-colors border-b border-slate-100 active:bg-blue-50"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); const map = (window as any).leafletMap; if (map) map.zoomOut(); }}
                                        className="p-2 hover:bg-slate-50 text-[#1e1b4b] transition-colors active:bg-blue-50"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); const map = (window as any).leafletMap; if (map) { map.setView([-23.5505, -46.6333], 11); setIsSatellite(false); } }}
                                    className="bg-white p-2.5 rounded-lg shadow-lg border border-black/5 text-[#1e1b4b] hover:text-[#1a73e8] transition-all active:scale-95"
                                >
                                    <Navigation className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Satellite Toggle - Desktop only */}
                            <div className="hidden md:block absolute bottom-8 right-4 z-[500] pointer-events-auto">
                                <div className="bg-white p-1 rounded-xl shadow-2xl border border-black/5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setIsSatellite(!isSatellite); }}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 rounded-lg transition-all active:scale-90",
                                            isSatellite ? "bg-[#1e1b4b] text-[#d4af37]" : "hover:bg-slate-50 text-slate-700"
                                        )}
                                    >
                                        <div
                                            className="w-10 h-10 rounded-md border border-white/20 shadow-sm bg-cover bg-center"
                                            style={{
                                                backgroundImage: isSatellite ? "url('https://a.tile.openstreetmap.org/11/658/1199.png')" : "url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/11/1199/658')"
                                            }}
                                        />
                                        <span className="text-[11px] font-black uppercase tracking-wider px-1">{isSatellite ? 'Ver Mapa' : 'Ver Satélite'}</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="Excluir Grupo"
                footer={
                    <div className="flex items-center justify-between gap-4 w-full">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(false)}
                            className="h-12 px-7 rounded-2xl text-slate-400 hover:text-marinho hover:bg-slate-50 text-[10px] font-black uppercase tracking-widest transition-all w-full border border-slate-100"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmDeleteGroup}
                            className="h-12 px-7 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase transition-all shadow-sm w-full border border-red-100 hover:border-red-500"
                        >
                            <span>Sim, Excluir</span>
                        </button>
                    </div>
                }
            >
                <div className="p-4 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-2">
                        <Trash2 className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-[#1e1b4b]">Tem certeza?</h3>
                        <p className="text-sm text-slate-500 max-w-[280px] mx-auto leading-relaxed">
                            Esta ação não pode ser desfeita. Todos os dados deste grupo serão perdidos.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Lightbox Gallery Modal */}
            <AnimatePresence>
                {viewingGallery && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center"
                        onClick={() => setViewingGallery(null)}
                    >
                        {/* Wrapper for Controls to allow pointer events */}
                        <div className="absolute inset-0 pointer-events-none">
                            {/* Close Button */}
                            <motion.button
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                onClick={() => setViewingGallery(null)}
                                className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all pointer-events-auto z-50"
                            >
                                <X className="w-6 h-6" />
                            </motion.button>

                            {/* Navigation Arrows (Only if > 1 image) */}
                            {viewingGallery.urls.length > 1 && (
                                <>
                                    <button
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 disabled:opacity-30 transition-all hover:scale-110 active:scale-95 border-none cursor-pointer pointer-events-auto"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingGallery(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null);
                                        }}
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                    <button
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white z-50 disabled:opacity-30 transition-all hover:scale-110 active:scale-95 border-none cursor-pointer pointer-events-auto"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingGallery(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null);
                                        }}
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Main Image Display */}
                        <motion.div
                            key={viewingGallery.index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="relative w-full h-full flex flex-col items-center justify-center p-4 pb-20 pointer-events-none"
                        >
                            <img
                                src={viewingGallery.urls[viewingGallery.index]}
                                alt={`Foto ${viewingGallery.index + 1}`}
                                className="w-auto h-auto max-w-full max-h-full object-contain rounded-lg shadow-2xl pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </motion.div>

                        {/* Filmstrip Thumbnails */}
                        {viewingGallery.urls.length > 1 && (
                            <div className="absolute bottom-6 left-0 right-0 h-24 px-4 flex items-center justify-center z-50 pointer-events-none">
                                <div className="flex gap-2 p-2 bg-black/60 backdrop-blur-xl rounded-2xl overflow-x-auto max-w-full pointer-events-auto scrollbar-thin scrollbar-thumb-white/20 hover:scrollbar-thumb-white/40 border border-white/10">
                                    {viewingGallery.urls.map((url, i) => (
                                        <button
                                            key={i}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setViewingGallery(prev => prev ? { ...prev, index: i } : null);
                                            }}
                                            className={cn(
                                                "relative w-16 h-16 shrink-0 rounded-lg overflow-hidden transition-all border-2",
                                                i === viewingGallery.index
                                                    ? "border-[#d4af37] scale-105 shadow-lg shadow-[#d4af37]/20"
                                                    : "border-transparent opacity-50 hover:opacity-100 hover:scale-105"
                                            )}
                                        >
                                            <img src={url} className="w-full h-full object-cover" loading="lazy" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AnimatePresence>
        </Layout >
    );
}
