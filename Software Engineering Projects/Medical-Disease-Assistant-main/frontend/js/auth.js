/**
 * Authentication JavaScript
 * Handles login, register, and auth state
 */

let currentRole = 'patient';

/**
 * Set active role tab
 * @param {string} role - Role: 'admin', 'patient', 'doctor'
 */
function setRole(role) {
    currentRole = role;
    
    // Update tab styles
    ['patient', 'doctor', 'admin'].forEach(r => {
        const tab = document.getElementById(`tab${r.charAt(0).toUpperCase() + r.slice(1)}`);
        if (tab) {
            tab.classList.remove('active', 'bg-primary', 'text-white');
            tab.classList.add('text-gray-600');
        }
    });
    
    const activeTab = document.getElementById(`tab${role.charAt(0).toUpperCase() + role.slice(1)}`);
    if (activeTab) {
        activeTab.classList.add('active', 'bg-primary', 'text-white');
        activeTab.classList.remove('text-gray-600');
    }

    // Update icon and title
    const roleIcon = document.getElementById('roleIcon');
    const loginTitle = document.getElementById('loginTitle');
    const registerLink = document.getElementById('registerLink');
    
    const config = {
        admin: {
            icon: 'fa-user-shield',
            bgColor: 'bg-purple-100',
            textColor: 'text-purple-600',
            title: 'Admin Login'
        },
        patient: {
            icon: 'fa-user',
            bgColor: 'bg-blue-100',
            textColor: 'text-primary',
            title: 'Patient Login'
        },
        doctor: {
            icon: 'fa-user-md',
            bgColor: 'bg-green-100',
            textColor: 'text-green-600',
            title: 'Doctor Login'
        }
    };

    const cfg = config[role];
    if (roleIcon) {
        roleIcon.className = `w-16 h-16 ${cfg.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`;
        roleIcon.innerHTML = `<i class="fas ${cfg.icon} ${cfg.textColor} text-2xl"></i>`;
    }
    
    if (loginTitle) {
        loginTitle.textContent = cfg.title;
    }

    // Show/hide register link (only for patients)
    if (registerLink) {
        registerLink.style.display = role === 'patient' ? 'block' : 'none';
    }
}

/**
 * Toggle password visibility
 */
function togglePassword() {
    const passwordField = document.getElementById('password');
    const toggleIcon = document.getElementById('toggleIcon');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleIcon.classList.remove('fa-eye');
        toggleIcon.classList.add('fa-eye-slash');
    } else {
        passwordField.type = 'password';
        toggleIcon.classList.remove('fa-eye-slash');
        toggleIcon.classList.add('fa-eye');
    }
}

/**
 * Handle login form submission
 * @param {Event} e - Form submit event
 */
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    const spinner = document.getElementById('loginSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Hide previous errors
    errorMessage.classList.add('hidden');
    
    // Show loading state
    loginBtn.disabled = true;
    spinner.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Login failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Verify role matches selected role
        const userRole = data.user.role;
        
        // Redirect based on role
        switch (userRole) {
            case 'admin':
                window.location.href = 'admin/dashboard.html';
                break;
            case 'patient':
                window.location.href = 'patient/dashboard.html';
                break;
            case 'doctor':
                window.location.href = 'doctor/dashboard.html';
                break;
            default:
                throw new Error('Unknown user role');
        }

    } catch (error) {
        console.error('Login error:', error);
        errorText.textContent = error.message;
        errorMessage.classList.remove('hidden');
    } finally {
        loginBtn.disabled = false;
        spinner.classList.add('hidden');
    }
}

/**
 * Handle registration form submission
 * @param {Event} e - Form submit event
 */
async function handleRegister(e) {
    e.preventDefault();

    const registerBtn = document.getElementById('registerBtn');
    const spinner = document.getElementById('registerSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');

    // Get form data
    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        full_name: document.getElementById('fullName').value,
        phone: document.getElementById('phone').value || null,
        date_of_birth: document.getElementById('dateOfBirth').value || null,
        gender: document.getElementById('gender').value || null,
        address: document.getElementById('address').value || null,
        blood_group: document.getElementById('bloodGroup').value || null,
        allergies: document.getElementById('allergies').value || null,
        emergency_contact_name: document.getElementById('emergencyName').value || null,
        emergency_contact_phone: document.getElementById('emergencyPhone').value || null
    };

    // Validate passwords match
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (formData.password !== confirmPassword) {
        errorText.textContent = 'Passwords do not match';
        errorMessage.classList.remove('hidden');
        return;
    }

    // Validate terms agreement
    if (!document.getElementById('agreeTerms').checked) {
        errorText.textContent = 'Please agree to the Terms of Service';
        errorMessage.classList.remove('hidden');
        return;
    }

    // Hide previous errors
    errorMessage.classList.add('hidden');
    
    // Show loading state
    registerBtn.disabled = true;
    spinner.classList.remove('hidden');

    try {
        const response = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Registration failed');
        }

        // Store token and user data
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Show success message and redirect
        showToast('Registration successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'patient/dashboard.html';
        }, 1500);

    } catch (error) {
        console.error('Registration error:', error);
        errorText.textContent = error.message;
        errorMessage.classList.remove('hidden');
    } finally {
        registerBtn.disabled = false;
        spinner.classList.add('hidden');
    }
}

/**
 * Check authentication status and redirect if needed
 * @param {string} requiredRole - Required role for the page
 */
function checkAuth(requiredRole) {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        window.location.href = '../login.html';
        return false;
    }

    const user = JSON.parse(userStr);

    if (requiredRole && user.role !== requiredRole) {
        // Redirect to correct dashboard
        switch (user.role) {
            case 'admin':
                window.location.href = '../admin/dashboard.html';
                break;
            case 'patient':
                window.location.href = '../patient/dashboard.html';
                break;
            case 'doctor':
                window.location.href = '../doctor/dashboard.html';
                break;
            default:
                logout();
        }
        return false;
    }

    // Update user info in header
    updateUserDisplay(user);
    return true;
}

/**
 * Update user display in header
 * @param {object} user - User data
 */
function updateUserDisplay(user) {
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (userAvatar) {
        const initials = user.full_name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
        userAvatar.textContent = initials;
    }

    if (userName) {
        userName.textContent = user.full_name;
    }
}

/**
 * Logout user
 */
function logout() {
    // Clear all stored data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('bookingPrediction');
    
    // Redirect to login
    window.location.href = '../login.html';
}

/**
 * Get authorization header
 * @returns {object} Headers object with Authorization
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}