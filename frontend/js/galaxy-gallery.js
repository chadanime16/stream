// Galaxy Gallery - Liquid Fluid Canvas with All Movies
// All items shown, canvas is pannable, fluid like water

let allMovies = [];
let movieCanvas = null;
let movieCtx = null;
let backgroundCanvas = null;
let backgroundCtx = null;
let cells = [];
let loadedImages = new Map();
let loadingImages = new Set();

// View/Pan state
let viewX = 0;
let viewY = 0;
let targetViewX = 0;
let targetViewY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragViewStartX = 0;
let dragViewStartY = 0;

// Mouse state
let mouseX = -1000;
let mouseY = -1000;
let mouseWorldX = 0;
let mouseWorldY = 0;
let hoveredCell = null;
let time = 0;

// Ripple effects
let ripples = [];

// Grid dimensions
let gridWidth = 0;
let gridHeight = 0;
let cols = 0;
let rows = 0;

// Galaxy Configuration
const GALAXY_CONFIG = {
    cellWidth: 50,
    cellHeight: 75,
    cellGap: 4,
    loadRadius: 250,
    // Fluid motion
    waveAmplitude: 12,
    waveSpeed: 0.0015,
    waveFrequency: 0.006,
    // Ripple effect
    rippleSpeed: 3,
    rippleDecay: 0.97,
    rippleStrength: 25,
    // View smoothing
    viewSmoothing: 0.08,
    // Colors for glow
    glowColors: [
        [255, 51, 51],
        [255, 107, 53],
        [138, 43, 226],
        [0, 191, 255],
        [50, 205, 50],
        [255, 20, 147],
        [255, 215, 0],
        [0, 255, 127],
        [255, 140, 0],
        [148, 0, 211]
    ]
};

// Wait for DataManager
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
        }, 50);
        setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
        }, 5000);
    });
}

// Initialize Galaxy
async function initGalaxy() {
    console.log('🌊 Initializing Liquid Movie Galaxy...');
    updateLoadingProgress(10);
    
    await waitForDataManager();
    
    if (!window.DataManager) {
        console.error('DataManager not available');
        hideLoading();
        return;
    }
    
    updateLoadingProgress(30);
    await DataManager.loadAllData();
    
    updateLoadingProgress(50);
    allMovies = DataManager.getAll();
    
    if (allMovies.length === 0) {
        console.error('No movies loaded');
        hideLoading();
        return;
    }
    
    console.log(`✅ Loaded ${allMovies.length} movies - showing ALL`);
    
    // Shuffle for variety
    allMovies = shuffleArray(allMovies);
    
    updateLoadingProgress(70);
    
    // Initialize canvases
    initCanvases();
    
    // Create ALL cells for ALL movies
    createAllCells();
    
    // Center view initially
    centerView();
    
    updateLoadingProgress(90);
    
    setupEventListeners();
    
    updateLoadingProgress(100);
    
    startAnimation();
    
    setTimeout(hideLoading, 300);
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function initCanvases() {
    backgroundCanvas = document.getElementById('backgroundCanvas');
    if (backgroundCanvas) {
        backgroundCtx = backgroundCanvas.getContext('2d');
    }
    
    movieCanvas = document.getElementById('movieCanvas');
    if (movieCanvas) {
        movieCtx = movieCanvas.getContext('2d');
    }
    
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
}

function resizeCanvases() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    if (backgroundCanvas) {
        backgroundCanvas.width = w;
        backgroundCanvas.height = h;
    }
    if (movieCanvas) {
        movieCanvas.width = w;
        movieCanvas.height = h;
    }
}

