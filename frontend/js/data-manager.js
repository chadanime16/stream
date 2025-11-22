// Data Manager - Loads and caches all JSON data with localStorage
const DataManager = {
    contentMap: new Map(),
    isLoaded: false,
    loadPromise: null,
    STORAGE_KEY: 'chadcinema_content_cache',
    VERSION_KEY: 'chadcinema_cache_version',
    CURRENT_VERSION: '1.0', // Increment this when backend JSON changes
    
    // List of JSON files to load
    jsonFiles: [
        'anime.json',
        'korean.json',
        'animated.json',
        'bollywood.json',
        'cartoon-data.json',
        'gujarati.json',
        'hollywood.json',
        'horror.json',
        'romance.json',
        'series-data.json',
        'south.json'
    ],
    
    // Load from localStorage if available
    loadFromCache() {
        try {
            const cachedVersion = localStorage.getItem(this.VERSION_KEY);
            const cachedData = localStorage.getItem(this.STORAGE_KEY);
            
            if (cachedVersion === this.CURRENT_VERSION && cachedData) {
                console.log('📦 Loading content from cache...');
                const data = JSON.parse(cachedData);
                this.contentMap = new Map(data);
                this.isLoaded = true;
                console.log(`✅ Loaded ${this.contentMap.size} items from cache`);
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Cache load failed:', error);
        }
        return false;
    },
    
    // Save to localStorage
    saveToCache() {
        try {
            const data = Array.from(this.contentMap.entries());
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            localStorage.setItem(this.VERSION_KEY, this.CURRENT_VERSION);
            console.log('💾 Content cached successfully');
        } catch (error) {
            console.warn('⚠️ Cache save failed:', error);
        }
    },
    
    // Load all JSON files into memory
    async loadAllData() {
        if (this.isLoaded) return;
        if (this.loadPromise) return this.loadPromise;
        
        // Try to load from cache first
        if (this.loadFromCache()) {
            return;
        }
        
        this.loadPromise = (async () => {
            console.log('📦 Loading content data from server...');
            const startTime = Date.now();
            
            for (const filename of this.jsonFiles) {
                try {
                    const response = await fetch(`jsons/${filename}`);
                    if (!response.ok) {
                        console.warn(`⚠️ Failed to load ${filename}`);
                        continue;
                    }
                    
                    const data = await response.json();
                    
                    // Handle both array and object formats
                    const contentList = Array.isArray(data) ? data : (data.movies || []);
                    
                    // Store each content item by ID
                    contentList.forEach(item => {
                        if (item.id) {
                            this.contentMap.set(item.id, item);
                        }
                    });
                    
                    console.log(`✅ Loaded ${filename}: ${contentList.length} items`);
                } catch (error) {
                    console.error(`❌ Error loading ${filename}:`, error);
                }
            }
            
            this.isLoaded = true;
            const loadTime = Date.now() - startTime;
            console.log(`🎉 All content loaded! Total items: ${this.contentMap.size} (${loadTime}ms)`);
            
            // Save to cache
            this.saveToCache();
        })();
        
        return this.loadPromise;
    },
    
    // Clear cache (useful when backend JSON changes)
    clearCache() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.VERSION_KEY);
        console.log('🗑️ Cache cleared');
    },
    
    // Get content by ID
    getById(id) {
        return this.contentMap.get(id) || null;
    },
    
    // Get multiple contents by IDs
    getByIds(ids) {
        return ids.map(id => this.getById(id)).filter(item => item !== null);
    },
    
    // Get all content
    getAll() {
        return Array.from(this.contentMap.values());
    },
    
    // Alias for getAll (for consistency)
    getAllContent() {
        return this.getAll();
    },
    
    // Filter content by category/industry
    getByCategory(category, limit = 50) {
        const results = [];
        for (const item of this.contentMap.values()) {
            if (item.industry === category || item.type === category) {
                results.push(item);
                if (results.length >= limit) break;
            }
        }
        return results;
    },
    
    // Search content
    search(query) {
        if (!query) return [];
        
        const lowerQuery = query.toLowerCase();
        const results = [];
        
        for (const item of this.contentMap.values()) {
            const title = (item.title || '').toLowerCase();
            const description = (item.description || '').toLowerCase();
            const genres = (item.genres || []).join(' ').toLowerCase();
            
            if (title.includes(lowerQuery) || description.includes(lowerQuery) || genres.includes(lowerQuery)) {
                results.push(item);
                if (results.length >= 50) break;
            }
        }
        
        return results;
    },
    
    // Get random content for hero
    getRandomForHero() {
        const allContent = this.getAll();
        if (allContent.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * Math.min(50, allContent.length));
        return allContent[randomIndex];
    }
};
