// Detail Page JavaScript

let currentContent = null;
let currentEpisode = null;
let currentSource = null;
let isLoading = false; // Prevent infinite loading
let searchTimeout = null;

// Get content ID from URL
function getContentId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load content details
async function loadContentDetail() {
    // Prevent multiple loads
    if (isLoading) {
        console.log('Already loading, skipping...');
        return;
    }
    
    const contentId = getContentId();
    
    if (!contentId) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        isLoading = true;
        
        // Load data manager first if not loaded
        if (!DataManager.isLoaded) {
            console.log('Loading DataManager...');
            await DataManager.loadAllData();
        }
        
        // Get content from local data
        const content = DataManager.getById(contentId);
        
        if (!content) {
            console.error('Content not found in local data');
            document.getElementById('detailContainer').innerHTML = '<div class="detail-loading">Content not found</div>';
            isLoading = false;
            return;
        }
        
        currentContent = content;
        
        // Display content info
        displayContentInfo(content);
        
        // Setup player
        setupPlayer(content);
        
        // Track view if logged in
        if (Auth.isLoggedIn()) {
            try {
                await API.user.trackView(contentId, 0, 0);
            } catch (error) {
                console.warn('Track view failed:', error);
            }
        }
        
        isLoading = false;
        
    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('detailContainer').innerHTML = '<div class="detail-loading">Failed to load content</div>';
        isLoading = false;
    }
}

// Get related seasons for a series
function getRelatedSeasons(content) {
    // Only proceed if content has a season field
    if (!content.season) {
        return [];
    }
    
    // Extract base ID (remove last 1-2 digits from ID)
    const baseId = content.id.replace(/\d{1,2}$/, '');
    
    // Get all content from DataManager
    const allContent = DataManager.getAllContent();
    
    // Find all series with similar ID pattern and season field
    const relatedSeasons = allContent.filter(item => {
        // Must have season field
        if (!item.season) return false;
        
        // Check if ID starts with base ID
        const itemBaseId = item.id.replace(/\d{1,2}$/, '');
        if (itemBaseId !== baseId) return false;
        
        return true;
    });
    
    // Sort by season number
    relatedSeasons.sort((a, b) => {
        const seasonA = parseInt(a.season) || 0;
        const seasonB = parseInt(b.season) || 0;
        return seasonA - seasonB;
    });
    
    return relatedSeasons;
}

// Get content recommendations
function getRecommendations(content, limit = 9) {
    const allContent = DataManager.getAllContent();
    
    // Calculate similarity score for each content
    const scored = allContent
        .filter(item => item.id !== content.id) // Exclude current content
        .map(item => {
            let score = 0;
            
            // Genre matching (most important) - +3 per matching genre
            const contentGenres = Array.isArray(content.genres) ? content.genres : [];
            const itemGenres = Array.isArray(item.genres) ? item.genres : [];
            const matchingGenres = contentGenres.filter(g => itemGenres.includes(g));
            score += matchingGenres.length * 3;
            
            // Same industry - +2
            if (content.industry && item.industry && content.industry === item.industry) {
                score += 2;
            }
            
            // Rating similarity - +1 if within ±1.0 range
            if (content.rating && item.rating) {
                const contentRating = parseFloat(content.rating);
                const itemRating = parseFloat(item.rating);
                if (Math.abs(contentRating - itemRating) <= 1.0) {
                    score += 1;
                }
            }
            
            // Same type (series/movie) - +1
            if (content.type && item.type && content.type === item.type) {
                score += 1;
            }
            
            return { content: item, score };
        })
        .filter(item => item.score > 0) // Only items with some similarity
        .sort((a, b) => b.score - a.score) // Sort by score (highest first)
        .slice(0, limit); // Take top N items
    
    return scored.map(item => item.content);
}