// Create cells for ALL movies
function createAllCells() {
    cells = [];
    
    const totalMovies = allMovies.length;
    const cellW = GALAXY_CONFIG.cellWidth + GALAXY_CONFIG.cellGap;
    const cellH = GALAXY_CONFIG.cellHeight + GALAXY_CONFIG.cellGap;
    
    // Calculate grid to fit all movies
    // Make it roughly square-ish but wider
    const aspectRatio = 1.5;
    cols = Math.ceil(Math.sqrt(totalMovies * aspectRatio));
    rows = Math.ceil(totalMovies / cols);
    
    gridWidth = cols * cellW;
    gridHeight = rows * cellH;
    
    console.log(`📐 Grid: ${cols}x${rows} = ${cols * rows} cells for ${totalMovies} movies`);
    console.log(`📐 Grid size: ${gridWidth}x${gridHeight}px`);
    
    for (let i = 0; i < totalMovies; i++) {
        const movie = allMovies[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const colorIndex = (row + col) % GALAXY_CONFIG.glowColors.length;
        
        cells.push({
            index: i,
            baseX: col * cellW,
            baseY: row * cellH,
            x: col * cellW,
            y: row * cellH,
            width: GALAXY_CONFIG.cellWidth,
            height: GALAXY_CONFIG.cellHeight,
            movie: movie,
            glowColor: GALAXY_CONFIG.glowColors[colorIndex],
            phase: Math.random() * Math.PI * 2,
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            imageLoaded: false,
            rippleOffset: { x: 0, y: 0 }
        });
    }
}

function centerView() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // Center the grid in the view
    targetViewX = (gridWidth - w) / 2;
    targetViewY = (gridHeight - h) / 2;
    viewX = targetViewX;
    viewY = targetViewY;
}

// Load image
function loadCellImage(cell) {
    if (!cell.movie || !cell.movie.image) return;
    
    const imageUrl = cell.movie.image;
    
    if (loadedImages.has(imageUrl)) {
        cell.imageLoaded = true;
        return;
    }
    
    if (loadingImages.has(imageUrl)) return;
    
    loadingImages.add(imageUrl);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        loadedImages.set(imageUrl, img);
        loadingImages.delete(imageUrl);
        cell.imageLoaded = true;
    };
    img.onerror = () => {
        loadingImages.delete(imageUrl);
    };
    img.src = imageUrl;
}

// Add ripple at position
function addRipple(x, y) {
    ripples.push({
        x: x,
        y: y,
        radius: 0,
        strength: GALAXY_CONFIG.rippleStrength,
        maxRadius: 400
    });
}

// Update ripples
function updateRipples() {
    for (let i = ripples.length - 1; i >= 0; i--) {
        const ripple = ripples[i];
        ripple.radius += GALAXY_CONFIG.rippleSpeed;
        ripple.strength *= GALAXY_CONFIG.rippleDecay;
        
        if (ripple.strength < 0.1 || ripple.radius > ripple.maxRadius) {
            ripples.splice(i, 1);
        }
    }
}

// Calculate ripple displacement at a point
function getRippleDisplacement(x, y) {
    let dx = 0;
    let dy = 0;
    
    for (const ripple of ripples) {
        const distX = x - ripple.x;
        const distY = y - ripple.y;
        const dist = Math.sqrt(distX * distX + distY * distY);
        
        if (dist > 0 && dist < ripple.maxRadius) {
            const wave = Math.sin((dist - ripple.radius) * 0.1) * ripple.strength;
            const falloff = 1 - (dist / ripple.maxRadius);
            const displacement = wave * falloff;
            
            dx += (distX / dist) * displacement;
            dy += (distY / dist) * displacement;
        }
    }
    
    return { x: dx, y: dy };
}

