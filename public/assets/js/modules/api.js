/**
 * API Module
 * Handles all HTTP requests to backend
 */

class API {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
        };
    }

    /**
     * GET request
     */
    async get(endpoint, params = {}) {
        const url = new URL(this.baseURL + endpoint, window.location.origin);

        // Add query parameters
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.defaultHeaders,
                credentials: 'same-origin'
            });

            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * POST request
     */
    async post(endpoint, data = {}) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'POST',
                headers: this.defaultHeaders,
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * PUT request
     */
    async put(endpoint, data = {}) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'PUT',
                headers: this.defaultHeaders,
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * DELETE request
     */
    async delete(endpoint) {
        try {
            const response = await fetch(this.baseURL + endpoint, {
                method: 'DELETE',
                headers: this.defaultHeaders,
                credentials: 'same-origin'
            });

            return await this.handleResponse(response);
        } catch (error) {
            return this.handleError(error);
        }
    }

    /**
     * Handle response
     */
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');

        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw {
                status: response.status,
                statusText: response.statusText,
                data: data
            };
        }

        return data;
    }

    /**
     * Handle error
     */
    handleError(error) {
        console.error('API Error:', error);

        if (error.status) {
            // HTTP error
            return {
                success: false,
                error: error.data?.error || error.statusText,
                status: error.status
            };
        } else {
            // Network error
            return {
                success: false,
                error: 'Network error occurred',
                status: 0
            };
        }
    }

    /**
     * Search items
     */
    async searchItems(query, filters = {}) {
        return this.get('/api/items', { q: query, ...filters });
    }

    /**
     * Get item details
     */
    async getItemDetails(itemId) {
        return this.get(`/api/items/${itemId}`);
    }

    /**
     * Search skill gems
     */
    async searchGems(query, filters = {}) {
        return this.get('/api/skill-gems', { q: query, ...filters });
    }

    /**
     * Get passive tree data
     */
    async getPassiveTree(version = 'latest') {
        return this.get('/api/passive-tree', { version });
    }

    /**
     * Generate build with AI
     */
    async generateBuildWithAI(prompt, context = {}) {
        return this.post('/api/generate-build', { prompt, ...context });
    }

    /**
     * Save build
     */
    async saveBuild(buildData) {
        return this.post('/build/save', buildData);
    }

    /**
     * Clone build
     */
    async cloneBuild(buildId) {
        return this.post('/build/clone', { build_id: buildId });
    }

    /**
     * Autocomplete search
     */
    async autocomplete(query, type = 'all') {
        return this.get('/api/autocomplete', { q: query, type });
    }
}

// Export singleton instance
export const api = new API();
export default API;
