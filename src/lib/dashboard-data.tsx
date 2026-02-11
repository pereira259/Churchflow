import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth';
import { getEventsAfter, Event, getNews, News, getMemberSchedulesByUserId, getMemberRegistrations, getChurchSettings } from './supabase-queries';
import { getCachedFull, setCached } from './cache-manager';



interface DashboardData {
    events: Event[];
    news: News[];
    invites: any[];
    mySchedules: any[];
    myRegistrations: any[];
    churchSettings: any;
    isLoading: boolean;
    refetch: () => Promise<void>;
}

interface CachedDashboardData {
    events: Event[];
    news: News[];
    churchSettings?: any;
}

const DashboardDataContext = createContext<DashboardData | undefined>(undefined);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
    const { profile, loading: authLoading } = useAuth();

    // 1. SYNC CACHE (Text/Metadata)
    // We defer to effect since we need profile to know the key

    // 2. ASYNC CACHE (Images) - Fast Hydration
    useEffect(() => {
        if (authLoading) return;

        const hydrateImages = async () => {
            const currentChurchId = profile?.church_id;

            // Strict check for hydration too
            if (profile?.id && !currentChurchId) return;

            const effectiveChurchId = currentChurchId;
            if (!effectiveChurchId) return;

            const cacheKey = `dashboard-data-v5-${effectiveChurchId}`;

            const fullData = await getCachedFull<CachedDashboardData>(cacheKey);
            if (fullData) {
                if (fullData.events) setEvents(fullData.events);
                if (fullData.news) setNews(fullData.news);
                if (fullData.churchSettings) setChurchSettings(fullData.churchSettings);
            }
        };
        hydrateImages();
    }, [profile?.church_id]);

    const [events, setEvents] = useState<Event[]>([]);
    const [news, setNews] = useState<News[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [mySchedules, setMySchedules] = useState<any[]>([]);
    const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
    const [churchSettings, setChurchSettings] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = useCallback(async (silent = false) => {
        if (authLoading) return;
        if (!silent) setIsLoading(true);

        try {
            const currentChurchId = profile?.church_id;

            // Should not fetch if no church (unless we want a public view, but user asked for strict isolation)
            // If we fall back to DEFAULT_CHURCH_ID, we leak default events.
            // Let's fallback ONLY if explicitly intended, or handle empty state.
            // For this user: strict isolation.

            if (!currentChurchId && profile?.id) {
                // User logged in but no church? Return empty or prompt to join.
                setEvents([]);
                setNews([]);
                setChurchSettings(null);
                setIsLoading(false);
                return;
            }

            // (Redundant check removed)

            // STRICT ISOLATION: If logged in user has no church_id, show NOTHING.
            // Do NOT fallback to DEFAULT_CHURCH_ID as that leaks "Santa Ceia" etc.
            if (profile?.id && !currentChurchId) {
                console.warn('[DASHBOARD] User logged in but has no church_id. Showing empty state.');
                setEvents([]);
                setNews([]);
                setChurchSettings(null);
                setIsLoading(false);
                return;
            }

            // STRICT: Only fetch if user has a church
            const effectiveChurchId = currentChurchId;

            if (!effectiveChurchId) {
                setIsLoading(false);
                return;
            }

            const cacheKey = `dashboard-data-v5-${effectiveChurchId}`;

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Fetch public data
            const [eventsResult, newsResult, churchResult] = await Promise.all([
                getEventsAfter(effectiveChurchId, now),
                getNews(effectiveChurchId),
                getChurchSettings(effectiveChurchId)
            ]);

            // Update React state with fetched data
            setEvents(eventsResult.data || []);
            setNews(newsResult.data || []);
            setChurchSettings(churchResult.data || null);

            // Cache public data (5 minutes TTL)
            setCached(cacheKey, {
                events: eventsResult.data || [],
                news: newsResult.data || [],
                churchSettings: churchResult.data || null
            }, 300000);

            // Fetch private data if profile is available
            if (profile?.id && profile?.church_id) {
                const [schedulesRes, regsRes] = await Promise.all([
                    getMemberSchedulesByUserId(profile.id, profile.church_id),
                    getMemberRegistrations(profile.id, profile.church_id)
                ]);

                const schedulesData = schedulesRes.data || [];
                const pending = schedulesData.filter((s: any) => s.status === 'pendente');
                const confirmed = schedulesData.filter((s: any) => s.status === 'confirmado');

                setInvites(pending);
                setMySchedules(confirmed);
                setMyRegistrations(regsRes.data || []);
            }
        } catch (error) {
            console.error('[DASHBOARD] Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [profile?.id, authLoading]);

    // Fetch data when profile becomes available (Login)
    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    return (
        <DashboardDataContext.Provider value={{
            events,
            news,
            invites,
            mySchedules,
            myRegistrations,
            churchSettings,
            isLoading,
            refetch: fetchAllData
        }}>
            {children}
        </DashboardDataContext.Provider>
    );
}

export function useDashboardData() {
    const context = useContext(DashboardDataContext);
    if (context === undefined) {
        throw new Error('useDashboardData must be used within DashboardDataProvider');
    }
    return context;
}