// Draw background
function drawBackground() {
    if (!backgroundCtx || !backgroundCanvas) return;
    
    const ctx = backgroundCtx;
    const w = backgroundCanvas.width;
    const h = backgroundCanvas.height;
    
    // Dark gradient background
    const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h));
    gradient.addColorStop(0, '#0d0d0d');
    gradient.addColorStop(1, '#050505');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    // Animated wave dots
    const spacing = 35;
    
    for (let x = 0; x < w + spacing; x += spacing) {
        for (let y = 0; y < h + spacing; y += spacing) {
            // Convert screen to world coords
            const worldX = x + viewX;
            const worldY = y + viewY;
            
            // Wave motion
            const wave1 = Math.sin(worldX * 0.008 + time * 0.001) * 3;
            const wave2 = Math.cos(worldY * 0.008 + time * 0.0012) * 3;
            
            // Ripple effect
            const ripple = getRippleDisplacement(worldX, worldY);
            
            const drawX = x + wave1 + ripple.x * 0.3;
            const drawY = y + wave2 + ripple.y * 0.3;
            
            // Mouse glow
            const mouseDist = Math.sqrt(Math.pow(x - mouseX, 2) + Math.pow(y - mouseY, 2));
            const mouseGlow = Math.max(0, 1 - mouseDist / 200);
            
            const opacity = 0.02 + mouseGlow * 0.05;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(drawX, drawY, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Draw all cells
function drawCells() {
    if (!movieCtx || !movieCanvas) return;
    
    const ctx = movieCtx;
    const w = movieCanvas.width;
    const h = movieCanvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    hoveredCell = null;
    let closestDist = Infinity;
    
    // Only draw cells in view (optimization)
    const viewLeft = viewX - 100;
    const viewRight = viewX + w + 100;
    const viewTop = viewY - 100;
    const viewBottom = viewY + h + 100;
    
    cells.forEach((cell) => {
        // Skip if outside view
        if (cell.baseX + cell.width < viewLeft || cell.baseX > viewRight ||
            cell.baseY + cell.height < viewTop || cell.baseY > viewBottom) {
            return;
        }
        
        // Fluid wave motion
        const waveX = Math.sin(time * GALAXY_CONFIG.waveSpeed + cell.baseY * GALAXY_CONFIG.waveFrequency + cell.phaseX) * GALAXY_CONFIG.waveAmplitude;
        const waveY = Math.cos(time * GALAXY_CONFIG.waveSpeed * 0.8 + cell.baseX * GALAXY_CONFIG.waveFrequency + cell.phaseY) * GALAXY_CONFIG.waveAmplitude;
        
        // Secondary wave for more organic motion
        const wave2X = Math.sin(time * GALAXY_CONFIG.waveSpeed * 1.3 + cell.baseX * 0.004 + cell.phase) * (GALAXY_CONFIG.waveAmplitude * 0.5);
        const wave2Y = Math.cos(time * GALAXY_CONFIG.waveSpeed * 1.1 + cell.baseY * 0.004 + cell.phase) * (GALAXY_CONFIG.waveAmplitude * 0.5);
        
        // Ripple displacement
        const ripple = getRippleDisplacement(cell.baseX, cell.baseY);
        
        // Final position
        cell.x = cell.baseX + waveX + wave2X + ripple.x;
        cell.y = cell.baseY + waveY + wave2Y + ripple.y;
        
        // Screen position
        const screenX = cell.x - viewX;
        const screenY = cell.y - viewY;
        
        // Distance from mouse (in world coords)
        const cellCenterX = cell.x + cell.width / 2;
        const cellCenterY = cell.y + cell.height / 2;
        const distToMouse = Math.sqrt(
            Math.pow(mouseWorldX - cellCenterX, 2) + 
            Math.pow(mouseWorldY - cellCenterY, 2)
        );
        
        // Check hover
        if (mouseWorldX >= cell.x && mouseWorldX <= cell.x + cell.width &&
            mouseWorldY >= cell.y && mouseWorldY <= cell.y + cell.height) {
            if (distToMouse < closestDist) {
                closestDist = distToMouse;
                hoveredCell = cell;
            }
        }
        
        // Load image if near mouse
        if (distToMouse < GALAXY_CONFIG.loadRadius) {
            loadCellImage(cell);
        }
        
        // Draw cell
        drawCell(ctx, cell, screenX, screenY, distToMouse);
    });
    
    updateHoverState();
}

function drawCell(ctx, cell, screenX, screenY, distToMouse) {
    const isNearMouse = distToMouse < GALAXY_CONFIG.loadRadius;
    const isHovered = cell === hoveredCell;
    
    // Scale based on proximity and hover
    let scale = 1;
    if (isHovered) {
        scale = 1.4;
    } else if (isNearMouse) {
        scale = 1 + (1 - distToMouse / GALAXY_CONFIG.loadRadius) * 0.2;
    }
    
    const scaledW = cell.width * scale;
    const scaledH = cell.height * scale;
    const offsetX = (scaledW - cell.width) / 2;
    const offsetY = (scaledH - cell.height) / 2;
    
    const x = screenX - offsetX;
    const y = screenY - offsetY;
    
    ctx.save();
    
    // Clip to rounded rect
    const radius = 5 * scale;
    ctx.beginPath();
    ctx.roundRect(x, y, scaledW, scaledH, radius);
    ctx.clip();
    
    const imageUrl = cell.movie?.image;
    const img = loadedImages.get(imageUrl);
    
    if (img && cell.imageLoaded) {
        // Draw image
        ctx.drawImage(img, x, y, scaledW, scaledH);
        
        // Darken if not near mouse
        if (!isHovered && !isNearMouse) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x, y, scaledW, scaledH);
        }
    } else {
        // Blurred glow placeholder
        const [r, g, b] = cell.glowColor;
        
        // Pulsating glow
        const pulse = 0.5 + Math.sin(time * 0.003 + cell.phase) * 0.2;
        
        const gradient = ctx.createRadialGradient(
            x + scaledW / 2, y + scaledH / 2, 0,
            x + scaledW / 2, y + scaledH / 2, scaledW
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.5 * pulse})`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.25 * pulse})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${0.05 * pulse})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, scaledW, scaledH);
        
        // Subtle inner highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.03 * pulse})`;
        ctx.fillRect(x, y, scaledW, scaledH * 0.3);
    }
    
    ctx.restore();
    
    // Glow border for hovered
    if (isHovered) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 51, 51, 0.9)';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 51, 51, 1)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.roundRect(x, y, scaledW, scaledH, radius);
        ctx.stroke();
        ctx.restore();
    }
}

