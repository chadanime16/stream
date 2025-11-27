// Main JavaScript for Homepage
 
// =============================================================================
// CONFIGURABLE HERO CAROUSEL IDS (Fallback - can be overridden by API)
// Set the IDs of content items to display in the hero carousel
// These are used as fallback if the API returns no carousel items
// =============================================================================
const HERO_CAROUSEL_IDS = [
    'tt1659337',    // The Perks of Being a Wallflower
    'tt27543578',   // Good Fortune
    'tt1312221'     // Frankenstein
];

// Carousel configuration
const CAROUSEL_CONFIG = {
    autoSlideInterval: 6000,  // Auto-slide every 6 seconds (set to 0 to disable)
    transitionDuration: 600   // Transition duration in milliseconds
};

// Day names mapping
const DAY_NAMES = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday'
};

const DAY_FULL_NAMES = {
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday'
};

// =============================================================================

// Wait for DataManager to load
let dataLoaded = false;
let searchTimeout = null;

// Carousel state
let carouselState = {
    currentSlide: 0,
    totalSlides: 0,
    autoSlideTimer: null,
    isTransitioning: false
};

// Daily picks state
let dailyPicksState = {
    currentDay: DAY_NAMES[new Date().getDay()],
    weeklyData: null
};

// Create content card HTML (horizontal/landscape image)
function createContentCard(content) {
    const card = document.createElement('div');
    card.className = 'content-card';
    card.onclick = () => {
        window.location.href = `detail.html?id=${content.id}`;
    };
    
    const genres = Array.isArray(content.genres) ? content.genres.slice(0, 2) : [];
    const genreTags = genres.map(g => `<span class="genre-tag">${g}</span>`).join('');
    
    card.innerHTML = `
        ${content.rating ? `<div class="content-card-rating">⭐ ${content.rating}</div>` : ''}
        <img src="${content.image || 'https://via.placeholder.com/350x200?text=No+Image'}" 
             alt="${content.title}" 
             class="content-card-image" 
             onerror="this.src='https://via.placeholder.com/350x200?text=No+Image'">
        <div class="content-card-info">
            <h4 class="content-card-title">${content.title}</h4>
            <div class="content-card-meta">
                ${content.year ? `<span>${content.year}</span>` : ''}
                ${content.duration ? `<span>${content.duration}</span>` : ''}
            </div>
            ${genreTags ? `<div class="content-card-genres">${genreTags}</div>` : ''}
        </div>
    `;
    
    return card;
}

// Add navigation arrows to slider
function addSliderNavigation(sliderId) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    
    const row = slider.closest('.content-row');
    if (!row) return;
    
    // Check if arrows already exist
    if (row.querySelector('.slider-nav')) return;
    
    // Create prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slider-nav prev';
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
    prevBtn.onclick = () => {
        slider.scrollBy({ left: -400, behavior: 'smooth' });
    };
    
    // Create next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slider-nav next';
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
    nextBtn.onclick = () => {
        slider.scrollBy({ left: 400, behavior: 'smooth' });
    };
    
    row.appendChild(prevBtn);
    row.appendChild(nextBtn);
}

// Load content into slider
function loadSlider(sliderId, contents) {
    const slider = document.getElementById(sliderId);
    if (!slider) return;
    
    slider.innerHTML = '';
    
    if (!contents || contents.length === 0) {
        slider.innerHTML = '<div class="slider-loading">No content available</div>';
        return;
    }
    
    contents.forEach(content => {
        slider.appendChild(createContentCard(content));
    });
    
    // Add navigation arrows
    addSliderNavigation(sliderId);
}

