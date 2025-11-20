/**
 * Item Selector Module
 * Search and select items for build
 */

import { api } from './api.js';
import { debounce, showToast } from './utils.js';

export class ItemSelector {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.options = {
            onSelect: null,
            placeholder: 'Search items...',
            limit: 20,
            ...options
        };

        this.searchInput = null;
        this.resultsContainer = null;
        this.selectedItem = null;
        this.isLoading = false;

        this.initialize();
    }

    /**
     * Initialize item selector
     */
    initialize() {
        this.render();
        this.bindEvents();
    }

    /**
     * Render item selector UI
     */
    render() {
        this.container.innerHTML = `
            <div class="item-selector">
                <div class="relative">
                    <input
                        type="text"
                        class="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="${this.options.placeholder}"
                        autocomplete="off"
                    >
                    <div class="absolute right-3 top-2.5">
                        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                    </div>
                </div>
                <div class="results-container mt-2 hidden max-h-96 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg"></div>
            </div>
        `;

        this.searchInput = this.container.querySelector('input');
        this.resultsContainer = this.container.querySelector('.results-container');
    }

    /**
     * Bind events
     */
    bindEvents() {
        // Debounced search
        const debouncedSearch = debounce((query) => this.search(query), 300);

        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            if (query.length >= 2) {
                debouncedSearch(query);
            } else {
                this.hideResults();
            }
        });

        // Close results on click outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideResults();
            }
        });
    }

    /**
     * Search items
     */
    async search(query) {
        this.showLoading();

        try {
            const response = await api.searchItems(query, {
                limit: this.options.limit
            });

            if (response.success && response.items) {
                this.displayResults(response.items);
            } else {
                this.showNoResults();
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showError();
        }
    }

    /**
     * Display search results
     */
    displayResults(items) {
        if (items.length === 0) {
            this.showNoResults();
            return;
        }

        const resultsHTML = items.map(item => `
            <div class="item-result p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0" data-item='${JSON.stringify(item)}'>
                <div class="flex items-center justify-between">
                    <div>
                        <div class="font-medium text-yellow-500">${this.escapeHtml(item.name)}</div>
                        <div class="text-sm text-gray-400">${this.escapeHtml(item.base_item)}</div>
                    </div>
                    ${item.inventory_icon ? `<img src="${item.inventory_icon}" alt="${item.name}" class="w-12 h-12 object-contain">` : ''}
                </div>
            </div>
        `).join('');

        this.resultsContainer.innerHTML = resultsHTML;
        this.resultsContainer.classList.remove('hidden');

        // Bind click events
        this.resultsContainer.querySelectorAll('.item-result').forEach(el => {
            el.addEventListener('click', (e) => {
                const item = JSON.parse(el.dataset.item);
                this.selectItem(item);
            });
        });

        this.isLoading = false;
    }

    /**
     * Select an item
     */
    selectItem(item) {
        this.selectedItem = item;
        this.searchInput.value = item.name;
        this.hideResults();

        if (this.options.onSelect) {
            this.options.onSelect(item);
        }

        // Emit custom event
        const event = new CustomEvent('itemSelected', {
            detail: item
        });
        this.container.dispatchEvent(event);
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.isLoading = true;
        this.resultsContainer.innerHTML = `
            <div class="p-6 text-center text-gray-400">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                <div class="mt-2">Searching...</div>
            </div>
        `;
        this.resultsContainer.classList.remove('hidden');
    }

    /**
     * Show no results
     */
    showNoResults() {
        this.resultsContainer.innerHTML = `
            <div class="p-6 text-center text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>No items found</div>
            </div>
        `;
        this.resultsContainer.classList.remove('hidden');
        this.isLoading = false;
    }

    /**
     * Show error
     */
    showError() {
        this.resultsContainer.innerHTML = `
            <div class="p-6 text-center text-red-400">
                <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div>Search failed. Please try again.</div>
            </div>
        `;
        this.resultsContainer.classList.remove('hidden');
        this.isLoading = false;
    }

    /**
     * Hide results
     */
    hideResults() {
        this.resultsContainer.classList.add('hidden');
        this.isLoading = false;
    }

    /**
     * Clear selection
     */
    clear() {
        this.selectedItem = null;
        this.searchInput.value = '';
        this.hideResults();
    }

    /**
     * Get selected item
     */
    getSelected() {
        return this.selectedItem;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy item selector
     */
    destroy() {
        this.container.innerHTML = '';
    }
}

export default ItemSelector;