function updateHoverState() {
    const infoPanel = document.getElementById('infoPanel');
    const preview = document.getElementById('hoverPreview');
    const previewImg = document.getElementById('previewImg');
    
    if (hoveredCell && hoveredCell.movie) {
        const movie = hoveredCell.movie;
        updateInfoPanel(movie);
        if (infoPanel) infoPanel.classList.add('visible');
        
        const img = loadedImages.get(movie.image);
        if (img && preview && previewImg) {
            previewImg.src = movie.image;
            preview.classList.add('visible');
            
            const pw = 180, ph = 270, pad = 20;
            let px = mouseX + pad;
            let py = mouseY - ph / 2;
            
            if (px + pw > window.innerWidth - pad) px = mouseX - pw - pad;
            if (py < pad) py = pad;
            if (py + ph > window.innerHeight - pad) py = window.innerHeight - ph - pad;
            
            preview.style.left = `${px}px`;
            preview.style.top = `${py}px`;
        }
    } else {
        if (infoPanel) infoPanel.classList.remove('visible');
        if (preview) preview.classList.remove('visible');
    }
}

function updateInfoPanel(movie) {
    const infoTitle = document.getElementById('infoTitle');
    const infoTagline = document.getElementById('infoTagline');
    const infoRating = document.getElementById('infoRating');
    const infoGenres = document.getElementById('infoGenres');
    
    if (infoTitle) {
        const year = movie.year ? `<span>(${movie.year})</span>` : '';
        infoTitle.innerHTML = `${movie.title || 'Unknown'} ${year}`;
    }
    
    if (infoTagline) {
        infoTagline.textContent = movie.tagline || (movie.description ? movie.description.substring(0, 100) + '...' : 'Click to watch');
    }
    
    if (infoRating) {
        const rating = movie.rating ? Math.round(movie.rating * 10) : '--';
        infoRating.textContent = typeof rating === 'number' ? `${rating}%` : rating;
    }
    
    if (infoGenres) {
        infoGenres.innerHTML = '';
        (movie.genres || []).slice(0, 3).forEach(genre => {
            const span = document.createElement('span');
            span.className = 'info-genre';
            span.textContent = genre;
            infoGenres.appendChild(span);
        });
    }
}