// Set hero content (shared function)
function setHeroContent(hero) {
    if (!hero) return;
    
    const heroSection = document.getElementById('heroSection');
    const heroTitle = document.getElementById('heroTitle');
    const heroDescription = document.getElementById('heroDescription');
    const heroPlayBtn = document.getElementById('heroPlayBtn');
    const heroWatchlistBtn = document.getElementById('heroWatchlistBtn');
    
    // Set background
    if (hero.image) {
        heroSection.style.backgroundImage = `url(${hero.image})`;
    }
    
    // Set content
    heroTitle.textContent = hero.title;
    heroDescription.textContent = hero.description || 'Watch now on Chadcinema';
    
    // Play button
    heroPlayBtn.onclick = () => {
        window.location.href = `detail.html?id=${hero.id}`;
    };
    
    // Watchlist button
    heroWatchlistBtn.onclick = async () => {
        if (!Auth.isLoggedIn()) {
            document.getElementById('authModal').classList.add('show');
            return;
        }
        
        try {
            await API.user.addToWatchlist(hero.id);
            showToast('Added to watchlist', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };
}

// Create a single hero slide HTML
function createHeroSlide(content) {
    const slide = document.createElement('div');
    slide.className = 'hero-slide';
    slide.setAttribute('data-testid', `hero-slide-${content.id}`);
    
    if (content.image) {
        slide.style.backgroundImage = `url(${content.image})`;
    }
    
    slide.innerHTML = `
        <div class="hero-slide-overlay"></div>
        <div class="hero-slide-content">
            <h2 class="hero-slide-title">${content.title}</h2>
            <p class="hero-slide-description">${content.description || 'Watch now on Chadcinema'}</p>
            <div class="hero-slide-buttons">
                <button class="btn btn-primary hero-play-btn" data-id="${content.id}" data-testid="hero-play-btn-${content.id}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Play Now
                </button>
                <button class="btn btn-secondary hero-watchlist-btn" data-id="${content.id}" data-testid="hero-watchlist-btn-${content.id}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"></path>
                    </svg>
                    My List
                </button>
            </div>
        </div>
    `;
    
    return slide;
}

// Create carousel indicator dot
function createIndicatorDot(index) {
    const dot = document.createElement('button');
    dot.className = 'hero-indicator' + (index === 0 ? ' active' : '');
    dot.setAttribute('data-testid', `hero-indicator-${index}`);
    dot.setAttribute('data-index', index);
    dot.setAttribute('aria-label', `Go to slide ${index + 1}`);
    return dot;
}

// Navigate to specific slide
function goToSlide(index) {
    if (carouselState.isTransitioning) return;
    if (index < 0) index = carouselState.totalSlides - 1;
    if (index >= carouselState.totalSlides) index = 0;
    
    carouselState.isTransitioning = true;
    carouselState.currentSlide = index;
    
    const slidesContainer = document.getElementById('heroSlides');
    if (slidesContainer) {
        slidesContainer.style.transform = `translateX(-${index * 100}%)`;
    }
    
    // Update indicators
    const indicators = document.querySelectorAll('.hero-indicator');
    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
    });
    
    // Reset auto-slide timer
    resetAutoSlideTimer();
    
    // Reset transitioning flag after animation completes
    setTimeout(() => {
        carouselState.isTransitioning = false;
    }, CAROUSEL_CONFIG.transitionDuration);
}

// Go to next slide
function nextSlide() {
    goToSlide(carouselState.currentSlide + 1);
}

// Go to previous slide
function prevSlide() {
    goToSlide(carouselState.currentSlide - 1);
}

// Start auto-slide timer
function startAutoSlideTimer() {
    if (CAROUSEL_CONFIG.autoSlideInterval > 0 && carouselState.totalSlides > 1) {
        carouselState.autoSlideTimer = setInterval(nextSlide, CAROUSEL_CONFIG.autoSlideInterval);
    }
}

// Reset auto-slide timer
function resetAutoSlideTimer() {
    if (carouselState.autoSlideTimer) {
        clearInterval(carouselState.autoSlideTimer);
    }
    startAutoSlideTimer();
}

// Stop auto-slide timer
function stopAutoSlideTimer() {
    if (carouselState.autoSlideTimer) {
        clearInterval(carouselState.autoSlideTimer);
        carouselState.autoSlideTimer = null;
    }
}

