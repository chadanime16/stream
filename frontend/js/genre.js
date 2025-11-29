// Genre/Filter Page JavaScript

let searchTimeout = null;

// Get URL parameters
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        type: params.get('type'),
        industry: params.get('industry'),
        genre: params.get('genre')
    };
}

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

// Filter content based on URL parameters
// Supports OR conditions when multiple values are provided (comma-separated)
// Also supports special 'cartoon' and 'anime' handling
function filterContent(params) {
    const allContent = DataManager.getAll();
    
    // Parse comma-separated values into arrays
    const types = params.type ? params.type.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [];
    const industries = params.industry ? params.industry.split(',').map(i => i.trim().toLowerCase()).filter(i => i) : [];
    const genres = params.genre ? params.genre.split(',').map(g => g.trim().toLowerCase()).filter(g => g) : [];
    
    // Special handling for cartoon: type=cartoon should also match genre=Cartoon
    const isCartoonFilter = types.includes('cartoon') || genres.includes('cartoon');
    // Special handling for anime
    const isAnimeFilter = types.includes('anime') || industries.includes('anime');
    
    // If no filters, return all
    if (types.length === 0 && industries.length === 0 && genres.length === 0) {
        return allContent;
    }
    
    return allContent.filter(item => {
        const itemType = (item.type || '').toLowerCase();
        const itemIndustry = (item.industry || '').toLowerCase();
        const itemGenres = Array.isArray(item.genres) ? item.genres.map(g => (g || '').toLowerCase()) : [];
        
        // Check if item is anime or cartoon
        const isAnimeContent = itemType === 'anime' || itemIndustry === 'anime';
        const isCartoonContent = itemType === 'cartoon' || itemGenres.includes('cartoon') || itemIndustry === 'animation';
        
        // Special anime handling
        if (isAnimeFilter) {
            // Only show anime content
            if (!isAnimeContent) {
                return false;
            }
            // Check other filters if present
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
        
        // Special cartoon handling: OR condition for type=cartoon OR genre=cartoon
        if (isCartoonFilter) {
            const matchesCartoonType = itemType === 'cartoon';
            const matchesCartoonGenre = itemGenres.some(g => g === 'cartoon' || g.includes('cartoon'));
            
            // Item must match either cartoon type OR cartoon genre
            if (!matchesCartoonType && !matchesCartoonGenre) {
                return false; // Doesn't match cartoon filter, exclude it
            }
            
            // Also check other filters if present (AND with non-cartoon filters)
            let otherFiltersPass = true;
            
            // Check non-cartoon types
            const nonCartoonTypes = types.filter(t => t !== 'cartoon');
            if (nonCartoonTypes.length > 0) {
                otherFiltersPass = otherFiltersPass && nonCartoonTypes.some(t => 
                    itemType === t || itemType.includes(t)
                );
            }
            
            // Check industries
            if (industries.length > 0) {
                otherFiltersPass = otherFiltersPass && industries.some(ind => 
                    itemIndustry === ind || itemIndustry.includes(ind)
                );
            }
            
            // Check non-cartoon genres
            const nonCartoonGenres = genres.filter(g => g !== 'cartoon');
            if (nonCartoonGenres.length > 0) {
                otherFiltersPass = otherFiltersPass && nonCartoonGenres.some(searchGenre => 
                    itemGenres.some(g => g === searchGenre || g.includes(searchGenre))
                );
            }
            
            return otherFiltersPass;
        }
        
        // For regular filters (not anime/cartoon), EXCLUDE anime and cartoon content
        if (isAnimeContent || isCartoonContent) {
            return false;
        }
        
        // Standard filtering with OR logic within each category (AND between categories)
        let matchesType = true;
        let matchesIndustry = true;
        let matchesGenre = true;
        
        // Type filter: OR within types (match any of the specified types)
        if (types.length > 0) {
            matchesType = types.some(t => 
                itemType === t || itemType.includes(t)
            );
        }
        
        // Industry filter: OR within industries (match any of the specified industries)
        if (industries.length > 0) {
            matchesIndustry = industries.some(ind => 
                itemIndustry === ind || itemIndustry.includes(ind)
            );
        }
        
        // Genre filter: OR within genres (match any of the specified genres)
        if (genres.length > 0) {
            matchesGenre = genres.some(searchGenre => 
                itemGenres.some(g => g === searchGenre || g.includes(searchGenre))
            );
        }
        
        // AND between different filter categories (type AND industry AND genre)
        return matchesType && matchesIndustry && matchesGenre;
    });
}

// Get page title based on filters
function getPageTitle(params) {
    // Special case for cartoon - when both type=cartoon and genre=cartoon
    if (params.type && params.genre) {
        const types = params.type.split(',').map(t => t.trim().toLowerCase());
        const genres = params.genre.split(',').map(g => g.trim().toLowerCase());
        
        // If it's the cartoon filter (type=cartoon&genre=cartoon)
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
        // Handle comma-separated types
        const types = params.type.split(',').map(t => capitalizeFirst(t.trim())).filter(t => t);
        if (types.length > 1) {
            return types.join(' & ');
        }
        return `All ${capitalizeFirst(params.type)}`;
    } else if (params.industry) {
        // Handle comma-separated industries
        const industries = params.industry.split(',').map(i => capitalizeFirst(i.trim())).filter(i => i);
        if (industries.length > 1) {
            return industries.join(' & ');
        }
        return `${capitalizeFirst(params.industry)} Content`;
    } else if (params.genre) {
        // Handle comma-separated genres
        const genres = params.genre.split(',').map(g => capitalizeFirst(g.trim())).filter(g => g);
        if (genres.length > 1) {
            return genres.join(' & ');
        }
        return `${capitalizeFirst(params.genre)} Content`;
    }
    return 'Browse Content';
}

// Capitalize first letter
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Display filtered content
function displayContent(content) {
    const grid = document.getElementById('genreGrid');
    const resultCount = document.getElementById('resultCount');
    
    grid.innerHTML = '';
    
    if (content.length === 0) {
        grid.innerHTML = '<div class="no-results">No content found matching your filters</div>';
        resultCount.textContent = 'No results';
        return;
    }
    
    resultCount.textContent = `${content.length} ${content.length === 1 ? 'result' : 'results'}`;
    
    content.forEach(item => {
        grid.appendChild(createContentCard(item));
    });
}

// Update page header
function updatePageHeader(params) {
    const title = getPageTitle(params);
    document.getElementById('genreTitle').textContent = title;
    document.getElementById('pageTitle').textContent = `${title} - Chadcinema`;
}

// Load and display filtered content
async function loadGenreContent() {
    // Wait for data to load
    await DataManager.loadAllData();
    
    // Get URL parameters
    const params = getUrlParams();
    
    // Update page header
    updatePageHeader(params);
    
    // Filter content
    const filtered = filterContent(params);
    
    // Display content
    displayContent(filtered);
}

// Create search modal
function createSearchModal() {
    const modal = document.getElementById('searchModal');
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

// Setup search functionality
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
    
    // Real-time search as user types
    searchInput.addEventListener('input', (e) => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        searchTimeout = setTimeout(() => {
            performSearch();
        }, 300);
    });
    
    // Search on button click
    searchBtn.addEventListener('click', performSearch);
    
    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            performSearch();
        }
    });
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

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize auth
    Auth.initAuthUI();
    Auth.setupModal();
    
    // Setup features
    setupNavbar();
    setupSearch();
    setupMobileMenu();
    createSearchModal();
    setupWatchlistModal();
    
    // Load and display content
    await loadGenreContent();
});
