// Cache Manager - Dual Layer (SessionStorage + IndexedDB)
// Provides instant page loads (Text) + Fast Image Loading

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

const CACHE_PREFIX = 'churchflow_cache_';
const DB_NAME = 'ChurchFlowImagesDB';
const STORE_NAME = 'images_store';

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

const idbSet = async (key: string, val: any) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(val, key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

const idbGet = async (key: string) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

/**
 * Get cached data synchronously (Metadata/Text only)
 */
export function getCached<T>(key: string): T | null {
    try {
        const cached = localStorage.getItem(CACHE_PREFIX + key);
        if (!cached) return null;

        const entry: CacheEntry<T> = JSON.parse(cached);
        // Stale-While-Revalidate: Always return data if it exists, ignoring TTL for display
        return entry.data;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

/**
 * Get full cached data (Including Images) asynchronously
 */
export async function getCachedFull<T>(key: string): Promise<T | null> {
    try {
        const val = await idbGet(CACHE_PREFIX + key);
        if (!val) return null;

        const entry: CacheEntry<T> = val as CacheEntry<T>;
        const now = Date.now();

        if (now - entry.timestamp > entry.ttl) {
            return null;
        }
        return entry.data;
    } catch (err) {
        console.warn('IDB Read Error:', err);
        return null;
    }
}

/**
 * Save data to cache (Dual Layer Strategy)
 */
export function setCached<T>(key: string, data: T, ttl: number = 300000): void {
    const timestamp = Date.now();
    const entry: CacheEntry<T> = { data, timestamp, ttl };

    // 1. Save Full Data (Images) to IndexedDB (Async, No blocking)
    idbSet(CACHE_PREFIX + key, entry).catch(err => console.error('IDB Write Error:', err));

    // 2. Save Stripped Data (Text) to SessionSession (Sync, Instant)
    try {
        // Always strip large fields for SessionStorage to be safe and fast
        const strippedData = stripLargeFields(data);
        const strippedEntry: CacheEntry<T> = {
            data: strippedData,
            timestamp,
            ttl
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(strippedEntry));
    } catch (error) {
        console.warn(`[Cache] localStorage fail for ${key}, but IDB should have saved it.`);
    }
}

/**
 * Helper to remove base64 images from objects to save space
 */
function stripLargeFields(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(stripLargeFields);
    } else if (typeof obj === 'object' && obj !== null) {
        const newObj: any = {};
        for (const key in obj) {
            // Skip common image fields
            if (key === 'image_url' || key === 'photo_url' || key === 'gallery_urls') {
                continue;
            }
            newObj[key] = stripLargeFields(obj[key]);
        }
        return newObj;
    }
    return obj;
}



/**
 * Invalidate specific cache
 */
export function invalidateCache(key: string): void {
    localStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Clear all churchflow caches
 */
export function clearAllCaches(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
            localStorage.removeItem(key);
        }
    });
}