// Setup carousel event listeners
function setupCarouselEvents() {
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    const indicators = document.getElementById('heroIndicators');
    const carousel = document.getElementById('heroCarousel');
    
    // Navigation buttons
    if (prevBtn) {
        prevBtn.addEventListener('click', prevSlide);
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', nextSlide);
    }
    
    // Indicator dots
    if (indicators) {
        indicators.addEventListener('click', (e) => {
            const indicator = e.target.closest('.hero-indicator');
            if (indicator) {
                const index = parseInt(indicator.getAttribute('data-index'), 10);
                goToSlide(index);
            }
        });
    }
    
    // Pause auto-slide on hover
    if (carousel) {
        carousel.addEventListener('mouseenter', stopAutoSlideTimer);
        carousel.addEventListener('mouseleave', startAutoSlideTimer);
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT') return;
        
        if (e.key === 'ArrowLeft') {
            prevSlide();
        } else if (e.key === 'ArrowRight') {
            nextSlide();
        }
    });
    
    // Delegate click events for play and watchlist buttons
    document.getElementById('heroSlides')?.addEventListener('click', async (e) => {
        const playBtn = e.target.closest('.hero-play-btn');
        const watchlistBtn = e.target.closest('.hero-watchlist-btn');
        
        if (playBtn) {
            const contentId = playBtn.getAttribute('data-id');
            window.location.href = `detail.html?id=${contentId}`;
        }
        
        if (watchlistBtn) {
            const contentId = watchlistBtn.getAttribute('data-id');
            
            if (!Auth.isLoggedIn()) {
                document.getElementById('authModal').classList.add('show');
                return;
            }
            
            try {
                await API.user.addToWatchlist(contentId);
                showToast('Added to watchlist', 'success');
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    });
}

// Load hero carousel
async function loadHeroCarousel() {
    const slidesContainer = document.getElementById('heroSlides');
    const indicatorsContainer = document.getElementById('heroIndicators');
    
    if (!slidesContainer || !indicatorsContainer) {
        console.warn('Hero carousel elements not found');
        return;
    }
    
    let carouselItems = [];
    
    // First, try to get carousel items from the API
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/hero/carousel`);
        if (response.ok) {
            const apiCarouselIds = await response.json();
            if (apiCarouselIds && apiCarouselIds.length > 0) {
                carouselItems = DataManager.getByIds(apiCarouselIds);
                console.log(`📺 Loaded ${carouselItems.length} items for hero carousel from API`);
            }
        }
    } catch (error) {
        console.warn('Could not fetch hero carousel from API:', error.message);
    }
    
    // Fallback: Use configured IDs if API returned nothing
    if (carouselItems.length === 0 && HERO_CAROUSEL_IDS && HERO_CAROUSEL_IDS.length > 0) {
        carouselItems = DataManager.getByIds(HERO_CAROUSEL_IDS);
        console.log(`📺 Loaded ${carouselItems.length} items for hero carousel from configured IDs`);
    }
    
    // Fallback: if no items found from configured IDs, try trending
    if (carouselItems.length === 0) {
        try {
            const trendingIds = await API.content.getTrending(5);
            if (trendingIds && trendingIds.length > 0) {
                carouselItems = DataManager.getByIds(trendingIds);
            }
        } catch (error) {
            console.warn('Backend not available for trending, using random content:', error.message);
        }
    }
    
    // Final fallback: use random content from local data
    if (carouselItems.length === 0) {
        const allContent = DataManager.getAll();
        // Get random 5 items
        const shuffled = allContent.sort(() => 0.5 - Math.random());
        carouselItems = shuffled.slice(0, 5);
        console.log('📺 Using random content for hero carousel');
    }
    
    // Clear existing content
    slidesContainer.innerHTML = '';
    indicatorsContainer.innerHTML = '';
    
    // Create slides and indicators
    carouselItems.forEach((item, index) => {
        slidesContainer.appendChild(createHeroSlide(item));
        indicatorsContainer.appendChild(createIndicatorDot(index));
    });
    
    // Update carousel state
    carouselState.currentSlide = 0;
    carouselState.totalSlides = carouselItems.length;
    
    // Setup carousel event listeners
    setupCarouselEvents();
    
    // Start auto-slide
    startAutoSlideTimer();
    
    console.log(`✅ Hero carousel initialized with ${carouselItems.length} slides`);
}

// Legacy: Load hero section (for backward compatibility if old structure exists)
async function loadHero() {
    // Check if we have the new carousel structure
    const heroCarousel = document.getElementById('heroCarousel');
    if (heroCarousel) {
        return loadHeroCarousel();
    }
    
    // Fallback to old hero section
    try {
        // Try to get trending IDs from backend first
        const trendingIds = await API.content.getTrending(1);
        if (trendingIds && trendingIds.length > 0) {
            // Match with local data
            const hero = DataManager.getById(trendingIds[0]);
            if (hero) {
                setHeroContent(hero);
                return;
            }
        }
    } catch (error) {
        console.warn('Backend not available for hero, using local data:', error.message);
    }
    
    // Fallback: use random content from local data
    const hero = DataManager.getRandomForHero();
    if (hero) {
        setHeroContent(hero);
    } else {
        // No content available at all
        document.getElementById('heroTitle').textContent = 'Welcome to Chadcinema';
        document.getElementById('heroDescription').textContent = 'Browse our collection of movies and series';
    }
}

// Load all content sections
async function loadContent() {
    // Load daily picks section
    await loadDailyPicks();
    
    // Load weekly series
    await loadWeeklySeries();
    
    // First, load all categories from local JSON data (always works)
    loadLocalCategories();
    
    // Then try to load backend-dependent sections (trending, recommendations)
    await loadBackendSections();
}

// =============================================================================
// DAILY PICKS SECTION
// =============================================================================

// Load all weekly data
async function loadWeeklyData() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/content/weekly/all`);
        if (response.ok) {
            dailyPicksState.weeklyData = await response.json();
            return dailyPicksState.weeklyData;
        }
    } catch (error) {
        console.warn('Could not load weekly data:', error.message);
    }
    return null;
}

