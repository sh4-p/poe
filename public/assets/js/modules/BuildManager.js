/**
 * Build Manager Module
 * Manages build state and synchronization
 */

import { api } from './api.js';
import { debounce, showToast } from './utils.js';

export class BuildManager {
    constructor(buildId = 0) {
        this.buildId = buildId;
        this.buildData = {
            build_info: {},
            passive_tree: {},
            items: [],
            gems: [],
            jewels: [],
            flasks: []
        };
        this.isDirty = false;
        this.autoSaveEnabled = true;
        this.autoSaveDelay = 2000; // 2 seconds

        // Debounced save function
        this.debouncedSave = debounce(() => this.save(), this.autoSaveDelay);

        this.initialize();
    }

    /**
     * Initialize build manager
     */
    initialize() {
        if (this.buildId > 0) {
            this.load();
        }

        // Listen for beforeunload if there are unsaved changes
        window.addEventListener('beforeunload', (e) => {
            if (this.isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    /**
     * Load build data from server
     */
    async load() {
        try {
            // Load build data via API or from page
            // For now, assume data is embedded in page
            const buildDataEl = document.getElementById('build-data');

            if (buildDataEl) {
                const data = JSON.parse(buildDataEl.textContent);
                this.buildData = { ...this.buildData, ...data };
            }

            return true;
        } catch (error) {
            console.error('Failed to load build:', error);
            showToast('Failed to load build data', 'error');
            return false;
        }
    }

    /**
     * Save build to server
     */
    async save() {
        if (!this.isDirty && this.buildId > 0) {
            return true; // Nothing to save
        }

        this.updateSaveStatus('saving');

        try {
            const response = await api.saveBuild({
                build_id: this.buildId,
                build_info: this.buildData.build_info,
                data_type: 'items',
                json_data: this.buildData.items
            });

            if (response.success) {
                if (this.buildId === 0 && response.data?.build_id) {
                    this.buildId = response.data.build_id;
                    // Update URL without reload
                    window.history.replaceState({}, '', `/build/${this.buildId}/edit`);
                }

                this.isDirty = false;
                this.updateSaveStatus('saved');
                return true;
            } else {
                this.updateSaveStatus('error');
                showToast(response.error || 'Save failed', 'error');
                return false;
            }
        } catch (error) {
            console.error('Save error:', error);
            this.updateSaveStatus('error');
            showToast('Save failed', 'error');
            return false;
        }
    }

    /**
     * Update save status UI
     */
    updateSaveStatus(status) {
        const statusEl = document.getElementById('save-status');
        if (!statusEl) return;

        const messages = {
            saving: { text: 'Saving...', class: 'text-yellow-400' },
            saved: { text: 'Saved ✓', class: 'text-green-400' },
            error: { text: 'Save failed', class: 'text-red-400' }
        };

        const msg = messages[status] || messages.saved;
        statusEl.textContent = msg.text;
        statusEl.className = `text-sm ${msg.class}`;

        if (status === 'saved') {
            setTimeout(() => { statusEl.textContent = ''; }, 3000);
        }
    }

    /**
     * Update build info
     */
    updateBuildInfo(data) {
        this.buildData.build_info = { ...this.buildData.build_info, ...data };
        this.markDirty();

        if (this.autoSaveEnabled) {
            this.debouncedSave();
        }
    }

    /**
     * Add item
     */
    addItem(item) {
        this.buildData.items.push(item);
        this.markDirty();

        if (this.autoSaveEnabled) {
            this.debouncedSave();
        }

        this.emit('itemAdded', item);
    }

    /**
     * Remove item
     */
    removeItem(itemId) {
        const index = this.buildData.items.findIndex(item => item.id === itemId);

        if (index !== -1) {
            const item = this.buildData.items.splice(index, 1)[0];
            this.markDirty();

            if (this.autoSaveEnabled) {
                this.debouncedSave();
            }

            this.emit('itemRemoved', item);
        }
    }

    /**
     * Update item
     */
    updateItem(itemId, data) {
        const item = this.buildData.items.find(item => item.id === itemId);

        if (item) {
            Object.assign(item, data);
            this.markDirty();

            if (this.autoSaveEnabled) {
                this.debouncedSave();
            }

            this.emit('itemUpdated', item);
        }
    }

    /**
     * Add gem
     */
    addGem(gem) {
        this.buildData.gems.push(gem);
        this.markDirty();

        if (this.autoSaveEnabled) {
            this.debouncedSave();
        }

        this.emit('gemAdded', gem);
    }

    /**
     * Remove gem
     */
    removeGem(gemId) {
        const index = this.buildData.gems.findIndex(gem => gem.id === gemId);

        if (index !== -1) {
            const gem = this.buildData.gems.splice(index, 1)[0];
            this.markDirty();

            if (this.autoSaveEnabled) {
                this.debouncedSave();
            }

            this.emit('gemRemoved', gem);
        }
    }

    /**
     * Mark build as dirty (has unsaved changes)
     */
    markDirty() {
        this.isDirty = true;
    }

    /**
     * Export build as POB code
     */
    async export() {
        try {
            const response = await api.get(`/build/${this.buildId}/export`);

            if (response.success) {
                return response.pob_code;
            }

            return null;
        } catch (error) {
            console.error('Export error:', error);
            return null;
        }
    }

    /**
     * Clone current build
     */
    async clone() {
        try {
            const response = await api.cloneBuild(this.buildId);

            if (response.success) {
                window.location.href = `/build/${response.data.build_id}/edit`;
                return true;
            }

            return false;
        } catch (error) {
            console.error('Clone error:', error);
            return false;
        }
    }

    /**
     * Simple event emitter
     */
    emit(event, data) {
        const customEvent = new CustomEvent(`build:${event}`, {
            detail: data
        });
        document.dispatchEvent(customEvent);
    }

    /**
     * Listen to events
     */
    on(event, callback) {
        document.addEventListener(`build:${event}`, (e) => callback(e.detail));
    }

    /**
     * Get build summary
     */
    getSummary() {
        return {
            buildId: this.buildId,
            name: this.buildData.build_info.build_name,
            ascendancy: this.buildData.build_info.ascendancy_class,
            itemCount: this.buildData.items.length,
            gemCount: this.buildData.gems.length,
            isDirty: this.isDirty
        };
    }
}

export default BuildManager;
