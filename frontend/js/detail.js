// Detail Page JavaScript

let currentContent = null;
let currentEpisode = null;
let currentSource = null;

// Get content ID from URL
function getContentId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load content details
async function loadContentDetail() {
    const contentId = getContentId();
    
    if (!contentId) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Load data manager first if not loaded
        if (!DataManager.isLoaded) {
            await DataManager.loadAllData();
        }
        
        // Get content from local data
        const content = DataManager.getById(contentId);
        
        if (!content) {
            console.error('Content not found in local data');
            document.getElementById('detailContainer').innerHTML = '<div class="detail-loading">Content not found</div>';
            return;
        }
        
        currentContent = content;
        
        // Display content info
        displayContentInfo(content);
        
        // Setup player
        setupPlayer(content);
        
        // Track view if logged in
        if (Auth.isLoggedIn()) {
            await API.user.trackView(contentId, 0, 0);
        }
        
    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('detailContainer').innerHTML = '<div class="detail-loading">Failed to load content</div>';
    }
}

// Display content information
function displayContentInfo(content) {
    const container = document.getElementById('detailContainer');
    
    const genres = Array.isArray(content.genres) ? content.genres : [];
    const genreBadges = genres.map(g => `<span class="genre-badge">${g}</span>`).join('');
    
    const cast = Array.isArray(content.cast) ? content.cast : [];
    const castItems = cast.slice(0, 10).map(c => `<span class="cast-item">${c}</span>`).join('');
    
    container.innerHTML = `
        <div class="detail-header">
            <img src="${content.image || 'https://via.placeholder.com/400x600?text=No+Image'}" 
                 alt="${content.title}" 
                 class="detail-poster"
                 onerror="this.src='https://via.placeholder.com/400x600?text=No+Image'">
            <div class="detail-info">
                <h1>${content.title}</h1>
                <div class="detail-meta">
                    ${content.year ? `<span>${content.year}</span>` : ''}
                    ${content.duration ? `<span>${content.duration}</span>` : ''}
                    ${content.rating ? `<span class="detail-rating">⭐ ${content.rating}</span>` : ''}
                    ${content.industry ? `<span>${content.industry}</span>` : ''}
                </div>
                ${genreBadges ? `<div class="detail-genres">${genreBadges}</div>` : ''}
                <p class="detail-description">${content.description || 'No description available.'}</p>
                <div class="detail-actions">
                    <button class="btn btn-primary" id="playBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Play Now
                    </button>
                    <button class="btn btn-secondary" id="watchlistBtn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 5v14M5 12h14"></path>
                        </svg>
                        Add to List
                    </button>
                </div>
                ${content.director ? `<p style="margin-top: 1rem; color: var(--text-secondary);"><strong>Director:</strong> ${content.director}</p>` : ''}
                ${castItems ? `
                    <div class="detail-cast">
                        <h3>Cast</h3>
                        <div class="cast-list">${castItems}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    // Setup action buttons
    document.getElementById('playBtn').onclick = () => {
        scrollToPlayer();
    };
    
    document.getElementById('watchlistBtn').onclick = async () => {
        if (!Auth.isLoggedIn()) {
            document.getElementById('authModal').classList.add('show');
            return;
        }
        
        try {
            await API.user.addToWatchlist(content.id);
            showToast('Added to watchlist!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };
}

// Setup player
function setupPlayer(content) {
    const playerSection = document.getElementById('playerSection');
    playerSection.style.display = 'block';
    
    // Check if it's a series
    const episodes = Array.isArray(content.episodes) ? content.episodes : [];
    const isSeries = content.type === 'series' || content.type === 'anime' || episodes.length > 0;
    
    if (isSeries && episodes.length > 0) {
        // Setup episode selector
        setupEpisodes(episodes);
        
        // Load first episode
        loadEpisode(episodes[0]);
    } else {
        // Setup sources for movie
        const urls = content.urls || {};
        setupSources(urls);
        
        // Load first source
        const firstSource = Object.keys(urls)[0];
        if (firstSource) {
            loadSource(urls[firstSource]);
        }
    }
}

// Setup episodes for series
function setupEpisodes(episodes) {
    const episodeSelector = document.getElementById('episodeSelector');
    const episodeButtons = document.getElementById('episodeButtons');
    
    episodeSelector.style.display = 'block';
    episodeButtons.innerHTML = '';
    
    episodes.forEach((episode, index) => {
        const btn = document.createElement('button');
        btn.className = 'episode-btn';
        if (index === 0) btn.classList.add('active');
        
        btn.innerHTML = `
            <div>Episode ${episode.episode_number || (index + 1)}</div>
            ${episode.title ? `<div class="episode-title">${episode.title}</div>` : ''}
        `;
        
        btn.onclick = () => {
            // Remove active class from all
            document.querySelectorAll('.episode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Load episode
            loadEpisode(episode);
        };
        
        episodeButtons.appendChild(btn);
    });
}

// Load episode
function loadEpisode(episode) {
    currentEpisode = episode;
    const urls = episode.streaming_links || {};
    setupSources(urls);
    
    // Load first source
    const firstSource = Object.keys(urls)[0];
    if (firstSource) {
        loadSource(urls[firstSource]);
    }
}

// Setup sources
function setupSources(urls) {
    const sourceButtons = document.getElementById('sourceButtons');
    sourceButtons.innerHTML = '';
    
    const sources = Object.keys(urls);
    if (sources.length === 0) {
        sourceButtons.innerHTML = '<p style="color: var(--text-muted);">No sources available</p>';
        return;
    }
    
    sources.forEach((sourceName, index) => {
        const btn = document.createElement('button');
        btn.className = 'source-btn';
        if (index === 0) btn.classList.add('active');
        btn.textContent = sourceName;
        
        btn.onclick = () => {
            // Remove active class from all
            document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Load source
            loadSource(urls[sourceName]);
        };
        
        sourceButtons.appendChild(btn);
    });
}

// Load source into iframe
function loadSource(url) {
    const iframe = document.getElementById('playerIframe');
    iframe.src = url;
    currentSource = url;
}

// Scroll to player
function scrollToPlayer() {
    const playerSection = document.getElementById('playerSection');
    playerSection.scrollIntoView({ behavior: 'smooth' });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        
        window.location.href = `index.html?search=${encodeURIComponent(query)}`;
    }
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth
    Auth.initAuthUI();
    Auth.setupModal();
    
    // Setup search
    setupSearch();
    
    // Load content
    loadContentDetail();
});
