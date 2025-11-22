// Main JavaScript for Homepage

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
        const trending = await API.content.getTrending(1);
        if (trending && trending.length > 0) {
            const hero = trending[0];
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
            heroDescription.textContent = hero.description || 'Watch now on StreamFlix';
            
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
        // Load trending
        const trending = await API.content.getTrending(20);
        loadSlider('trendingSlider', trending);
        
        // Load anime
        const anime = await API.content.getByCategory('Anime', 20);
        loadSlider('animeSlider', anime);
        
        // Load Korean
        const korean = await API.content.getByCategory('Korean', 20);
        loadSlider('koreanSlider', korean);
        
        // Load movies
        const movies = await API.content.getByCategory('movie', 20);
        loadSlider('moviesSlider', movies);
        
        // Load series
        const series = await API.content.getByCategory('series', 20);
        loadSlider('seriesSlider', series);
        
        // Load Hollywood
        const hollywood = await API.content.getByCategory('Hollywood', 20);
        loadSlider('hollywoodSlider', hollywood);
        
        // Load Bollywood
        const bollywood = await API.content.getByCategory('Bollywood', 20);
        loadSlider('bollywoodSlider', bollywood);
        
        // Load South Indian
        const south = await API.content.getByCategory('South Indian', 20);
        loadSlider('southSlider', south);
        
        // Load Animation
        const animation = await API.content.getByCategory('Animation', 20);
        loadSlider('animationSlider', animation);
        
        // Load recommendations if logged in
        if (Auth.isLoggedIn()) {
            const recommendations = await API.user.getRecommendations();
            if (recommendations && recommendations.length > 0) {
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
    
    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        
        try {
            const results = await API.content.search(query);
            
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
                const watchlist = await API.user.getWatchlist();
                if (watchlist && watchlist.length > 0) {
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
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth
    Auth.initAuthUI();
    Auth.setupModal();
    
    // Setup features
    setupNavbar();
    setupSearch();
    setupMyList();
    
    // Load content
    loadHero();
    loadContent();
});
