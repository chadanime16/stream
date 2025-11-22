// Main JavaScript for Homepage

// Wait for DataManager to load
let dataLoaded = false;

// Create content card HTML
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
        <img src="${content.image || 'https://via.placeholder.com/280x400?text=No+Image'}" 
             alt="${content.title}" 
             class="content-card-image" 
             onerror="this.src='https://via.placeholder.com/280x400?text=No+Image'">
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
}

// Load hero section
async function loadHero() {
    try {
        // Get trending IDs from backend
        const trendingIds = await API.content.getTrending(1);
        if (trendingIds && trendingIds.length > 0) {
            // Match with local data
            const hero = DataManager.getById(trendingIds[0]);
            
            if (!hero) {
                console.warn('Hero content not found in local data');
                return;
            }
            
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
    } catch (error) {
        console.error('Error loading hero:', error);
    }
}

// Load all content sections
async function loadContent() {
    try {
        // Load trending - get IDs from backend, match with local data
        const trendingIds = await API.content.getTrending(20);
        const trending = DataManager.getByIds(trendingIds);
        loadSlider('trendingSlider', trending);
        
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
        
        // Load recommendations if logged in - get IDs from backend
        if (Auth.isLoggedIn()) {
            const recommendationIds = await API.user.getRecommendations();
            if (recommendationIds && recommendationIds.length > 0) {
                const recommendations = DataManager.getByIds(recommendationIds);
                document.getElementById('recommendationsSection').style.display = 'block';
                loadSlider('recommendationsSlider', recommendations);
            }
        }
    } catch (error) {
        console.error('Error loading content:', error);
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        
        try {
            // Search in local data
            const results = DataManager.search(query);
            
            // Show results in a modal or redirect to search page
            // For now, show in trending section
            if (results && results.length > 0) {
                loadSlider('trendingSlider', results);
                document.querySelector('.row-header h3').textContent = `🔍 Search: "${query}"`;
                showToast(`Found ${results.length} results`, 'success');
            } else {
                showToast('No results found', 'error');
            }
        } catch (error) {
            showToast('Search failed', 'error');
        }
    }
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
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

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize auth
    Auth.initAuthUI();
    Auth.setupModal();
    
    // Setup features
    setupNavbar();
    setupSearch();
    setupMyList();
    
    // Load all JSON data into memory first
    console.log('🚀 Loading content data...');
    await DataManager.loadAllData();
    dataLoaded = true;
    
    // Load content
    loadHero();
    loadContent();
});
