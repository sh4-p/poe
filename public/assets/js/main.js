/**
 * Main Application Entry Point
 * Initialize all modules and features
 */

import { api } from './modules/api.js';
import { ready, showToast } from './modules/utils.js';
import BuildManager from './modules/BuildManager.js';
import ItemSelector from './modules/ItemSelector.js';
import PassiveTreeViewer from './modules/PassiveTreeViewer.js';

// Global app object
window.ExileArchitect = {
    api,
    buildManager: null,
    itemSelector: null,
    treeViewer: null,

    // Version
    version: '1.0.0',

    /**
     * Initialize application
     */
    init() {
        console.log('🎮 Exile Architect v' + this.version);

        // Initialize based on current page
        this.initializePage();

        // Global event listeners
        this.initializeGlobalEvents();
    },

    /**
     * Initialize page-specific features
     */
    initializePage() {
        const path = window.location.pathname;

        // Build editor page
        if (path.includes('/build/') && path.includes('/edit')) {
            this.initializeBuildEditor();
        }

        // Build view page
        if (path.includes('/build/') && !path.includes('/edit') && !path.includes('/import')) {
            this.initializeBuildView();
        }

        // Item selector on any page that has the container
        const itemSelectorEl = document.getElementById('item-selector');
        if (itemSelectorEl) {
            this.itemSelector = new ItemSelector(itemSelectorEl, {
                onSelect: (item) => {
                    console.log('Item selected:', item);

                    if (this.buildManager) {
                        this.buildManager.addItem(item);
                    }
                }
            });
        }
    },

    /**
     * Initialize build editor
     */
    initializeBuildEditor() {
        console.log('📝 Initializing build editor');

        // Get build ID from URL
        const buildId = this.getBuildIdFromUrl();

        // Initialize build manager
        this.buildManager = new BuildManager(buildId);

        // Listen for build events
        this.buildManager.on('itemAdded', (item) => {
            console.log('Item added:', item);
            showToast(`Added: ${item.name}`, 'success');
        });

        this.buildManager.on('itemRemoved', (item) => {
            console.log('Item removed:', item);
            showToast(`Removed: ${item.name}`, 'info');
        });

        // Initialize passive tree viewer
        const treeContainer = document.getElementById('passive-tree-container');
        if (treeContainer) {
            this.treeViewer = new PassiveTreeViewer(treeContainer);
        }

        // Manual save button
        const saveBtnEl = document.getElementById('save-build-btn');
        if (saveBtnEl) {
            saveBtnEl.addEventListener('click', () => {
                this.buildManager.save();
            });
        }

        console.log('✅ Build editor initialized');
    },

    /**
     * Initialize build view page
     */
    initializeBuildView() {
        console.log('👁️ Initializing build view');

        // Initialize passive tree viewer (read-only)
        const treeContainer = document.getElementById('passive-tree-container');
        if (treeContainer) {
            this.treeViewer = new PassiveTreeViewer(treeContainer, {
                readOnly: true
            });
        }
    },

    /**
     * Initialize global events
     */
    initializeGlobalEvents() {
        // Global search/autocomplete
        const globalSearchEl = document.getElementById('global-search');
        if (globalSearchEl) {
            let searchTimeout;

            globalSearchEl.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();

                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.performGlobalSearch(query);
                    }, 300);
                }
            });
        }

        // Toast notifications from server
        const flashMessage = document.querySelector('[data-flash-message]');
        if (flashMessage) {
            const message = flashMessage.dataset.flashMessage;
            const type = flashMessage.dataset.flashType || 'info';
            showToast(message, type);
        }
    },

    /**
     * Perform global search
     */
    async performGlobalSearch(query) {
        try {
            const response = await api.autocomplete(query);

            if (response.success) {
                this.displaySearchResults(response.results);
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    },

    /**
     * Display search results
     */
    displaySearchResults(results) {
        // TODO: Implement search results dropdown
        console.log('Search results:', results);
    },

    /**
     * Get build ID from URL
     */
    getBuildIdFromUrl() {
        const match = window.location.pathname.match(/\/build\/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    },

    /**
     * Utility: Show loading overlay
     */
    showLoading() {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        overlay.innerHTML = `
            <div class="bg-gray-800 rounded-lg p-8 flex items-center gap-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
                <span class="text-white">Loading...</span>
            </div>
        `;
        document.body.appendChild(overlay);
    },

    /**
     * Utility: Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
};

// Initialize when DOM is ready
ready(() => {
    window.ExileArchitect.init();
});

// Export for use in other scripts
export default window.ExileArchitect;
