// Data Manager - Loads and caches all JSON data with localStorage
const DataManager = {
    contentMap: new Map(),
    isLoaded: false,
    loadPromise: null,
    STORAGE_KEY: 'chadcinema_content_cache',
    VERSION_KEY: 'chadcinema_cache_version',
    CURRENT_VERSION: '1.2', // Increment this when backend JSON changes
    
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
    // Filter content by category/industry - specifically for Anime section
    getByCategory(category, limit = 50) {
        const results = [];
        const categoryLower = (category || '').toLowerCase();
        
        for (const item of this.contentMap.values()) {
            const itemIndustry = (item.industry || '').toLowerCase();
            const itemType = (item.type || '').toLowerCase();
            
            if (itemIndustry === categoryLower || itemType === categoryLower) {
                results.push(item);
                if (results.length >= limit) break;
            }
        }
        return results;
    },
    
    // Advanced filter: by type, industry, and genre (case-insensitive)
    getByFilter(filters = {}, limit = 50) {
        const results = [];
        const { type, industry, genre, industries, genres, excludeAnimeCartoon = true } = filters;
        
        for (const item of this.contentMap.values()) {
            let match = true;
            
            const itemType = (item.type || '').toLowerCase();
            const itemIndustry = (item.industry || '').toLowerCase();
            const itemGenres = Array.isArray(item.genres) ? item.genres : [];
            const itemGenresLower = itemGenres.map(g => (g || '').toLowerCase());
            
            // Exclude anime and cartoon content from regular filters (unless specifically requesting them)
            if (excludeAnimeCartoon) {
                // Skip if type is anime or cartoon
                if (itemType === 'anime' || itemType === 'cartoon') {
                    continue;
                }
                // Skip if industry is Animation (for cartoons/animated movies in other sections)
                // But allow if we're specifically filtering for Animation industry
                if (itemIndustry === 'animation' && industry?.toLowerCase() !== 'animation') {
                    continue;
                }
                // Skip if has Cartoon genre (unless specifically looking for it)
                if (itemGenresLower.includes('cartoon') && genre?.toLowerCase() !== 'cartoon') {
                    continue;
                }
            }
            
            // Check type (case-insensitive)
            if (type) {
                if (itemType !== type.toLowerCase()) {
                    match = false;
                }
            }
            
            // Check industry (case-insensitive)
            if (industry) {
                if (itemIndustry !== industry.toLowerCase()) {
                    match = false;
                }
            }
            
            // Check multiple industries (OR logic, case-insensitive)
            if (industries && industries.length > 0) {
                const matchesAnyIndustry = industries.some(ind => 
                    itemIndustry === ind.toLowerCase()
                );
                if (!matchesAnyIndustry) {
                    match = false;
                }
            }
            
            // Check genre (item.genres is an array, case-insensitive)
            if (genre) {
                const hasGenre = itemGenresLower.some(g => 
                    g === genre.toLowerCase()
                );
                if (!hasGenre) {
                    match = false;
                }
            }
            
            // Check multiple genres (OR logic, case-insensitive)
            if (genres && genres.length > 0) {
                const hasAnyGenre = genres.some(searchGenre => 
                    itemGenresLower.some(g => g === searchGenre.toLowerCase())
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
    
    // Special filter for Cartoon (type = cartoon OR genre = Cartoon) - OR condition
    getCartoonContent(filters = {}, limit = 50) {
        const results = [];
        const { type, genre } = filters;
        
        for (const item of this.contentMap.values()) {
            const itemType = (item.type || '').toLowerCase();
            const itemGenres = Array.isArray(item.genres) ? item.genres : [];
            
            let match = false;
            
            // OR condition: match if type = cartoon OR genre contains Cartoon
            if (type) {
                if (itemType === type.toLowerCase()) {
                    match = true;
                }
            }
            
            if (genre && !match) {
                const hasGenre = itemGenres.some(g => 
                    (g || '').toLowerCase() === genre.toLowerCase()
                );
                if (hasGenre) {
                    match = true;
                }
            }
            
            if (match) {
                results.push(item);
                if (results.length >= limit) break;
            }
        }
        
        return results;
    },
    
    // Advanced filter with OR logic for genre, industry, and type
    // Supports: orFilters = { types: [], genres: [], industries: [] }
    getByOrFilter(filters = {}, limit = 50) {
        const results = [];
        const { types, genres, industries } = filters;
        
        for (const item of this.contentMap.values()) {
            const itemType = (item.type || '').toLowerCase();
            const itemIndustry = (item.industry || '').toLowerCase();
            const itemGenres = Array.isArray(item.genres) ? item.genres : [];
            
            let match = false;
            
            // Check types (OR logic)
            if (types && types.length > 0) {
                const matchesType = types.some(t => 
                    itemType === t.toLowerCase()
                );
                if (matchesType) match = true;
            }
            
            // Check genres (OR logic)
            if (genres && genres.length > 0 && !match) {
                const matchesGenre = genres.some(searchGenre => 
                    itemGenres.some(g => (g || '').toLowerCase() === searchGenre.toLowerCase())
                );
                if (matchesGenre) match = true;
            }
            
            // Check industries (OR logic)
            if (industries && industries.length > 0 && !match) {
                const matchesIndustry = industries.some(ind => 
                    itemIndustry === ind.toLowerCase()
                );
                if (matchesIndustry) match = true;
            }
            
            if (match) {
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
    
    // Search content with strict relevance matching
    // Only returns results where the query matches title, cast name, director name, or genre
    search(query, limit = 50) {
        if (!query || typeof query !== 'string') return [];
        
        const normalizedQuery = this.normalizeString(query);
        if (!normalizedQuery || normalizedQuery.length < 2) return [];
        
        const queryWords = normalizedQuery.split(' ').filter(w => w.length >= 2);
        if (queryWords.length === 0) return [];
        
        const scoredResults = [];
        
        for (const item of this.contentMap.values()) {
            let score = 0;
            let matchReason = null; // Track why this item matched
            
            // Search in title (highest priority)
            const title = this.normalizeString(item.title || '');
            
            // Exact title match
            if (title === normalizedQuery) {
                score = 100;
                matchReason = 'exact_title';
            } 
            // Full query is contained in title (e.g. "stranger things" in "Stranger Things Season 1")
            else if (title.includes(normalizedQuery)) {
                score = 80;
                matchReason = 'title_contains_query';
            }
            // Check if ALL query words appear in title
            else {
                const allWordsInTitle = queryWords.every(word => title.includes(word));
                if (allWordsInTitle && queryWords.length > 0) {
                    score = 60;
                    matchReason = 'all_words_in_title';
                }
            }
            
            // If no title match, check cast (for actor name searches)
            if (!matchReason) {
                const cast = Array.isArray(item.cast) ? item.cast : [];
                for (const actor of cast) {
                    const actorNorm = this.normalizeString(actor);
                    // Full query matches actor name or vice versa
                    if (actorNorm.includes(normalizedQuery) || normalizedQuery.includes(actorNorm)) {
                        score = 40;
                        matchReason = 'cast_match';
                        break;
                    }
                    // All query words appear in actor name
                    const allWordsInActor = queryWords.every(word => actorNorm.includes(word));
                    if (allWordsInActor && queryWords.length > 0) {
                        score = 35;
                        matchReason = 'cast_words_match';
                        break;
                    }
                }
            }
            
            // If no cast match, check director
            if (!matchReason && item.director) {
                const director = this.normalizeString(
                    Array.isArray(item.director) ? item.director.join(' ') : item.director
                );
                if (director.includes(normalizedQuery) || normalizedQuery.includes(director)) {
                    score = 35;
                    matchReason = 'director_match';
                }
                // All query words in director name
                const allWordsInDirector = queryWords.every(word => director.includes(word));
                if (allWordsInDirector && queryWords.length > 0) {
                    score = 30;
                    matchReason = 'director_words_match';
                }
            }
            
            // If no person match, check genre (exact match only)
            if (!matchReason) {
                const genres = Array.isArray(item.genres) ? item.genres : [];
                for (const genre of genres) {
                    const genreNorm = this.normalizeString(genre);
                    // Query exactly matches a genre
                    if (genreNorm === normalizedQuery) {
                        score = 25;
                        matchReason = 'genre_exact';
                        break;
                    }
                }
            }
            
            // Only include if we found a valid match reason
            if (matchReason && score > 0) {
                scoredResults.push({
                    item: item,
                    score: score,
                    reason: matchReason
                });
            }
        }
        
        // Sort by score (highest first)
        scoredResults.sort((a, b) => b.score - a.score);
        
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
