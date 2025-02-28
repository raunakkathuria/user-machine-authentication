// Brand-Platform Authentication Demo - Main JavaScript

// Store authentication data
let authToken = null;
let currentUser = null;
let platformToken = null;
let platformTokenId = null;

// DOM Elements
const sections = {
    welcome: document.getElementById('welcome-section'),
    login: document.getElementById('login-section'),
    register: document.getElementById('register-section'),
    dashboard: document.getElementById('dashboard-section')
};

const navItems = {
    login: document.getElementById('login-nav'),
    register: document.getElementById('register-nav'),
    dashboard: document.getElementById('dashboard-nav'),
    logout: document.getElementById('logout-nav')
};

// Form Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

// Dashboard Elements
const userNameDisplay = document.getElementById('user-name');
const userEmailDisplay = document.getElementById('user-email');
const userIdDisplay = document.getElementById('user-id');
const tokenInfoDisplay = document.getElementById('token-info');
const revokeTokenBtn = document.getElementById('revoke-token-btn');

// Navigation Event Listeners
document.getElementById('login-link').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('login');
});

document.getElementById('register-link').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('register');
});

document.getElementById('dashboard-link').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('dashboard');
});

document.getElementById('logout-link').addEventListener('click', (e) => {
    e.preventDefault();
    logout();
});

// Welcome Button Listeners
document.getElementById('welcome-login-btn').addEventListener('click', () => {
    showSection('login');
});

document.getElementById('welcome-register-btn').addEventListener('click', () => {
    showSection('register');
});

// Platform Access Buttons
document.getElementById('access-platform-btn').addEventListener('click', () => {
    accessPlatform('trading');
});

// Token Revocation
revokeTokenBtn.addEventListener('click', () => {
    revokeToken();
});

// Form Submissions
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginUser();
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    registerUser();
});

// Check if user is already logged in (token in localStorage)
function checkAuthStatus() {
    // Check for URL parameters that might indicate token expiration or refresh needs
    const queryParams = new URLSearchParams(window.location.search);
    const error = queryParams.get('error');
    const refresh = queryParams.get('refresh');
    const platform = queryParams.get('platform');
    const redirect = queryParams.get('redirect');
    
    // Track if we need to auto-redirect after login
    if (platform && redirect === 'true') {
        // Store the platform to redirect to after successful login
        sessionStorage.setItem('redirectPlatform', platform);
        
        // Show login form with message about platform access
        document.getElementById('login-message').textContent = 
            `Login to access the ${platform.toUpperCase()} trading platform`;
        document.getElementById('login-message').classList.remove('d-none');
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show login section
        showSection('login');
        return;
    }
    
    // Handle error from platform (e.g., expired token)
    if (error === 'session_expired' && platform) {
        // Show message to user
        alert(`Your session on the ${platform.toUpperCase()} platform has expired. Please log in again to continue.`);
        
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Handle refresh request from platform
    if (refresh === 'true' && platform) {
        const storedToken = localStorage.getItem('authToken');
        
        if (storedToken) {
            authToken = storedToken;
            
            // Silently refresh and redirect back to platform
            (async () => {
                try {
                    await getCurrentUser();
                    accessPlatform(platform);
                } catch (error) {
                    console.error('Error refreshing token:', error);
                    showSection('login');
                }
            })();
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
    }
    
    // Normal authentication check
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
        authToken = storedToken;
        
        // Check if we should redirect to a platform after login
        const redirectPlatform = sessionStorage.getItem('redirectPlatform');
        if (redirectPlatform) {
            sessionStorage.removeItem('redirectPlatform');
            
            // Need to wait until we have the user data
            getCurrentUser().then(() => {
                // Redirect to platform
                accessPlatform(redirectPlatform);
            }).catch(error => {
                console.error('Error getting user before platform redirect:', error);
                showSection('dashboard');
            });
        } else {
            getCurrentUser();
        }
    } else {
        showSection('welcome');
    }
}

// Show/hide sections
function showSection(sectionName) {
    // Hide all sections
    Object.values(sections).forEach(section => {
        section.classList.add('d-none');
    });
    
    // Show the requested section
    sections[sectionName].classList.remove('d-none');
    sections[sectionName].classList.add('fade-in');
}

// Update navigation based on auth state
function updateNavigation(isLoggedIn) {
    if (isLoggedIn) {
        navItems.login.classList.add('d-none');
        navItems.register.classList.add('d-none');
        navItems.dashboard.classList.remove('d-none');
        navItems.logout.classList.remove('d-none');
    } else {
        navItems.login.classList.remove('d-none');
        navItems.register.classList.remove('d-none');
        navItems.dashboard.classList.add('d-none');
        navItems.logout.classList.add('d-none');
    }
}

// API Functions
async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }
        
        // Store the token
        authToken = data.session.access_token;
        localStorage.setItem('authToken', authToken);
        
        // Store user data
        currentUser = data.user;
        
        // Update UI
        updateUserInfo();
        updateNavigation(true);
        showSection('dashboard');
        
        // Clear form and errors
        loginForm.reset();
        loginError.classList.add('d-none');
        
    } catch (error) {
        loginError.textContent = error.message;
        loginError.classList.remove('d-none');
        console.error('Login error:', error);
    }
}

