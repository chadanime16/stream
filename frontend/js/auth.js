// Authentication Manager
const Auth = {
    // Check if user is logged in
    isLoggedIn() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
        const user = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return !!(token && user);
    },
    
    // Get current user
    getUser() {
        const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    },
    
    // Save auth data
    saveAuth(token, user) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
    },
    
    // Clear auth data
    clearAuth() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },
    
    // Verify token
    async verifyToken() {
        try {
            const data = await API.auth.verify();
            return data;
        } catch (error) {
            this.clearAuth();
            return null;
        }
    },
    
    // Initialize auth UI
    initAuthUI() {
        const userInfo = document.getElementById('userInfo');
        const authButtons = document.getElementById('authButtons');
        const usernameDisplay = document.getElementById('usernameDisplay');
        const userDropdown = document.getElementById('userDropdown');
        const userBtn = document.getElementById('userBtn');
        
        if (this.isLoggedIn()) {
            const user = this.getUser();
            userInfo.style.display = 'block';
            authButtons.style.display = 'none';
            if (usernameDisplay) {
                usernameDisplay.textContent = user.username;
            }
        } else {
            userInfo.style.display = 'none';
            authButtons.style.display = 'block';
        }
        
        // Toggle dropdown
        if (userBtn && userDropdown) {
            userBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }
    },
    
    // Setup modal
    setupModal() {
        const modal = document.getElementById('authModal');
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const modalClose = document.getElementById('modalClose');
        const showSignup = document.getElementById('showSignup');
        const showLogin = document.getElementById('showLogin');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        const logoutBtn = document.getElementById('logoutBtn');
        
        // Show login modal
        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                modal.classList.add('show');
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
            });
        }
        
        // Show signup modal
        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                modal.classList.add('show');
                signupForm.style.display = 'block';
                loginForm.style.display = 'none';
            });
        }
        
        // Close modal
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                modal.classList.remove('show');
            });
        }
        
        // Close modal on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
        
        // Switch to signup
        if (showSignup) {
            showSignup.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
            });
        }
        
        // Switch to login
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                signupForm.style.display = 'none';
                loginForm.style.display = 'block';
            });
        }
        
        // Logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.clearAuth();
                showToast('Logged out successfully', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            });
        }
        
        // Handle login form
        const loginFormElement = document.getElementById('loginFormElement');
        if (loginFormElement) {
            loginFormElement.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const pin = document.getElementById('loginPin').value;
                const errorEl = document.getElementById('loginError');
                
                try {
                    const data = await API.auth.login(email, pin);
                    this.saveAuth(data.token, data.user);
                    modal.classList.remove('show');
                    showToast('Login successful!', 'success');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                } catch (error) {
                    errorEl.textContent = error.message;
                    errorEl.classList.add('show');
                }
            });
        }
        
        // Handle signup form
        const signupFormElement = document.getElementById('signupFormElement');
        if (signupFormElement) {
            signupFormElement.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('signupUsername').value;
                const email = document.getElementById('signupEmail').value;
                const pin = document.getElementById('signupPin').value;
                const errorEl = document.getElementById('signupError');
                
                if (pin.length !== 6 || !/^\d+$/.test(pin)) {
                    errorEl.textContent = 'PIN must be exactly 6 digits';
                    errorEl.classList.add('show');
                    return;
                }
                
                try {
                    await API.auth.signup(username, email, pin);
                    showToast('Account created! Please login.', 'success');
                    signupForm.style.display = 'none';
                    loginForm.style.display = 'block';
                    signupFormElement.reset();
                } catch (error) {
                    errorEl.textContent = error.message;
                    errorEl.classList.add('show');
                }
            });
        }
    }
};

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
