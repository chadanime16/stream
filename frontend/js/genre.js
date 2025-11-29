// Genre/Filter Page JavaScript

let searchTimeout = null;
let currentContent = [];
let displayedCount = 0;
const ITEMS_PER_PAGE = 24;

// Local placeholder SVG for failed images
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,' + btoa(`
<svg width="350" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="350" height="200" fill="#1a1212"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#8b7070" font-family="Arial, sans-serif" font-size="16">No Image</text>
  <circle cx="175" cy="70" r="25" fill="#2a1f1f"/>
  <rect x="160" y="100" width="30" height="4" rx="2" fill="#2a1f1f"/>
</svg>
`);

// Get URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        type: params.get('type'),
        industry: params.get('industry'),
        genre: params.get('genre')
    };
}

// Create content card HTML with improved image handling
function createContentCard(content) {
    const card = document.createElement('div');
    card.className = 'content-card genre-card';
    card.onclick = () => {
        window.location.href = `detail.html?id=${content.id}`;
    };
    
    const genres = Array.isArray(content.genres) ? content.genres.slice(0, 2) : [];
    const genreTags = genres.map(g => `<span class="genre-tag">${g}</span>`).join('');
    
    // Get rating as number for badge styling
    const rating = parseFloat(content.rating) || 0;
    const ratingClass = rating >= 8 ? 'high' : rating >= 6 ? 'medium' : 'low';
    
    card.innerHTML = `
        ${content.rating ? `<div class="content-card-rating ${ratingClass}">⭐ ${content.rating}</div>` : ''}
        <div class="card-image-wrapper">
            <img src="${content.image || PLACEHOLDER_IMAGE}" 
                 alt="${content.title}" 
                 class="content-card-image" 
                 loading="lazy"
                 onload="this.parentElement.classList.add('loaded')"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'; this.parentElement.classList.add('loaded');">
            <div class="card-image-skeleton"></div>
        </div>
        <div class="content-card-overlay">
            <div class="card-play-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            </div>
        </div>
        <div class="content-card-info">
            <h4 class="content-card-title">${content.title}</h4>
            <div class="content-card-meta">
                ${content.year ? `<span class="meta-year">${content.year}</span>` : ''}
                ${content.duration ? `<span class="meta-duration">${content.duration}</span>` : ''}
                ${content.industry ? `<span class="meta-industry">${content.industry}</span>` : ''}
            </div>
            ${genreTags ? `<div class="content-card-genres">${genreTags}</div>` : ''}
        </div>
    `;
    
    return card;
}

// Filter content based on URL parameters
function filterContent(params) {
    const allContent = DataManager.getAll();
    
    const types = params.type ? params.type.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
    const industries = params.industry ? params.industry.split(',').map(i => i.trim().toLowerCase()).filter(i => i) : [];
    const genres = params.genre ? params.genre.split(',').map(g => g.trim().toLowerCase()).filter(g => g) : [];
    
    const isCartoonFilter = types.includes('cartoon') || genres.includes('cartoon');
    const isAnimeFilter = types.includes('anime') || industries.includes('anime');
    const isAnimationFilter = industries.includes('animation');
    
    if (types.length === 0 && industries.length === 0 && genres.length === 0) {
        return allContent;
    }
    
    return allContent.filter(item => {
        const itemType = (item.type || '').toLowerCase();
        const itemIndustry = (item.industry || '').toLowerCase();
        const itemGenres = Array.isArray(item.genres) ? item.genres.map(g => (g || '').toLowerCase()) : [];
        
        const isAnimeContent = itemType === 'anime' || itemIndustry === 'anime';
        const isCartoonContent = itemType === 'cartoon' || itemGenres.includes('cartoon');
        const isAnimationContent = itemIndustry === 'animation';
        
        if (isAnimationFilter) {
            if (!isAnimationContent) return false;
            if (types.length > 0) {
                const matchesType = types.some(t => itemType === t || itemType.includes(t));
                if (!matchesType) return false;
            }
            if (genres.length > 0) {
                const matchesGenre = genres.some(searchGenre => 
                    itemGenres.some(g => g === searchGenre || g.includes(searchGenre))
                );
                if (!matchesGenre) return false;
            }
            return true;
        }
        
        if (isAnimeFilter) {
            if (!isAnimeContent) return false;
            if (industries.length > 0) {
                const nonAnimeIndustries = industries.filter(i => i !== 'anime');
                if (nonAnimeIndustries.length > 0) {
                    const matchesIndustry = nonAnimeIndustries.some(ind => 
                        itemIndustry === ind || itemIndustry.includes(ind)
                    );
                    if (!matchesIndustry) return false;
                }
            }
            if (genres.length > 0) {
                const matchesGenre = genres.some(searchGenre => 
                    itemGenres.some(g => g === searchGenre || g.includes(searchGenre))
                );
                if (!matchesGenre) return false;
            }
            return true;
        }
        
        if (isCartoonFilter) {
            const matchesCartoonType = itemType === 'cartoon';
            const matchesCartoonGenre = itemGenres.some(g => g === 'cartoon' || g.includes('cartoon'));
            
            if (!matchesCartoonType && !matchesCartoonGenre) return false;
            
            let otherFiltersPass = true;
            const nonCartoonTypes = types.filter(t => t !== 'cartoon');
            if (nonCartoonTypes.length > 0) {
                otherFiltersPass = otherFiltersPass && nonCartoonTypes.some(t => 
                    itemType === t || itemType.includes(t)
                );
            }
            if (industries.length > 0) {
                otherFiltersPass = otherFiltersPass && industries.some(ind => 
                    itemIndustry === ind || itemIndustry.includes(ind)
                );
            }
            const nonCartoonGenres = genres.filter(g => g !== 'cartoon');
            if (nonCartoonGenres.length > 0) {
                otherFiltersPass = otherFiltersPass && nonCartoonGenres.some(searchGenre => 
                    itemGenres.some(g => g === searchGenre || g.includes(searchGenre))
                );
            }
            return otherFiltersPass;
        }
        
        if (isAnimeContent || isCartoonContent || isAnimationContent) return false;
        
        let matchesType = true;
        let matchesIndustry = true;
        let matchesGenre = true;
        
        if (types.length > 0) {
            matchesType = types.some(t => itemType === t || itemType.includes(t));
        }
        if (industries.length > 0) {
            matchesIndustry = industries.some(ind => itemIndustry === ind || itemIndustry.includes(ind));
        }
        if (genres.length > 0) {
            matchesGenre = genres.some(searchGenre => 
                itemGenres.some(g => g === searchGenre || g.includes(searchGenre))
            );
        }
        
        return matchesType && matchesIndustry && matchesGenre;
    });
}

// Sort content
function sortContent(content, sortBy) {
    const sorted = [...content];
    
    switch (sortBy) {
        case 'rating-desc':
            return sorted.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));
        case 'rating-asc':
            return sorted.sort((a, b) => (parseFloat(a.rating) || 0) - (parseFloat(b.rating) || 0));
        case 'year-desc':
            return sorted.sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0));
        case 'year-asc':
            return sorted.sort((a, b) => (parseInt(a.year) || 0) - (parseInt(b.year) || 0));
        case 'title-asc':
            return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        case 'title-desc':
            return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        default:
            return sorted;
    }
}

// Get page title based on filters
function getPageTitle(params) {
    if (params.type && params.genre) {
        const types = params.type.split(',').map(t => t.trim().toLowerCase());
        const genres = params.genre.split(',').map(g => g.trim().toLowerCase());
        
        if (types.includes('cartoon') && genres.includes('cartoon')) {
            return 'Cartoons';
        }
        return `${capitalizeFirst(params.genre)} ${capitalizeFirst(params.type)}`;
    }
    
    if (params.type && params.industry) {
        return `${capitalizeFirst(params.industry)} ${capitalizeFirst(params.type)}`;
    } else if (params.industry && params.genre) {
        return `${capitalizeFirst(params.genre)} - ${capitalizeFirst(params.industry)}`;
    } else if (params.type) {
        const types = params.type.split(',').map(t => capitalizeFirst(t.trim())).filter(t => t);
        if (types.length > 1) return types.join(' & ');
        return `All ${capitalizeFirst(params.type)}`;
    } else if (params.industry) {
        const industries = params.industry.split(',').map(i => capitalizeFirst(i.trim())).filter(i => i);
        if (industries.length > 1) return industries.join(' & ');
        return `${capitalizeFirst(params.industry)} Content`;
    } else if (params.genre) {
        const genres = params.genre.split(',').map(g => capitalizeFirst(g.trim())).filter(g => g);
        if (genres.length > 1) return genres.join(' & ');
        return `${capitalizeFirst(params.genre)} Content`;
    }
    return 'Browse Content';
}

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Display content with pagination
function displayContent(content, append = false) {
    const grid = document.getElementById('genreGrid');
    const resultCount = document.getElementById('resultCount');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const totalCount = document.getElementById('totalCount');
    
    if (!append) {
        grid.innerHTML = '';
        displayedCount = 0;
    }
    
    if (content.length === 0) {
        grid.innerHTML = `
            <div class="no-results">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                    <path d="M8 11h6"></path>
                </svg>
                <h3>No content found</h3>
                <p>Try adjusting your filters or browse other categories</p>
            </div>
        `;
        resultCount.textContent = 'No results';
        totalCount.textContent = '0';
        loadMoreContainer.style.display = 'none';
        return;
    }
    
    // Calculate items to show
    const startIndex = displayedCount;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, content.length);
    const itemsToShow = content.slice(startIndex, endIndex);
    
    itemsToShow.forEach(item => {
        grid.appendChild(createContentCard(item));
    });
    
    displayedCount = endIndex;
    
    // Update counts
    resultCount.textContent = `Showing ${displayedCount} of ${content.length} ${content.length === 1 ? 'result' : 'results'}`;
    totalCount.textContent = content.length.toString();
    
    // Show/hide load more button
    loadMoreContainer.style.display = displayedCount < content.length ? 'flex' : 'none';
}

// Update page header
function updatePageHeader(params) {
    const title = getPageTitle(params);
    document.getElementById('genreTitle').textContent = title;
    document.getElementById('pageTitle').textContent = `${title} - Chadcinema`;
}

// Load and display filtered content
async function loadGenreContent() {
    await DataManager.loadAllData();
    
    const params = getUrlParams();
    updatePageHeader(params);
    
    currentContent = filterContent(params);
    
    // Apply default sort
    const sortSelect = document.getElementById('sortSelect');
    currentContent = sortContent(currentContent, sortSelect.value);
    
    displayContent(currentContent);
}

// Setup sort functionality
function setupSorting() {
    const sortSelect = document.getElementById('sortSelect');
    sortSelect.addEventListener('change', () => {
        currentContent = sortContent(currentContent, sortSelect.value);
        displayContent(currentContent);
    });
}

// Setup load more
function setupLoadMore() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    loadMoreBtn.addEventListener('click', () => {
        displayContent(currentContent, true);
    });
}

// Create search modal
function createSearchModal() {
    const modal = document.getElementById('searchModal');
    const searchModalInput = document.getElementById('searchModalInput');
    const searchModalClose = document.getElementById('searchModalClose');
    
    searchModalClose.onclick = () => {
        modal.classList.remove('show');
        searchModalInput.value = '';
        document.getElementById('searchResults').innerHTML = '';
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
            searchModalInput.value = '';
            document.getElementById('searchResults').innerHTML = '';
        }
    };
    
    searchModalInput.addEventListener('input', (e) => {
        if (searchTimeout) clearTimeout(searchTimeout);
        
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

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const searchModal = document.getElementById('searchModal');
    const searchModalInput = document.getElementById('searchModalInput');
    
    function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            searchModal.classList.remove('show');
            return;
        }
        
        try {
            const results = DataManager.search(query);
            displaySearchResults(results, query);
            searchModal.classList.add('show');
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    searchInput.addEventListener('input', (e) => {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => { performSearch(); }, 300);
    });
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (searchTimeout) clearTimeout(searchTimeout);
            performSearch();
        }
    });
}

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
    
    document.addEventListener('click', (e) => {
        if (navMenu && !navMenu.contains(e.target) && mobileMenuToggle && !mobileMenuToggle.contains(e.target)) {
            navMenu.classList.remove('active');
        }
    });
    
    if (navMenu) {
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
            });
        });
    }
}

function setupWatchlistModal() {
    const watchlistBtn = document.getElementById('watchlistBtn');
    const watchlistModal = document.getElementById('watchlistModal');
    const watchlistModalClose = document.getElementById('watchlistModalClose');
    const watchlistGrid = document.getElementById('watchlistGrid');
    
    if (watchlistBtn) {
        watchlistBtn.addEventListener('click', async () => {
            if (!Auth.isLoggedIn()) {
                document.getElementById('authModal').classList.add('show');
                return;
            }
            
            watchlistModal.classList.add('show');
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
    
    if (watchlistModalClose) {
        watchlistModalClose.addEventListener('click', () => {
            watchlistModal.classList.remove('show');
        });
    }
    
    if (watchlistModal) {
        watchlistModal.addEventListener('click', (e) => {
            if (e.target === watchlistModal) {
                watchlistModal.classList.remove('show');
            }
        });
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    Auth.initAuthUI();
    Auth.setupModal();
    
    setupNavbar();
    setupSearch();
    setupMobileMenu();
    createSearchModal();
    setupWatchlistModal();
    setupSorting();
    setupLoadMore();
    
    await loadGenreContent();
});
