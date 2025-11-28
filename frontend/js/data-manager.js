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
    
    // Advanced filter: by type, industry, and genre (case-insensitive)
    getByFilter(filters = {}, limit = 50) {
        const results = [];
        const { type, industry, genre, industries, genres } = filters;
        
        for (const item of this.contentMap.values()) {
            let match = true;
            
            // Check type (case-insensitive)
            if (type) {
                const itemType = (item.type || '').toLowerCase();
                if (itemType !== type.toLowerCase()) {
                    match = false;
                }
            }
            
            // Check industry (case-insensitive)
            if (industry) {
                const itemIndustry = (item.industry || '').toLowerCase();
                if (itemIndustry !== industry.toLowerCase()) {
                    match = false;
                }
            }
            
            // Check multiple industries (OR logic, case-insensitive)
            if (industries && industries.length > 0) {
                const itemIndustry = (item.industry || '').toLowerCase();
                const matchesAnyIndustry = industries.some(ind => 
                    itemIndustry === ind.toLowerCase()
                );
                if (!matchesAnyIndustry) {
                    match = false;
                }
            }
            
            // Check genre (item.genres is an array, case-insensitive)
            if (genre) {
                const itemGenres = Array.isArray(item.genres) ? item.genres : [];
                const hasGenre = itemGenres.some(g => 
                    (g || '').toLowerCase() === genre.toLowerCase()
                );
                if (!hasGenre) {
                    match = false;
                }
            }
            
            // Check multiple genres (OR logic, case-insensitive)
            if (genres && genres.length > 0) {
                const itemGenres = Array.isArray(item.genres) ? item.genres : [];
                const hasAnyGenre = genres.some(searchGenre => 
                    itemGenres.some(g => (g || '').toLowerCase() === searchGenre.toLowerCase())
                );
                if (!hasAnyGenre) {
                    match = false;
                }
            }
            
            if (match) {
                results.push(item);
                if (results.length >= limit) break;
            }
        }
        
        return results;
    },
    
    // Special filter for Cartoon (series with type cartoon OR movies with cartoon/animation genre)
    getCartoonContent(limit = 50) {
        const results = [];
        
        for (const item of this.contentMap.values()) {
            const itemType = (item.type || '').toLowerCase();
            const itemIndustry = (item.industry || '').toLowerCase();
            const itemGenres = Array.isArray(item.genres) ? item.genres : [];
            const hasCartoonGenre = itemGenres.some(g => {
                const genreLower = (g || '').toLowerCase();
                return genreLower.includes('cartoon') || 
                       genreLower.includes('animation') ||
                       genreLower === 'animated';
            });
            
            // Include if:
            // 1. Type is cartoon (series)
            // 2. Has cartoon/animation in genre (movies)
            // 3. Industry is Animation or Cartoon
            if (itemType === 'cartoon' || 
                itemIndustry === 'cartoon' ||
                (itemType === 'movie' && hasCartoonGenre)) {
                results.push(item);
                if (results.length >= limit) break;
            }
        }
        
        return results;
    },
    
    // Calculate similarity score between two strings (0-1)
    calculateSimilarity(str1, str2) {
        if (!str1 || !str2 || typeof str1 !== 'string' || typeof str2 !== 'string') return 0;
        
        const s1 = str1.toLowerCase();
        const s2 = str2.toLowerCase();
        
        // Exact match gets highest score
        if (s1 === s2) return 1.0;
        
        // Check if one contains the other
        if (s1.includes(s2) || s2.includes(s1)) return 0.9;
        
        // Calculate character matching score
        let matches = 0;
        let totalChars = Math.max(s1.length, s2.length);
        
        // Count matching characters in order
        let i = 0, j = 0;
        while (i < s1.length && j < s2.length) {
            if (s1[i] === s2[j]) {
                matches++;
                j++;
            }
            i++;
        }
        
        return matches / totalChars;
    },
    
    // Normalize search query (remove special chars, extra spaces)
    normalizeString(str) {
        if (!str || typeof str !== 'string') return '';
        return str.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .replace(/\s+/g, ' ')     // Normalize spaces
            .trim();
    },
    
    // Search content with fuzzy matching and scoring
    search(query, limit = 50) {
        if (!query || typeof query !== 'string') return [];
        
        const normalizedQuery = this.normalizeString(query);
        if (!normalizedQuery) return [];
        const queryWords = normalizedQuery.split(' ');
        const scoredResults = [];
        
        for (const item of this.contentMap.values()) {
            let score = 0;
            let maxScore = 0;
            
            // Search in title (highest priority)
            const title = this.normalizeString(item.title || '');
            const titleSimilarity = this.calculateSimilarity(title, normalizedQuery);
            if (titleSimilarity > 0.3) {
                score += titleSimilarity * 10; // Title matches get 10x weight
                maxScore = Math.max(maxScore, titleSimilarity);
            }
            
            // Check each query word against title
            queryWords.forEach(word => {
                if (title.includes(word)) {
                    score += 3;
                }
            });
            
            // Search in genres
            const genres = Array.isArray(item.genres) ? item.genres : [];
            genres.forEach(genre => {
                const genreNorm = this.normalizeString(genre);
                const genreSimilarity = this.calculateSimilarity(genreNorm, normalizedQuery);
                if (genreSimilarity > 0.5) {
                    score += genreSimilarity * 5; // Genre matches get 5x weight
                    maxScore = Math.max(maxScore, genreSimilarity);
                }
                
                // Check if genre contains any query word
                queryWords.forEach(word => {
                    if (genreNorm.includes(word)) {
                        score += 2;
                    }
                });
            });
            
            // Search in director
            if (item.director) {
                const director = this.normalizeString(item.director);
                const directorSimilarity = this.calculateSimilarity(director, normalizedQuery);
                if (directorSimilarity > 0.5) {
                    score += directorSimilarity * 4; // Director matches get 4x weight
                    maxScore = Math.max(maxScore, directorSimilarity);
                }
                
                queryWords.forEach(word => {
                    if (director.includes(word)) {
                        score += 2;
                    }
                });
            }
            
            // Search in cast
            const cast = Array.isArray(item.cast) ? item.cast : [];
            cast.forEach(actor => {
                const actorNorm = this.normalizeString(actor);
                const actorSimilarity = this.calculateSimilarity(actorNorm, normalizedQuery);
                if (actorSimilarity > 0.5) {
                    score += actorSimilarity * 3; // Cast matches get 3x weight
                    maxScore = Math.max(maxScore, actorSimilarity);
                }
                
                queryWords.forEach(word => {
                    if (actorNorm.includes(word)) {
                        score += 1.5;
                    }
                });
            });
            
            // Search in description (lower priority)
            const description = this.normalizeString(item.description || '');
            queryWords.forEach(word => {
                if (description.includes(word)) {
                    score += 0.5; // Description matches get lower weight
                }
            });
            
            // If there's any score, add to results
            if (score > 0) {
                scoredResults.push({
                    item: item,
                    score: score,
                    maxSimilarity: maxScore
                });
            }
        }
        
        // Sort by score (highest first), then by max similarity
        scoredResults.sort((a, b) => {
            if (Math.abs(b.score - a.score) > 0.1) {
                return b.score - a.score;
            }
            return b.maxSimilarity - a.maxSimilarity;
        });
        
        // Return top results
        return scoredResults.slice(0, limit).map(r => r.item);
    },
    
    // Get random content for hero
    getRandomForHero() {
        const allContent = this.getAll();
        if (allContent.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * Math.min(50, allContent.length));
        return allContent[randomIndex];
    }
};