// Load daily picks for a specific day
async function loadDayContent(day) {
    const slider = document.getElementById('dailyPicksSlider');
    const title = document.getElementById('dailyPicksTitle');
    
    if (!slider) return;
    
    // Update title
    const today = DAY_NAMES[new Date().getDay()];
    if (day === today) {
        title.textContent = `📅 Today's Picks (${DAY_FULL_NAMES[day]})`;
    } else {
        title.textContent = `📅 ${DAY_FULL_NAMES[day]}'s Picks`;
    }
    
    // Show loading
    slider.innerHTML = '<div class="slider-loading">Loading...</div>';
    
    let contentIds = [];
    
    // Try to get from cached weekly data first
    if (dailyPicksState.weeklyData && dailyPicksState.weeklyData[day]) {
        contentIds = dailyPicksState.weeklyData[day];
    } else {
        // Fetch from API
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/content/weekly/${day}`);
            if (response.ok) {
                contentIds = await response.json();
            }
        } catch (error) {
            console.warn(`Could not load content for ${day}:`, error.message);
        }
    }
    
    // Get content items
    let items = DataManager.getByIds(contentIds);
    
    // If no items for this day, show a message or hide
    if (items.length === 0) {
        slider.innerHTML = '<div class="slider-loading" style="color: var(--text-muted);">No picks for this day yet. Check back later!</div>';
        return;
    }
    
    // Load the slider
    loadSlider('dailyPicksSlider', items);
}

// Setup day tabs
function setupDayTabs() {
    const tabsContainer = document.getElementById('dayTabs');
    if (!tabsContainer) return;
    
    const today = DAY_NAMES[new Date().getDay()];
    const tabs = tabsContainer.querySelectorAll('.day-tab');
    
    tabs.forEach(tab => {
        const day = tab.getAttribute('data-day');
        
        // Mark today's tab
        if (day === today) {
            tab.classList.add('today');
            tab.classList.add('active');
        }
        
        // Add click handler
        tab.addEventListener('click', () => {
            // Update active state
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Load content for selected day
            dailyPicksState.currentDay = day;
            loadDayContent(day);
        });
    });
}

// Load daily picks section
async function loadDailyPicks() {
    const section = document.getElementById('dailyPicksSection');
    if (!section) return;
    
    // Load all weekly data
    await loadWeeklyData();
    
    // Setup day tabs
    setupDayTabs();
    
    // Load today's content
    const today = DAY_NAMES[new Date().getDay()];
    await loadDayContent(today);
    
    console.log('✅ Daily picks section loaded');
}

// Load weekly series
async function loadWeeklySeries() {
    const section = document.getElementById('weeklySeriesSection');
    const slider = document.getElementById('weeklySeriesSlider');
    
    if (!section || !slider) return;
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/content/weekly/series`);
        if (response.ok) {
            const seriesIds = await response.json();
            if (seriesIds && seriesIds.length > 0) {
                const series = DataManager.getByIds(seriesIds);
                if (series.length > 0) {
                    loadSlider('weeklySeriesSlider', series);
                    section.style.display = 'block';
                    console.log('✅ Weekly series section loaded');
                    return;
                }
            }
        }
    } catch (error) {
        console.warn('Could not load weekly series:', error.message);
    }
    
    // Hide section if no data
    section.style.display = 'none';
}

// =============================================================================

// Load categories from local JSON data - always works even without backend
function loadLocalCategories() {
    // Load anime - get from local data
    const anime = DataManager.getByCategory('Anime', 20);
    loadSlider('animeSlider', anime);
    
    // Load Korean - get from local data
    const korean = DataManager.getByCategory('Korean', 20);
    loadSlider('koreanSlider', korean);
    
    // Load movies - get from local data
    const movies = DataManager.getByCategory('movie', 20);
    loadSlider('moviesSlider', movies);
    
    // Load series - get from local data
    const series = DataManager.getByCategory('series', 20);
    loadSlider('seriesSlider', series);
    
    // Load Hollywood - get from local data
    const hollywood = DataManager.getByCategory('Hollywood', 20);
    loadSlider('hollywoodSlider', hollywood);
    
    // Load Bollywood - get from local data
    const bollywood = DataManager.getByCategory('Bollywood', 20);
    loadSlider('bollywoodSlider', bollywood);
    
    // Load South Indian - get from local data
    const south = DataManager.getByCategory('South Indian', 20);
    loadSlider('southSlider', south);
    
    // Load Animation - get from local data
    const animation = DataManager.getByCategory('Animation', 20);
    loadSlider('animationSlider', animation);
}

