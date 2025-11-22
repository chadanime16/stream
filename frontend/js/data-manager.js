// Data Manager - Loads and caches all JSON data in memory
const DataManager = {
    contentMap: new Map(),
    isLoaded: false,
    loadPromise: null,
    
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
    
    // Load all JSON files into memory
    async loadAllData() {
        if (this.isLoaded) return;
        if (this.loadPromise) return this.loadPromise;
        
        this.loadPromise = (async () => {
            console.log('📦 Loading content data into memory...');
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
        })();
        
        return this.loadPromise;
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
