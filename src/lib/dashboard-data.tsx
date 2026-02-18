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

            // STRICT ISOLATION: If logged in user has no church_id, show NOTHING.
            if (profile?.id && !currentChurchId) {
                console.warn('[DASHBOARD] User logged in but has no church_id. Showing empty state.');
                setEvents([]);
                setNews([]);
                setChurchSettings(null);
                setInvites([]);
                setMySchedules([]);
                setMyRegistrations([]);
                setIsLoading(false);
                return;
            }

            const effectiveChurchId = currentChurchId;
            if (!effectiveChurchId) {
                setIsLoading(false);
                return;
            }

            const cacheKey = `dashboard-data-v5-${effectiveChurchId}`;
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Preparing Promises for Parallel Execution
            const publicPromises = [
                getEventsAfter(effectiveChurchId, now),
                getNews(effectiveChurchId),
                getChurchSettings(effectiveChurchId)
            ] as const;

            // Private data promises (conditionally added)
            let privatePromise: Promise<[any, any]> | null = null;
            if (profile?.id && profile?.church_id) {
                privatePromise = Promise.all([
                    getMemberSchedulesByUserId(profile.id, profile.church_id),
                    getMemberRegistrations(profile.id, profile.church_id)
                ]);
            }

            // EXECUTE ALL IN PARALLEL
            const [publicResults, privateResults] = await Promise.all([
                Promise.all(publicPromises),
                privatePromise
            ]);

            const [eventsResult, newsResult, churchResult] = publicResults;

            // Update Public Data State
            setEvents(eventsResult.data || []);
            setNews(newsResult.data || []);
            setChurchSettings(churchResult.data || null);

            // Cache public data (5 minutes TTL)
            setCached(cacheKey, {
                events: eventsResult.data || [],
                news: newsResult.data || [],
                churchSettings: churchResult.data || null
            }, 300000);

            // Update Private Data State
            if (privateResults) {
                const [schedulesRes, regsRes] = privateResults;
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