// Load backend-dependent sections (trending, recommendations)
async function loadBackendSections() {
    const trendingSection = document.querySelector('#trendingSlider').closest('.content-row');
    const recommendationsSection = document.getElementById('recommendationsSection');
    
    // Try to load trending from backend
    try {
        const trendingIds = await API.content.getTrending(20);
        if (trendingIds && trendingIds.length > 0) {
            const trending = DataManager.getByIds(trendingIds);
            if (trending.length > 0) {
                loadSlider('trendingSlider', trending);
                trendingSection.style.display = 'block';
            } else {
                // Hide trending section if no data
                trendingSection.style.display = 'none';
            }
        } else {
            trendingSection.style.display = 'none';
        }
    } catch (error) {
        console.warn('Backend not available for trending:', error.message);
        // Hide trending section when backend is not available
        trendingSection.style.display = 'none';
    }
    
    // Try to load recommendations if logged in
    if (Auth.isLoggedIn()) {
        try {
            const recommendationIds = await API.user.getRecommendations();
            if (recommendationIds && recommendationIds.length > 0) {
                const recommendations = DataManager.getByIds(recommendationIds);
                if (recommendations.length > 0) {
                    recommendationsSection.style.display = 'block';
                    loadSlider('recommendationsSlider', recommendations);
                }
            }
        } catch (error) {
            console.warn('Backend not available for recommendations:', error.message);
            // Keep recommendations section hidden
        }
    }
}

