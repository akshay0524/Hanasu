// In-memory cache with TTL and concurrent request deduplication
const cache = new Map(); // key -> { data, expiresAt }
const inFlightRequests = new Map(); // key -> Promise

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

const getCacheKey = (conversationId, firstMessageId, lastMessageId, count) => {
    return `${conversationId}:${firstMessageId || 'start'}:${lastMessageId || 'end'}:${count}`;
};

const getFromCache = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
};

const setInCache = (key, data, ttlMs = DEFAULT_TTL_MS) => {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs,
    });
};

const withDeduplication = async (key, fetcher) => {
    const cached = getFromCache(key);
    if (cached) {
        return cached;
    }

    if (inFlightRequests.has(key)) {
        return inFlightRequests.get(key);
    }

    const promise = (async () => {
        try {
            const result = await fetcher();
            setInCache(key, result);
            return result;
        } finally {
            inFlightRequests.delete(key);
        }
    })();

    inFlightRequests.set(key, promise);
    return promise;
};

module.exports = {
    getCacheKey,
    getFromCache,
    setInCache,
    withDeduplication,
};
