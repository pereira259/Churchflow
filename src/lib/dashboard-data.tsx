import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './auth';
import { getEventsAfter, Event, getNews, News, getMemberIdByUserId, getMemberSchedulesById, getMemberRegistrationsById, getChurchSettings } from './supabase-queries';
import { getCached, getCachedFull, setCached } from './cache-manager';



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

    const [events, setEvents] = useState<Event[]>([]);
    const [news, setNews] = useState<News[]>([]);
    const [invites, setInvites] = useState<any[]>([]);
    const [mySchedules, setMySchedules] = useState<any[]>([]);
    const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
    const [churchSettings, setChurchSettings] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // --- OPTIMISTIC HYDRATION ---
    // Try to find ANY cached data in localStorage to show immediately
    // even before auth is confirmed. This creates the "Instant App" feel.
    useEffect(() => {
        const tryOptimisticHydration = async () => {
            // We don't know the exact church ID yet, but we can look for the last used key
            // or iterate keys. For simplicity, if we have a stored profile in cache, prompt from there.
            try {
                // Try to find a cache key pattern
                const keys = Object.keys(localStorage);
                const dashboardKey = keys.find(k => k.startsWith('dashboard-data-v5-'));

                if (dashboardKey) {
                    const cached = await getCachedFull<CachedDashboardData>(dashboardKey);
                    if (cached) {
                        console.log('[DASHBOARD] ⚡ Optimistic Hydration from:', dashboardKey);
                        if (cached.events?.length > 0) setEvents(cached.events);
                        if (cached.news?.length > 0) setNews(cached.news);
                        if (cached.churchSettings) setChurchSettings(cached.churchSettings);
                        setIsLoading(false); // Show UI immediately!
                    }
                }
            } catch (e) {
                // Ignore errors in optimistic attempt
            }
        };

        tryOptimisticHydration();
    }, []); // Run ONCE on mount

    const fetchAllData = useCallback(async (silent = false) => {
        if (authLoading) return;

        // --- 1. PRE-CHECK STALE DATA (Prevent Skeleton Flicker) ---
        // If we already have data in RAM, skip loading state
        const hasRamData = events.length > 0 || news.length > 0;
        let showLoading = !silent && !hasRamData;

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

            // --- 2. CACHE HYDRATION (Instant Load) ---
            // Try SYNC cache first (localStorage), then fall back to async (IndexedDB)
            if (showLoading) {
                // Fast path: sync localStorage (no await needed)
                const syncCached = getCached<CachedDashboardData>(cacheKey);
                if (syncCached) {
                    if (syncCached.events?.length > 0) setEvents(syncCached.events);
                    if (syncCached.news?.length > 0) setNews(syncCached.news);
                    if (syncCached.churchSettings) setChurchSettings(syncCached.churchSettings);
                    showLoading = false;
                    setIsLoading(false);
                } else {
                    // Slow path: async IndexedDB (has images, more complete)
                    const asyncCached = await getCachedFull<CachedDashboardData>(cacheKey);
                    if (asyncCached) {
                        if (asyncCached.events?.length > 0) setEvents(asyncCached.events);
                        if (asyncCached.news?.length > 0) setNews(asyncCached.news);
                        if (asyncCached.churchSettings) setChurchSettings(asyncCached.churchSettings);
                        showLoading = false;
                        setIsLoading(false);
                    }
                }
            }

            // Only set loading if really necessary (no RAM data AND no Cache data)
            if (showLoading) setIsLoading(true);

            // --- 3. NETWORK REVALIDATION ---
            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Preparing Promises for Parallel Execution
            const publicPromises = [
                getEventsAfter(effectiveChurchId, now),
                getNews(effectiveChurchId),
                getChurchSettings(effectiveChurchId)
            ] as const;

            // Private data: lookup member_id ONCE, then fetch both in parallel
            let privatePromise: Promise<[any, any] | null> | null = null;
            if (profile?.id && profile?.church_id) {
                privatePromise = getMemberIdByUserId(profile.id, profile.church_id)
                    .then(memberId => {
                        if (!memberId) return null;
                        return Promise.all([
                            getMemberSchedulesById(memberId),
                            getMemberRegistrationsById(memberId)
                        ]);
                    });
            }

            // EXECUTE ALL IN PARALLEL
            const [publicResults, privateResults] = await Promise.all([
                Promise.all(publicPromises),
                privatePromise
            ]);

            const [eventsResult, newsResult, churchResult] = publicResults;

            // Update Public Data State
            if (JSON.stringify(eventsResult.data) !== JSON.stringify(events)) setEvents(eventsResult.data || []);
            if (JSON.stringify(newsResult.data) !== JSON.stringify(news)) setNews(newsResult.data || []);
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
    }, [profile?.id, authLoading, events, news]); // Added events/news deps for RAM check

    // Fetch data when profile becomes available (Login)
    useEffect(() => {
        fetchAllData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