// Create search modal
function createSearchModal() {
    const modal = document.createElement('div');
    modal.id = 'searchModal';
    modal.className = 'search-modal';
    modal.innerHTML = `
        <div class="search-modal-header">
            <input type="text" id="searchModalInput" placeholder="Search movies, series, anime..." class="search-modal-input">
            <button class="search-modal-close" id="searchModalClose">&times;</button>
        </div>
        <div class="search-modal-content">
            <div class="search-results-grid" id="searchResults"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    const searchModalInput = document.getElementById('searchModalInput');
    const searchModalClose = document.getElementById('searchModalClose');
    
    // Close modal
    searchModalClose.onclick = () => {
        modal.classList.remove('show');
        searchModalInput.value = '';
        document.getElementById('searchResults').innerHTML = '';
    };
    
    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            searchModalInput.value = '';
            document.getElementById('searchResults').innerHTML = '';
        }
    };
    
    // Real-time search in modal
    searchModalInput.addEventListener('input', (e) => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        searchTimeout = setTimeout(() => {
            const query = searchModalInput.value.trim();
            if (!query) {
                document.getElementById('searchResults').innerHTML = '';
                return;
            }
            
            try {
                const results = DataManager.search(query);
                displaySearchResults(results, query);
            } catch (error) {
                console.error('Search error:', error);
            }
        }, 300);
    });
}

// Display search results
function displaySearchResults(results, query) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No results found</p>';
    } else {
        results.forEach(content => {
            resultsContainer.appendChild(createContentCard(content));
        });
    }
}

// Show search results in modal
function showSearchResults(results, query) {
    const modal = document.getElementById('searchModal');
    const resultsContainer = document.getElementById('searchResults');
    
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No results found</p>';
    } else {
        results.forEach(content => {
            resultsContainer.appendChild(createContentCard(content));
        });
    }
    
    modal.classList.add('show');
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    // Open search modal when clicking on search input or button
    function openSearchModal() {
        const searchModal = document.getElementById('searchModal');
        const searchModalInput = document.getElementById('searchModalInput');
        
        if (searchModal && searchModalInput) {
            searchModal.classList.add('show');
            searchModalInput.focus();
        }
    }
    
    // Click on search input opens modal
    if (searchInput) {
        searchInput.addEventListener('click', openSearchModal);
        searchInput.addEventListener('focus', openSearchModal);
    }
    
    // Click on search button opens modal
    if (searchBtn) {
        searchBtn.addEventListener('click', openSearchModal);
    }
}

// Watchlist Modal functionality
function setupWatchlistModal() {
    const watchlistBtn = document.getElementById('watchlistBtn');
    const watchlistModal = document.getElementById('watchlistModal');
    const watchlistModalClose = document.getElementById('watchlistModalClose');
    const watchlistGrid = document.getElementById('watchlistGrid');
    
    // Open watchlist modal
    if (watchlistBtn) {
        watchlistBtn.addEventListener('click', async () => {
            if (!Auth.isLoggedIn()) {
                document.getElementById('authModal').classList.add('show');
                return;
            }
            
            // Show modal
            watchlistModal.classList.add('show');
            
            // Load watchlist
            watchlistGrid.innerHTML = '<div class="loading-message">Loading your watchlist...</div>';
            
            try {
                const watchlistIds = await API.user.getWatchlist();
                
                if (!watchlistIds || watchlistIds.length === 0) {
                    watchlistGrid.innerHTML = `
                        <div class="watchlist-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <h3>Your watchlist is empty</h3>
                            <p>Add movies and series to your watchlist to watch them later</p>
                        </div>
                    `;
                    return;
                }
                
                // Match with local data
                const watchlistItems = DataManager.getByIds(watchlistIds);
                
                if (watchlistItems.length === 0) {
                    watchlistGrid.innerHTML = `
                        <div class="watchlist-empty">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <h3>Your watchlist is empty</h3>
                            <p>Add movies and series to your watchlist to watch them later</p>
                        </div>
                    `;
                } else {
                    watchlistGrid.innerHTML = '';
                    watchlistItems.forEach(item => {
                        watchlistGrid.appendChild(createContentCard(item));
                    });
                }
            } catch (error) {
                console.error('Error loading watchlist:', error);
                watchlistGrid.innerHTML = `
                    <div class="watchlist-empty">
                        <h3>Failed to load watchlist</h3>
                        <p>Please try again later</p>
                    </div>
                `;
            }
        });
    }
    
    // Close watchlist modal
    if (watchlistModalClose) {
        watchlistModalClose.addEventListener('click', () => {
            watchlistModal.classList.remove('show');
        });
    }
    
    // Close on background click
    if (watchlistModal) {
        watchlistModal.addEventListener('click', (e) => {
            if (e.target === watchlistModal) {
                watchlistModal.classList.remove('show');
            }
        });
    }
}

// My List functionality
function setupMyList() {
    const myListLink = document.getElementById('myListLink');
    
    if (myListLink) {
        myListLink.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!Auth.isLoggedIn()) {
                document.getElementById('authModal').classList.add('show');
                return;
            }
            
            try {
                // Get watchlist IDs from backend
                const watchlistIds = await API.user.getWatchlist();
                if (watchlistIds && watchlistIds.length > 0) {
                    // Match with local data
                    const watchlist = DataManager.getByIds(watchlistIds);
                    loadSlider('trendingSlider', watchlist);
                    document.querySelector('.row-header h3').textContent = '📌 My List';
                    showToast('Loaded your watchlist', 'success');
                } else {
                    showToast('Your watchlist is empty', 'error');
                }
            } catch (error) {
                showToast('Failed to load watchlist', 'error');
            }
        });
    }
}

// Navbar scroll effect
function setupNavbar() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Mobile menu toggle
function setupMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileSearchIcon = document.getElementById('mobileSearchIcon');
    const navMenu = document.getElementById('navMenu');
    const searchModal = document.getElementById('searchModal');
    const searchModalInput = document.getElementById('searchModalInput');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
    }
    
    if (mobileSearchIcon && searchModal && searchModalInput) {
        mobileSearchIcon.addEventListener('click', () => {
            searchModal.classList.add('show');
            searchModalInput.focus();
        });
    }
    
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (navMenu && !navMenu.contains(e.target) && mobileMenuToggle && !mobileMenuToggle.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });
    
    // Close menu when clicking a link
    if (navMenu) {
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize auth
    Auth.initAuthUI();
    Auth.setupModal();
    
    // Create search modal FIRST (before setupMobileMenu needs it)
    createSearchModal();
    
    // Setup features
    setupNavbar();
    setupSearch();
    setupMyList();
    setupMobileMenu();
    setupWatchlistModal();
    
    // Load all JSON data into memory first (with localStorage caching)
    console.log('🚀 Loading content data...');
    await DataManager.loadAllData();
    dataLoaded = true;
    
    // Load content
    loadHero();
    loadContent();
});
