// API Helper Functions
const API = {
    // Get auth token
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    // Get auth headers
    getHeaders(includeAuth = false) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    },
    
    // Make API request
    async request(endpoint, options = {}) {
        try {
            const url = `${CONFIG.API_BASE_URL}${endpoint}`;
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.getHeaders(options.auth),
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Request failed' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Auth APIs
    auth: {
        async login(email, pin) {
            return API.request(CONFIG.API_ENDPOINTS.LOGIN, {
                method: 'POST',
                body: JSON.stringify({ email, pin })
            });
        },
        
        async signup(username, email, pin, profile_image) {
            return API.request(CONFIG.API_ENDPOINTS.SIGNUP, {
                method: 'POST',
                body: JSON.stringify({ username, email, pin, profile_image })
            });
        },
        
        async verify() {
            return API.request(CONFIG.API_ENDPOINTS.VERIFY, {
                auth: true
            });
        }
    },
    
    // Content APIs
    content: {
        async getTrending(limit = 20) {
            return API.request(`${CONFIG.API_ENDPOINTS.TRENDING}?limit=${limit}`);
        },
        
        async getByCategory(category, limit = 50) {
            return API.request(`${CONFIG.API_ENDPOINTS.BY_CATEGORY}/${category}?limit=${limit}`);
        },
        
        async getDetail(contentId) {
            return API.request(`${CONFIG.API_ENDPOINTS.DETAIL}/${contentId}`);
        },
        
        async search(query) {
            return API.request(`${CONFIG.API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`);
        }
    },
    
    // User APIs
    user: {
        async getWatchlist() {
            return API.request(CONFIG.API_ENDPOINTS.WATCHLIST, {
                auth: true
            });
        },
        
        async addToWatchlist(contentId) {
            return API.request(CONFIG.API_ENDPOINTS.WATCHLIST_ADD, {
                method: 'POST',
                auth: true,
                body: JSON.stringify({ contentId })
            });
        },
        
        async removeFromWatchlist(contentId) {
            return API.request(CONFIG.API_ENDPOINTS.WATCHLIST_REMOVE, {
                method: 'POST',
                auth: true,
                body: JSON.stringify({ contentId })
            });
        },
        
        async trackView(contentId, watchTime = 0, progress = 0) {
            return API.request(CONFIG.API_ENDPOINTS.TRACK_VIEW, {
                method: 'POST',
                auth: true,
                body: JSON.stringify({ contentId, watchTime, progress })
            });
        },
        
        async getHistory() {
            return API.request(CONFIG.API_ENDPOINTS.HISTORY, {
                auth: true
            });
        },
        
        async getRecommendations() {
            return API.request(CONFIG.API_ENDPOINTS.RECOMMENDATIONS, {
                auth: true
            });
        }
    }
};
