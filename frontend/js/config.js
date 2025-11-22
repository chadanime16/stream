// API Configuration
// ⚠️ IMPORTANT: Change API_BASE_URL to your backend URL when deploying
// Examples:
//   - Local development: 'http://localhost:8001'
//   - Production: 'https://your-backend-domain.com'
//   - Custom port: 'http://your-domain.com:8001'
const CONFIG = {
    API_BASE_URL: 'https://vscode-69da0571-fdf7-46a7-b7fd-1fc995b88928.preview.emergentagent.com/proxy/8001',  // 👈 CHANGE THIS to your backend URL
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
