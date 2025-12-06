// Gallery 3D Carousel Implementation

let galleryData = [];
let currentCategory = 'all';
let currentRotation = 0;
let isAutoRotating = false;
let autoRotateInterval = null;
let isDragging = false;
let startX = 0;
let startRotation = 0;
let selectedIndex = 0;

const CAROUSEL_CONFIG = {
    radius: 500,
    itemAngle: 0,
    totalItems: 0,
    autoRotateSpeed: 0.3,
    dragSensitivity: 0.5
};

// Wait for DataManager to be available
function waitForDataManager() {
    return new Promise((resolve) => {
        if (window.DataManager) {
            resolve();
            return;
        }
        
        const checkInterval = setInterval(() => {
            if (window.DataManager) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 5000);
    });
}

// Initialize gallery
async function initGallery() {
    console.log('🎬 Initializing 3D Gallery...');
    
    // Wait for DataManager to be available
    await waitForDataManager();
    
    if (!window.DataManager) {
        console.error('DataManager not available after waiting');
        hideLoading();
        return;
    }
    
    // Load all data
    await DataManager.loadAllData();
    
    // Get all content
    galleryData = DataManager.getAll();
    
    if (galleryData.length === 0) {
        console.error('No content data available');
        hideLoading();
        return;
    }
    
    console.log(`✅ Loaded ${galleryData.length} items for gallery`);
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial category
    loadCategory('all');
    
    // Hide loading
    setTimeout(() => {
        hideLoading();
    }, 500);
}

// Load category
function loadCategory(category) {
    currentCategory = category;
    
    let filteredData = [];
    
    switch (category) {
        case 'all':
            filteredData = galleryData;
            break;
        case 'hollywood':
            filteredData = galleryData.filter(item => 
                item.industry && item.industry.toLowerCase() === 'hollywood'
            );
            break;
        case 'bollywood':
            filteredData = galleryData.filter(item => 
                item.industry && item.industry.toLowerCase() === 'bollywood'
            );
            break;
        case 'anime':
            filteredData = galleryData.filter(item => 
                item.type && item.type.toLowerCase() === 'anime'
            );
            break;
        case 'series':
            filteredData = galleryData.filter(item => 
                item.type && item.type.toLowerCase() === 'series'
            );
            break;
        default:
            filteredData = galleryData;
    }
    
    // Limit to 30 items for better performance
    filteredData = filteredData.slice(0, 30);
    
    console.log(`📁 Loading ${filteredData.length} items for category: ${category}`);
    
    buildCarousel(filteredData);
}

// Build the 3D carousel
function buildCarousel(items) {
    const carousel = document.getElementById('carousel');
    if (!carousel) return;
    
    // Clear existing items
    carousel.innerHTML = '';
    
    if (items.length === 0) {
        carousel.innerHTML = '<p style="color: var(--text-muted); position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">No items found</p>';
        return;
    }
    
    // Update config
    CAROUSEL_CONFIG.totalItems = items.length;
    CAROUSEL_CONFIG.itemAngle = 360 / items.length;
    
    // Create carousel items
    items.forEach((item, index) => {
        const carouselItem = createCarouselItem(item, index);
        carousel.appendChild(carouselItem);
    });
    
    // Position items
    positionCarouselItems();
    
    // Select first item
    updateSelectedInfo(items[0]);
}

// Create a single carousel item
function createCarouselItem(item, index) {
    const div = document.createElement('div');
    div.className = 'carousel-item';
    div.setAttribute('data-index', index);
    div.setAttribute('data-id', item.id);
    
    // Create image
    const img = document.createElement('img');
    img.src = item.image || 'https://via.placeholder.com/300x450?text=No+Image';
    img.alt = item.title || 'Movie poster';
    img.loading = 'lazy';
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'carousel-item-overlay';
    
    const title = document.createElement('div');
    title.className = 'carousel-item-title';
    title.textContent = item.title || 'Unknown';
    
    const year = document.createElement('div');
    year.className = 'carousel-item-year';
    year.textContent = item.year || 'N/A';
    
    overlay.appendChild(title);
    overlay.appendChild(year);
    
    // Create rating badge
    if (item.rating) {
        const rating = document.createElement('div');
        rating.className = 'carousel-item-rating';
        rating.textContent = `⭐ ${item.rating}`;
        div.appendChild(rating);
    }
    
    div.appendChild(img);
    div.appendChild(overlay);
    
    // Click handler
    div.addEventListener('click', () => {
        handleItemClick(item, index);
    });
    
    return div;
}

// Position carousel items in 3D space
function positionCarouselItems() {
    const items = document.querySelectorAll('.carousel-item');
    const radius = CAROUSEL_CONFIG.radius;
    
    items.forEach((item, index) => {
        const angle = CAROUSEL_CONFIG.itemAngle * index;
        const theta = (angle * Math.PI) / 180;
        
        const x = Math.sin(theta) * radius;
        const z = Math.cos(theta) * radius;
        
        item.style.transform = `
            translate3d(${x}px, 0, ${z}px)
            rotateY(${-angle}deg)
        `;
    });
    
    // Update carousel rotation
    updateCarouselRotation();
}

// Update carousel rotation
function updateCarouselRotation() {
    const carousel = document.getElementById('carousel');
    if (carousel) {
        carousel.style.transform = `rotateY(${currentRotation}deg)`;
    }
}

// Handle item click
function handleItemClick(item, index) {
    selectedIndex = index;
    
    // Rotate to center the clicked item
    const targetRotation = -CAROUSEL_CONFIG.itemAngle * index;
    animateRotation(currentRotation, targetRotation);
    
    // Update selected info
    updateSelectedInfo(item);
    
    // Highlight item
    highlightItem(index);
}

// Animate rotation
function animateRotation(from, to, duration = 500) {
    const start = Date.now();
    const diff = to - from;
    
    function animate() {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        
        currentRotation = from + diff * eased;
        updateCarouselRotation();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    animate();
}

// Update selected info panel
function updateSelectedInfo(item) {
    const title = document.getElementById('selectedTitle');
    const meta = document.getElementById('selectedMeta');
    const genres = document.getElementById('selectedGenres');
    const watchBtn = document.getElementById('watchBtn');
    
    if (title) title.textContent = item.title || 'Unknown';
    
    if (meta) {
        meta.innerHTML = '';
        
        if (item.year) {
            const yearSpan = document.createElement('span');
            yearSpan.textContent = `📅 ${item.year}`;
            meta.appendChild(yearSpan);
        }
        
        if (item.rating) {
            const ratingSpan = document.createElement('span');
            ratingSpan.textContent = `⭐ ${item.rating}`;
            meta.appendChild(ratingSpan);
        }
        
        if (item.type) {
            const typeSpan = document.createElement('span');
            typeSpan.textContent = `🎬 ${item.type}`;
            meta.appendChild(typeSpan);
        }
    }
    
    if (genres) {
        genres.innerHTML = '';
        
        if (item.genres && Array.isArray(item.genres)) {
            item.genres.slice(0, 5).forEach(genre => {
                const genreTag = document.createElement('span');
                genreTag.className = 'selected-genre';
                genreTag.textContent = genre;
                genres.appendChild(genreTag);
            });
        }
    }
    
    if (watchBtn) {
        watchBtn.style.display = 'inline-flex';
        watchBtn.onclick = () => {
            window.location.href = `detail.html?id=${item.id}`;
        };
    }
}

// Highlight item
function highlightItem(index) {
    const items = document.querySelectorAll('.carousel-item');
    items.forEach((item, i) => {
        if (i === index) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Category buttons
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            categoryBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Load category
            const category = btn.getAttribute('data-category');
            loadCategory(category);
        });
    });
    
    // Previous button
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            rotate(-CAROUSEL_CONFIG.itemAngle);
            selectedIndex = (selectedIndex - 1 + CAROUSEL_CONFIG.totalItems) % CAROUSEL_CONFIG.totalItems;
            updateSelectedFromIndex();
        });
    }
    
    // Next button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            rotate(CAROUSEL_CONFIG.itemAngle);
            selectedIndex = (selectedIndex + 1) % CAROUSEL_CONFIG.totalItems;
            updateSelectedFromIndex();
        });
    }
    
    // Auto-rotate button
    const autoRotateBtn = document.getElementById('autoRotateBtn');
    if (autoRotateBtn) {
        autoRotateBtn.addEventListener('click', () => {
            toggleAutoRotate();
            autoRotateBtn.classList.toggle('active');
        });
    }
    
    // Drag controls
    const carouselScene = document.getElementById('carouselScene');
    if (carouselScene) {
        // Mouse events
        carouselScene.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDragMove);
        document.addEventListener('mouseup', handleDragEnd);
        
        // Touch events
        carouselScene.addEventListener('touchstart', handleDragStart);
        document.addEventListener('touchmove', handleDragMove);
        document.addEventListener('touchend', handleDragEnd);
    }
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            rotate(-CAROUSEL_CONFIG.itemAngle);
            selectedIndex = (selectedIndex - 1 + CAROUSEL_CONFIG.totalItems) % CAROUSEL_CONFIG.totalItems;
            updateSelectedFromIndex();
        } else if (e.key === 'ArrowRight') {
            rotate(CAROUSEL_CONFIG.itemAngle);
            selectedIndex = (selectedIndex + 1) % CAROUSEL_CONFIG.totalItems;
            updateSelectedFromIndex();
        }
    });
}