async function registerUser() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const first_name = document.getElementById('first-name').value;
    const last_name = document.getElementById('last-name').value;
    
    try {
        const response = await fetch('/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, first_name, last_name })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }
        
        // Store the token
        authToken = data.session.access_token;
        localStorage.setItem('authToken', authToken);
        
        // Store user data
        currentUser = data.user;
        
        // Update UI
        updateUserInfo();
        updateNavigation(true);
        showSection('dashboard');
        
        // Clear form and errors
        registerForm.reset();
        registerError.classList.add('d-none');
        
    } catch (error) {
        registerError.textContent = error.message;
        registerError.classList.remove('d-none');
        console.error('Registration error:', error);
    }
}

async function getCurrentUser() {
    try {
        const response = await fetch('/auth/me', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            // Token might be invalid or expired
            logout();
            return;
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // Update UI
        updateUserInfo();
        updateNavigation(true);
        showSection('dashboard');
        
    } catch (error) {
        console.error('Error getting user:', error);
        logout();
    }
}

async function logout() {
    try {
        // Revoke platform token if exists
        if (platformToken) {
            await revokeToken();
        }
        
        // Call logout endpoint
        if (authToken) {
            await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }
    } catch (error) {
        console.error('Error during logout:', error);
    } finally {
        // Clear stored data
        authToken = null;
        currentUser = null;
        platformToken = null;
        platformTokenId = null;
        localStorage.removeItem('authToken');
        
        // Update UI
        updateNavigation(false);
        showSection('welcome');
    }
}

async function accessPlatform(platformId) {
    try {
        const response = await fetch('/platform/access-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ platformId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to access platform');
        }
        
        // Store token information
        platformToken = data.platform_access_token;
        platformTokenId = data.token_id;
        
        // Update token display
        updateTokenDisplay();
        
        // Use our new header-based API approach instead of query params
        const platformBaseUrl = 'http://localhost:3001';
        
        // Create HTML page with auth header to open in new tab
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Redirecting to Platform</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background-color: #f4f4f4; }
            .loader { border: 5px solid #f3f3f3; border-top: 5px solid #3498db; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Redirecting to Platform</h2>
            <div class="loader"></div>
            <p>Please wait, you are being redirected to the trading platform...</p>
          </div>
          
          <script>
            // Store token in variable (never expose to HTML)
            const token = "${platformToken}";
            
            // The issue is likely CORS-related with the fetch API
            // Let's use a simpler approach with a form that will submit the token
            
            // Create a form that will submit the token
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = '${platformBaseUrl}/auth/validate';
            form.style.display = 'none';
            
            // Add token as a hidden field
            const tokenField = document.createElement('input');
            tokenField.type = 'hidden';
            tokenField.name = 'token';
            tokenField.value = token;
            form.appendChild(tokenField);
            
            // Add to the document and submit
            document.body.appendChild(form);
            setTimeout(() => {
              form.submit();
            }, 500); // Small delay to show the loading animation
          </script>
        </body>
        </html>`;
        
        // Create a blob URL for the HTML content
        const blob = new Blob([html], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        
        // Open the blob URL in a new tab
        window.open(blobUrl, '_blank');
        
    } catch (error) {
        alert(`Error accessing platform: ${error.message}`);
        console.error('Platform access error:', error);
    }
}

async function revokeToken() {
    if (!platformToken || !platformTokenId) {
        return;
    }
    
    try {
        const response = await fetch('/platform/revoke-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ token_id: platformTokenId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to revoke token');
        }
        
        // Clear token data
        platformToken = null;
        platformTokenId = null;
        
        // Update UI
        updateTokenDisplay();
        alert('Token successfully revoked');
        
    } catch (error) {
        alert(`Error revoking token: ${error.message}`);
        console.error('Token revocation error:', error);
    }
}

// Helper Functions
function updateUserInfo() {
    if (currentUser) {
        userNameDisplay.textContent = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'User';
        userEmailDisplay.textContent = currentUser.email || 'N/A';
        userIdDisplay.textContent = currentUser.id || 'N/A';
    }
}

function updateTokenDisplay() {
    if (platformToken) {
        tokenInfoDisplay.innerHTML = `
            <p><strong>Token ID:</strong> ${platformTokenId}</p>
            <p><strong>Full Token:</strong> ${platformToken}</p>
        `;
        revokeTokenBtn.classList.remove('d-none');
    } else {
        tokenInfoDisplay.innerHTML = `<p>No active platform tokens.</p>`;
        revokeTokenBtn.classList.add('d-none');
    }
}

// Initialize the app
checkAuthStatus();