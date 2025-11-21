/**
 * Utility Functions Module
 * Common helper functions
 */

/**
 * Debounce function
 * Delays function execution until after wait time has elapsed
 */
export function debounce(func, wait = 300) {
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
 * Throttle function
 * Limits function execution to once per wait time
 */
export function throttle(func, wait = 300) {
    let inThrottle;

    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
}

/**
 * Format number with abbreviations
 */
export function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * Format date
 */
export function formatDate(dateString, format = 'short') {
    const date = new Date(dateString);

    if (format === 'short') {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } else if (format === 'long') {
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    return date.toLocaleDateString();
}

/**
 * Get CSRF token from meta tag or cookie
 */
export function getCsrfToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }

    // Fallback to cookie
    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? match[1] : '';
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all transform translate-x-0`;

    const colors = {
        success: 'bg-green-600 text-white',
        error: 'bg-red-600 text-white',
        warning: 'bg-yellow-600 text-white',
        info: 'bg-blue-600 text-white'
    };

    toast.className += ' ' + (colors[type] || colors.info);
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/**
 * Show loading spinner
 */
export function showLoading(element) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
    `;
    element.appendChild(spinner);
    return spinner;
}

/**
 * Hide loading spinner
 */
export function hideLoading(spinner) {
    if (spinner && spinner.parentNode) {
        spinner.remove();
    }
}

/**
 * Local storage helpers
 */
export const storage = {
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('LocalStorage error:', error);
            return false;
        }
    },

    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('LocalStorage error:', error);
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('LocalStorage error:', error);
            return false;
        }
    },

    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('LocalStorage error:', error);
            return false;
        }
    }
};

/**
 * DOM ready helper
 */
export function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

/**
 * Query selector helper
 */
export function $(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * Query selector all helper
 */
export function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

/**
 * Create element helper
 */
export function createElement(tag, attrs = {}, children = []) {
    const element = document.createElement(tag);

    Object.keys(attrs).forEach(key => {
        if (key === 'className') {
            element.className = attrs[key];
        } else if (key === 'style' && typeof attrs[key] === 'object') {
            Object.assign(element.style, attrs[key]);
        } else if (key.startsWith('on') && typeof attrs[key] === 'function') {
            element.addEventListener(key.substring(2).toLowerCase(), attrs[key]);
        } else {
            element.setAttribute(key, attrs[key]);
        }
    });

    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else {
            element.appendChild(child);
        }
    });

    return element;
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
        return true;
    } catch (error) {
        console.error('Copy failed:', error);
        showToast('Failed to copy', 'error');
        return false;
    }
}

/**
 * Validate email
 */
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain number');
    }

    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

export default {
    debounce,
    throttle,
    formatNumber,
    formatDate,
    getCsrfToken,
    showToast,
    showLoading,
    hideLoading,
    storage,
    ready,
    $,
    $$,
    createElement,
    copyToClipboard,
    isValidEmail,
    validatePassword
};