// Display content information
function displayContentInfo(content) {
    const container = document.getElementById('detailContainer');
    
    const genres = Array.isArray(content.genres) ? content.genres : [];
    const genreBadges = genres.map(g => `<span class="genre-badge">${g}</span>`).join('');
    
    const cast = Array.isArray(content.cast) ? content.cast : [];
    const castItems = cast.slice(0, 10).map(c => `<span class="cast-item">${c}</span>`).join('');
    
    // Parse download links
    let downloadLinks = {};
    try {
        if (typeof content.download_links === 'string') {
            downloadLinks = JSON.parse(content.download_links);
        } else if (typeof content.download_links === 'object') {
            downloadLinks = content.download_links || {};
        }
    } catch (e) {
        console.warn('Failed to parse download_links:', e);
    }
    
    const downloadLinksHtml = Object.keys(downloadLinks).length > 0 ? `
        <div class="detail-downloads">
            <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline-block; vertical-align: middle;">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Links
            </h3>
            <div class="download-links">
                ${Object.entries(downloadLinks).map(([name, url]) => `
                    <a href="${url}" target="_blank" class="download-link" rel="noopener noreferrer">
                        <span class="download-link-name">${name}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                        </svg>
                    </a>
                `).join('')}
            </div>
        </div>
    ` : '';
    
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
                ${downloadLinksHtml}
            </div>
        </div>
    `;
    
    // Display related seasons if available
    displayRelatedSeasons(content);
    
    // Display recommendations
    displayRecommendations(content);
    
    // Setup action buttons
    document.getElementById('playBtn').onclick = () => {
        scrollToPlayer();
    };
    
    // Setup watchlist button with toggle functionality
    setupWatchlistButton(content.id);
}

// Display related seasons
function displayRelatedSeasons(content) {
    const relatedSeasons = getRelatedSeasons(content);
    
    // Only show if there are multiple seasons
    if (relatedSeasons.length <= 1) {
        return;
    }
    
    const container = document.getElementById('detailContainer');
    
    const seasonsHtml = `
        <div class="seasons-section">
            <h3>More Seasons</h3>
            <div class="seasons-grid">
                ${relatedSeasons.map(season => {
                    const isCurrentSeason = season.id === content.id;
                    const episodes = Array.isArray(season.episodes) ? season.episodes : [];
                    return `
                        <div class="season-card ${isCurrentSeason ? 'active' : ''}" 
                             onclick="${isCurrentSeason ? '' : `window.location.href='detail.html?id=${season.id}'`}"
                             style="${isCurrentSeason ? 'cursor: default;' : 'cursor: pointer;'}">
                            <div class="season-card-header">
                                <span class="season-number">Season ${season.season}</span>
                                ${isCurrentSeason ? '<span class="current-badge">Current</span>' : ''}
                            </div>
                            <div class="season-card-info">
                                <p class="season-year">${season.year || 'N/A'}</p>
                                <p class="season-episodes">${episodes.length} Episode${episodes.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', seasonsHtml);
}

// Display recommendations
function displayRecommendations(content) {
    const recommendations = getRecommendations(content, 9);
    
    if (recommendations.length === 0) {
        return;
    }
    
    const container = document.getElementById('recommendationsContainer');
    
    const recommendationsHtml = `
        <div class="recommendations-section">
            <h3>You May Also Like</h3>
            <div class="recommendations-grid">
                ${recommendations.map(item => {
                    const genres = Array.isArray(item.genres) ? item.genres.slice(0, 2) : [];
                    const genreTags = genres.map(g => `<span class="genre-tag">${g}</span>`).join('');
                    
                    return `
                        <div class="recommendation-card" onclick="window.location.href='detail.html?id=${item.id}'">
                            ${item.rating ? `<div class="recommendation-card-rating">⭐ ${item.rating}</div>` : ''}
                            <img src="${item.image || 'https://via.placeholder.com/350x200?text=No+Image'}" 
                                 alt="${item.title}" 
                                 class="recommendation-card-image"
                                 onerror="this.src='https://via.placeholder.com/350x200?text=No+Image'">
                            <div class="recommendation-card-info">
                                <h4 class="recommendation-card-title">${item.title}</h4>
                                <div class="recommendation-card-meta">
                                    ${item.year ? `<span>${item.year}</span>` : ''}
                                    ${item.duration ? `<span>${item.duration}</span>` : ''}
                                </div>
                                ${genreTags ? `<div class="recommendation-card-genres">${genreTags}</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = recommendationsHtml;
}

// Setup watchlist button
async function setupWatchlistButton(contentId) {
    const watchlistBtn = document.getElementById('watchlistBtn');
    
    // Check if item is in watchlist
    async function checkWatchlistStatus() {
        if (!Auth.isLoggedIn()) {
            updateWatchlistButton(false);
            return false;
        }
        
        try {
            const watchlist = await API.user.getWatchlist();
            const isInWatchlist = watchlist && watchlist.includes(contentId);
            updateWatchlistButton(isInWatchlist);
            return isInWatchlist;
        } catch (error) {
            console.warn('Failed to check watchlist:', error);
            updateWatchlistButton(false);
            return false;
        }
    }
    
    // Update button appearance
    function updateWatchlistButton(isInWatchlist) {
        if (isInWatchlist) {
            watchlistBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>
                Remove from List
            `;
            watchlistBtn.classList.add('in-watchlist');
        } else {
            watchlistBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"></path>
                </svg>
                Add to List
            `;
            watchlistBtn.classList.remove('in-watchlist');
        }
    }
    
    // Check initial status
    const isInWatchlist = await checkWatchlistStatus();
    
    // Setup click handler
    watchlistBtn.onclick = async () => {
        if (!Auth.isLoggedIn()) {
            document.getElementById('authModal').classList.add('show');
            return;
        }
        
        try {
            const currentStatus = await checkWatchlistStatus();
            
            if (currentStatus) {
                // Remove from watchlist
                await API.user.removeFromWatchlist(contentId);
                showToast('Removed from watchlist!', 'success');
                updateWatchlistButton(false);
            } else {
                // Add to watchlist
                await API.user.addToWatchlist(contentId);
                showToast('Added to watchlist!', 'success');
                updateWatchlistButton(true);
            }
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
        // Hide episode downloads for movies
        const episodeDownloads = document.getElementById('episodeDownloads');
        episodeDownloads.style.display = 'none';
        
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
    
    // Setup episode download links
    setupEpisodeDownloadLinks(episode);
    
    // Load first source
    const firstSource = Object.keys(urls)[0];
    if (firstSource) {
        loadSource(urls[firstSource]);
    }
}

// Setup episode download links
function setupEpisodeDownloadLinks(episode) {
    const episodeDownloads = document.getElementById('episodeDownloads');
    const episodeDownloadLinks = document.getElementById('episodeDownloadLinks');
    
    // Parse download links from episode
    let downloadLinks = {};
    try {
        if (typeof episode.download_links === 'string') {
            downloadLinks = JSON.parse(episode.download_links);
        } else if (typeof episode.download_links === 'object') {
            downloadLinks = episode.download_links || {};
        }
    } catch (e) {
        console.warn('Failed to parse episode download_links:', e);
    }
    
    // Show/hide episode downloads section
    if (Object.keys(downloadLinks).length > 0) {
        episodeDownloads.style.display = 'block';
        
        // Generate download links HTML
        episodeDownloadLinks.innerHTML = Object.entries(downloadLinks).map(([name, url]) => `
            <a href="${url}" target="_blank" class="download-link" rel="noopener noreferrer">
                <span class="download-link-name">${name}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="7" y1="17" x2="17" y2="7"></line>
                    <polyline points="7 7 17 7 17 17"></polyline>
                </svg>
            </a>
        `).join('');
    } else {
        episodeDownloads.style.display = 'none';
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

// Setup search modal
function setupSearchModal() {
    const modal = document.getElementById('searchModal');
    const searchModalClose = document.getElementById('searchModalClose');
    const searchModalInput = document.getElementById('searchModalInput');
    
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

// Create content card for search results
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
        <img src="${content.image || 'https://via.placeholder.com/150x220?text=No+Image'}" 
             alt="${content.title}" 
             class="content-card-image" 
             onerror="this.src='https://via.placeholder.com/150x220?text=No+Image'">
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

// Display search results in modal
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

// Search functionality with real-time search
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const modal = document.getElementById('searchModal');
    const searchModalInput = document.getElementById('searchModalInput');
    
    function openSearchModal(initialQuery = '') {
        modal.classList.add('show');
        searchModalInput.value = initialQuery;
        searchModalInput.focus();
        
        if (initialQuery.trim()) {
            try {
                const results = DataManager.search(initialQuery.trim());
                displaySearchResults(results, initialQuery.trim());
            } catch (error) {
                console.error('Search error:', error);
            }
        }
    }
    
    // Open modal on input focus
    searchInput.addEventListener('focus', () => {
        openSearchModal(searchInput.value);
    });
    
    // Open modal on button click
    searchBtn.addEventListener('click', () => {
        openSearchModal(searchInput.value);
    });
    
    // Open modal on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            openSearchModal(searchInput.value);
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
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth
    Auth.initAuthUI();
    Auth.setupModal();
    
    // Setup search
    setupSearch();
    
    // Setup search modal
    setupSearchModal();
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Load content ONCE
    loadContentDetail();
});