// Rotate carousel
function rotate(angle) {
    currentRotation += angle;
    updateCarouselRotation();
}

// Toggle auto-rotate
function toggleAutoRotate() {
    isAutoRotating = !isAutoRotating;
    
    if (isAutoRotating) {
        autoRotateInterval = setInterval(() => {
            currentRotation += CAROUSEL_CONFIG.autoRotateSpeed;
            updateCarouselRotation();
        }, 16); // ~60fps
    } else {
        if (autoRotateInterval) {
            clearInterval(autoRotateInterval);
            autoRotateInterval = null;
        }
    }
}

// Handle drag start
function handleDragStart(e) {
    isDragging = true;
    startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    startRotation = currentRotation;
    
    // Stop auto-rotate if active
    if (isAutoRotating) {
        toggleAutoRotate();
        document.getElementById('autoRotateBtn').classList.remove('active');
    }
}

// Handle drag move
function handleDragMove(e) {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const currentX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const deltaX = currentX - startX;
    
    currentRotation = startRotation + (deltaX * CAROUSEL_CONFIG.dragSensitivity);
    updateCarouselRotation();
}

// Handle drag end
function handleDragEnd() {
    if (!isDragging) return;
    
    isDragging = false;
    
    // Snap to nearest item
    const nearestIndex = Math.round(-currentRotation / CAROUSEL_CONFIG.itemAngle);
    const targetRotation = -nearestIndex * CAROUSEL_CONFIG.itemAngle;
    
    animateRotation(currentRotation, targetRotation, 300);
    
    // Update selected index
    selectedIndex = ((nearestIndex % CAROUSEL_CONFIG.totalItems) + CAROUSEL_CONFIG.totalItems) % CAROUSEL_CONFIG.totalItems;
    updateSelectedFromIndex();
}

// Update selected info from current index
function updateSelectedFromIndex() {
    const items = document.querySelectorAll('.carousel-item');
    if (items[selectedIndex]) {
        const itemId = items[selectedIndex].getAttribute('data-id');
        const item = galleryData.find(i => i.id === itemId);
        if (item) {
            updateSelectedInfo(item);
            highlightItem(selectedIndex);
        }
    }
}

// Hide loading indicator
function hideLoading() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize auth
    if (window.Auth) {
        Auth.initAuthUI();
        Auth.setupModal();
    }
    
    // Setup mobile menu
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });
    }
    
    // Initialize gallery
    await initGallery();
});

// Handle window resize
window.addEventListener('resize', () => {
    // Adjust radius for smaller screens
    if (window.innerWidth < 768) {
        CAROUSEL_CONFIG.radius = 400;
    } else if (window.innerWidth < 480) {
        CAROUSEL_CONFIG.radius = 350;
    } else {
        CAROUSEL_CONFIG.radius = 500;
    }
    
    positionCarouselItems();
});
