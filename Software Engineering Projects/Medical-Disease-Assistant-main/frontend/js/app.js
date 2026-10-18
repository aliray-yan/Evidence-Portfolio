/**
 * Main Application JavaScript
 * Common utilities and configurations
 */

// API Base URL - Change this for production
const API_URL = 'http://localhost:8000';

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info'
 */
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(t => t.remove());

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Show loading overlay
 */
function showLoading() {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(overlay);
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

/**
 * Format date string
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format time string
 * @param {string} timeStr - Time string (HH:MM:SS)
 * @returns {string} Formatted time
 */
function formatTime(timeStr) {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Format symptom name for display
 * @param {string} symptom - Symptom with underscores
 * @returns {string} Formatted symptom name
 */
function formatSymptomName(symptom) {
    return symptom.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get status badge class
 * @param {string} status - Status string
 * @returns {string} CSS classes
 */
function getStatusClass(status) {
    const classes = {
        'pending': 'bg-yellow-100 text-yellow-700',
        'confirmed': 'bg-blue-100 text-blue-700',
        'completed': 'bg-green-100 text-green-700',
        'cancelled': 'bg-red-100 text-red-700'
    };
    return classes[status?.toLowerCase()] || 'bg-gray-100 text-gray-700';
}

/**
 * Get confidence score class
 * @param {number} confidence - Confidence score (0-1)
 * @returns {string} CSS classes
 */
function getConfidenceClass(confidence) {
    if (confidence >= 0.8) return 'bg-green-100 text-green-700';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
}

/**
 * Make authenticated API request
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise} Response data
 */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });

    if (response.status === 401) {
        // Token expired or invalid
        localStorage.clear();
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }

    return response.json();
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Store user data in localStorage
 * @param {object} userData - User data object
 */
function storeUserData(userData) {
    if (userData.access_token) {
        localStorage.setItem('token', userData.access_token);
    }
    if (userData.user) {
        localStorage.setItem('user', JSON.stringify(userData.user));
    }
}

/**
 * Get stored user data
 * @returns {object|null} User data or null
 */
function getUserData() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Clear all stored data and redirect to login
 */
function clearStorageAndRedirect() {
    localStorage.clear();
    window.location.href = '/login.html';
}

// Initialize tooltips if needed
document.addEventListener('DOMContentLoaded', function() {
    // Add any global initialization here
});