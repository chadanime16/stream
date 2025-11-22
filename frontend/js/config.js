// API Configuration
const CONFIG = {
    API_BASE_URL: 'http://localhost:8001',
    API_ENDPOINTS: {
        // Auth
        LOGIN: '/api/auth/login',
        SIGNUP: '/api/auth/signup',
        VERIFY: '/api/auth/verify',
        
        // Content
        TRENDING: '/api/content/trending',
        BY_CATEGORY: '/api/content/by-category',
        DETAIL: '/api/content/detail',
        SEARCH: '/api/content/search',
        
        // User
        WATCHLIST: '/api/user/watchlist',
        WATCHLIST_ADD: '/api/user/watchlist/add',
        WATCHLIST_REMOVE: '/api/user/watchlist/remove',
        TRACK_VIEW: '/api/user/track-view',
        HISTORY: '/api/user/history',
        RECOMMENDATIONS: '/api/user/recommendations',
    },
    
    // Storage keys
    STORAGE_KEYS: {
        TOKEN: 'chadcinema_token',
        USER: 'chadcinema_user'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