function startAnimation() {
    function animate() {
        time++;
        
        // Smooth view panning
        viewX += (targetViewX - viewX) * GALAXY_CONFIG.viewSmoothing;
        viewY += (targetViewY - viewY) * GALAXY_CONFIG.viewSmoothing;
        
        // Clamp view
        const w = window.innerWidth;
        const h = window.innerHeight;
        viewX = Math.max(0, Math.min(gridWidth - w, viewX));
        viewY = Math.max(0, Math.min(gridHeight - h, viewY));
        targetViewX = Math.max(0, Math.min(gridWidth - w, targetViewX));
        targetViewY = Math.max(0, Math.min(gridHeight - h, targetViewY));
        
        // Update ripples
        updateRipples();
        
        drawBackground();
        drawCells();
        
        requestAnimationFrame(animate);
    }
    animate();
}

function setupEventListeners() {
    // Mouse move
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        mouseWorldX = mouseX + viewX;
        mouseWorldY = mouseY + viewY;
        
        if (isDragging) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            targetViewX = dragViewStartX - dx;
            targetViewY = dragViewStartY - dy;
        }
    });
    
    // Mouse down - start drag
    if (movieCanvas) {
        movieCanvas.addEventListener('mousedown', (e) => {
            // Only start drag if not on a hovered cell
            if (!hoveredCell) {
                isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                dragViewStartX = targetViewX;
                dragViewStartY = targetViewY;
                movieCanvas.style.cursor = 'grabbing';
            }
        });
        
        movieCanvas.addEventListener('click', (e) => {
            // Add ripple on click
            addRipple(mouseWorldX, mouseWorldY);
            
            // Navigate if clicking a cell
            if (hoveredCell && hoveredCell.movie && hoveredCell.movie.id) {
                window.location.href = `detail.html?id=${hoveredCell.movie.id}`;
            }
        });
    }
    
    // Mouse up - end drag
    document.addEventListener('mouseup', () => {
        isDragging = false;
        if (movieCanvas) movieCanvas.style.cursor = 'pointer';
    });
    
    // Mouse leave
    document.addEventListener('mouseleave', () => {
        mouseX = -1000;
        mouseY = -1000;
        isDragging = false;
    });
    
    // Touch events for mobile
    if (movieCanvas) {
        let touchStartX = 0, touchStartY = 0;
        
        movieCanvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            dragViewStartX = targetViewX;
            dragViewStartY = targetViewY;
            isDragging = true;
        });
        
        movieCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            mouseWorldX = mouseX + viewX;
            mouseWorldY = mouseY + viewY;
            
            if (isDragging) {
                const dx = touch.clientX - touchStartX;
                const dy = touch.clientY - touchStartY;
                targetViewX = dragViewStartX - dx;
                targetViewY = dragViewStartY - dy;
            }
        });
        
        movieCanvas.addEventListener('touchend', () => {
            isDragging = false;
            addRipple(mouseWorldX, mouseWorldY);
        });
    }
    
    // Mouse wheel to zoom/scroll
    document.addEventListener('wheel', (e) => {
        e.preventDefault();
        targetViewX += e.deltaX;
        targetViewY += e.deltaY;
    }, { passive: false });
    
    // Fullscreen
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen();
            }
        });
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        const speed = 100;
        switch(e.key) {
            case 'ArrowUp': targetViewY -= speed; break;
            case 'ArrowDown': targetViewY += speed; break;
            case 'ArrowLeft': targetViewX -= speed; break;
            case 'ArrowRight': targetViewX += speed; break;
            case 'Home': centerView(); break;
        }
    });
}

function updateLoadingProgress(percent) {
    const el = document.getElementById('loadingProgress');
    if (el) el.textContent = `${percent}%`;
}

function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', initGalaxy);
