/**
 * Passive Tree Viewer Module - Canvas-based (POE Official Style)
 * Pure Canvas rendering matching pathofexile.com passive tree implementation
 *
 * Architecture:
 * - 3 layered canvases (main, mid, top)
 * - Tile-based rendering (512x512 optimization)
 * - Class/Ascendancy selection system
 * - Official POE node sizes and positioning
 */

import { showToast } from './utils.js';

export class PassiveTreeViewer {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.options = {
            width: 1200,
            height: 800,
            tileSize: 512, // POE uses 512x512 tiles
            assetBaseUrl: '/assets/images/passive-tree/', // POE official assets (local)
            spriteZoomLevel: 2, // 0=low, 1=med, 2=high, 3=max (0.2972 zoom)
            ...options
        };

        // Tree data
        this.treeData = null;
        this.rawTreeData = null;
        this.allocatedNodes = new Set();
        this.hoveredNode = null;

        // Canvas layers (POE official uses 3 layers)
        this.mainCanvas = null;   // Background + nodes
        this.midCanvas = null;    // Highlights + animations
        this.topCanvas = null;    // UI overlays + debug
        this.mainCtx = null;
        this.midCtx = null;
        this.topCtx = null;

        // Viewport state
        this.viewport = {
            x: 0,
            y: 0,
            scale: 0.1246, // Start at lowest zoom (POE official)
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0
        };

        // Zoom levels (4 predefined levels - POE official)
        this.zoomLevels = [0.1246, 0.2109, 0.2972, 0.3835];
        this.currentZoomIndex = 0; // Start at 0.1246

        // Character class selection (POE official classes with ascendancy mapping)
        this.selectedClass = null;
        this.selectedAscendancy = null;
        this.characterClasses = [
            {
                id: 'SCION',
                name: 'Scion',
                startNode: '26725',
                ascendancies: ['Ascendant']
            },
            {
                id: 'MARAUDER',
                name: 'Marauder',
                startNode: '4',
                ascendancies: ['Juggernaut', 'Berserker', 'Chieftain']
            },
            {
                id: 'RANGER',
                name: 'Ranger',
                startNode: '48679',
                ascendancies: ['Raider', 'Deadeye', 'Pathfinder']
            },
            {
                id: 'WITCH',
                name: 'Witch',
                startNode: '41529',
                ascendancies: ['Occultist', 'Elementalist', 'Necromancer']
            },
            {
                id: 'DUELIST',
                name: 'Duelist',
                startNode: '55549',
                ascendancies: ['Slayer', 'Gladiator', 'Champion']
            },
            {
                id: 'TEMPLAR',
                name: 'Templar',
                startNode: '36634',
                ascendancies: ['Inquisitor', 'Hierophant', 'Guardian']
            },
            {
                id: 'SHADOW',
                name: 'Shadow',
                startNode: '26196',
                ascendancies: ['Assassin', 'Trickster', 'Saboteur']
            }
        ];

        // Asset management
        this.sprites = null;
        this.spriteImages = new Map();
        this.loadingPromises = new Map();
        this.spritesLoaded = false;
        this.backgroundPattern = null;

        // Animation state
        this.animationFrame = null;
        this.animationTime = 0;
        this.isAnimating = false;

        // Build management
        this.currentBuildName = null;

        // Pathfinding
        this.adjacencyList = new Map(); // Node connections for pathfinding
        this.pathToHoveredNode = null; // Store path to show in mid layer

        // Touch/mobile support
        this.lastTouchDistance = 0;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isTouching = false;

        // Search functionality
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.searchQuery = '';

        // Mastery effect selections (nodeId -> effectId)
        this.masterySelections = new Map();

        // Tile grid for optimization
        this.tiles = new Map();
        this.dirtyTiles = new Set();

        // Node rendering constants (POE official sizes in pixels at 1.0 zoom)
        this.nodeSizes = {
            normal: 51,
            notable: 70,
            keystone: 109,
            mastery: 90,
            classStart: 200,
            jewel: 70,
            bloodline: 70,
            ascendancy: 70
        };

        // Clickable areas for hit testing
        this.clickables = [];

        this.initialize();
    }

    /**
     * Initialize the viewer
     */
    async initialize() {
        this.setupCanvases();
        this.setupControls();
        this.setupEventHandlers();
        await this.loadTree();
    }

    /**
     * Setup 3-layer canvas system (POE official approach)
     */
    setupCanvases() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        this.container.style.background = '#000000';
        this.container.style.borderRadius = '8px';

        // Main canvas - background and nodes
        this.mainCanvas = document.createElement('canvas');
        this.mainCanvas.id = 'skillTreeMainCanvas';
        this.mainCanvas.width = this.options.width;
        this.mainCanvas.height = this.options.height;
        this.mainCanvas.style.position = 'absolute';
        this.mainCanvas.style.left = '0';
        this.mainCanvas.style.top = '0';
        this.mainCanvas.style.zIndex = '1';
        this.mainCtx = this.mainCanvas.getContext('2d');

        // Mid canvas - highlights and animations
        this.midCanvas = document.createElement('canvas');
        this.midCanvas.id = 'skillTreeMidCanvas';
        this.midCanvas.width = this.options.width;
        this.midCanvas.height = this.options.height;
        this.midCanvas.style.position = 'absolute';
        this.midCanvas.style.left = '0';
        this.midCanvas.style.top = '0';
        this.midCanvas.style.zIndex = '2';
        this.midCanvas.style.pointerEvents = 'none';
        this.midCtx = this.midCanvas.getContext('2d');

        // Top canvas - UI overlays and interaction
        this.topCanvas = document.createElement('canvas');
        this.topCanvas.id = 'skillTreeTopCanvas';
        this.topCanvas.width = this.options.width;
        this.topCanvas.height = this.options.height;
        this.topCanvas.style.position = 'absolute';
        this.topCanvas.style.left = '0';
        this.topCanvas.style.top = '0';
        this.topCanvas.style.zIndex = '3';
        this.topCtx = this.topCanvas.getContext('2d');

        this.container.appendChild(this.mainCanvas);
        this.container.appendChild(this.midCanvas);
        this.container.appendChild(this.topCanvas);

        console.log('✓ 3-layer canvas system initialized');
    }

    /**
     * Setup UI controls
     */
    setupControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'passive-tree-controls';
        controlsDiv.style.cssText = `
            position: absolute;
            top: 16px;
            right: 16px;
            background: rgba(30, 30, 30, 0.95);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            border: 1px solid #444;
            z-index: 10;
            min-width: 200px;
        `;

        controlsDiv.innerHTML = `
            <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #444;">
                <label style="display: block; color: #eab308; font-weight: bold; font-size: 12px; margin-bottom: 8px;">
                    SELECT CLASS
                </label>
                <select id="class-select" style="width: 100%; padding: 6px; background: #1a1a1a; color: white; border: 1px solid #555; border-radius: 4px;">
                    <option value="">Choose class...</option>
                    ${this.characterClasses.map(c =>
                        `<option value="${c.id}">${c.name}</option>`
                    ).join('')}
                </select>
            </div>

            <div style="margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #444;">
                <div style="color: #eab308; font-weight: bold; font-size: 12px; margin-bottom: 4px;">
                    PASSIVE POINTS
                </div>
                <div id="points-used" style="font-size: 32px; font-weight: bold; color: white;">
                    0
                </div>
                <div style="color: #888; font-size: 11px;">points allocated</div>
            </div>

            <div style="margin-bottom: 12px;">
                <button id="tree-reset" style="width: 100%; padding: 8px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    Reset Tree
                </button>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
                <button id="tree-zoom-in" style="padding: 6px; background: #3f3f3f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    Zoom +
                </button>
                <button id="tree-zoom-out" style="padding: 6px; background: #3f3f3f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    Zoom -
                </button>
            </div>

            <button id="tree-center" style="width: 100%; padding: 6px; background: #3f3f3f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                Center View
            </button>
        `;

        this.container.appendChild(controlsDiv);

        // Bind events
        document.getElementById('class-select')?.addEventListener('change', (e) => {
            this.selectClass(e.target.value);
        });
        document.getElementById('tree-reset')?.addEventListener('click', () => this.resetTree());
        document.getElementById('tree-zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('tree-zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('tree-center')?.addEventListener('click', () => this.centerView());
    }

    /**
     * Setup event handlers for canvas interaction
     */
    setupEventHandlers() {
        // Mouse wheel for zooming
        this.topCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY < 0) {
                this.zoomIn();
            } else {
                this.zoomOut();
            }
        });

        // Mouse drag for panning
        this.topCanvas.addEventListener('mousedown', (e) => {
            this.viewport.isDragging = true;
            this.viewport.dragStartX = e.clientX - this.viewport.x;
            this.viewport.dragStartY = e.clientY - this.viewport.y;
            this.topCanvas.style.cursor = 'grabbing';
        });

        this.topCanvas.addEventListener('mousemove', (e) => {
            if (this.viewport.isDragging) {
                this.viewport.x = e.clientX - this.viewport.dragStartX;
                this.viewport.y = e.clientY - this.viewport.dragStartY;
                this.markAllTilesDirty();
                this.render();
            } else {
                // Check hover
                this.handleMouseMove(e);
            }
        });

        this.topCanvas.addEventListener('mouseup', () => {
            this.viewport.isDragging = false;
            this.topCanvas.style.cursor = 'grab';
        });

        this.topCanvas.addEventListener('mouseleave', () => {
            this.viewport.isDragging = false;
            this.topCanvas.style.cursor = 'default';
        });

        // Click handling
        this.topCanvas.addEventListener('click', (e) => {
            if (!this.viewport.isDragging) {
                this.handleClick(e);
            }
        });

        this.topCanvas.style.cursor = 'grab';

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // Touch event handlers for mobile support
        this.topCanvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.topCanvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.topCanvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        this.topCanvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e), { passive: false });
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Ignore if typing in input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const panSpeed = 50; // pixels

        switch(e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.viewport.y += panSpeed;
                this.markAllTilesDirty();
                this.render();
                e.preventDefault();
                break;
            case 's':
            case 'arrowdown':
                this.viewport.y -= panSpeed;
                this.markAllTilesDirty();
                this.render();
                e.preventDefault();
                break;
            case 'a':
            case 'arrowleft':
                this.viewport.x += panSpeed;
                this.markAllTilesDirty();
                this.render();
                e.preventDefault();
                break;
            case 'd':
            case 'arrowright':
                this.viewport.x -= panSpeed;
                this.markAllTilesDirty();
                this.render();
                e.preventDefault();
                break;
            case '+':
            case '=':
                this.zoomIn();
                e.preventDefault();
                break;
            case '-':
            case '_':
                this.zoomOut();
                e.preventDefault();
                break;
            case 'r':
                this.centerView();
                e.preventDefault();
                break;
            case 'escape':
                // Clear search if active, otherwise reset tree
                if (this.searchResults.length > 0) {
                    this.clearSearch();
                } else {
                    this.resetTree();
                }
                e.preventDefault();
                break;
            case 'f3':
                // Navigate search results
                if (e.shiftKey) {
                    this.previousSearchResult();
                } else {
                    this.nextSearchResult();
                }
                e.preventDefault();
                break;
            case 'n':
                // Next search result (Ctrl+N or Cmd+N)
                if (e.ctrlKey || e.metaKey) {
                    this.nextSearchResult();
                    e.preventDefault();
                }
                break;
            case 'p':
                // Previous search result (Ctrl+P or Cmd+P)
                if (e.ctrlKey || e.metaKey) {
                    this.previousSearchResult();
                    e.preventDefault();
                }
                break;
        }
    }

    /**
     * Handle touch start (mobile support)
     */
    handleTouchStart(e) {
        e.preventDefault(); // Prevent browser zoom/scroll

        const touches = e.touches;

        if (touches.length === 1) {
            // Single touch - start panning
            this.isTouching = true;
            const rect = this.topCanvas.getBoundingClientRect();
            this.touchStartX = touches[0].clientX - rect.left - this.viewport.x;
            this.touchStartY = touches[0].clientY - rect.top - this.viewport.y;
        } else if (touches.length === 2) {
            // Two fingers - start pinch zoom
            const dx = touches[1].clientX - touches[0].clientX;
            const dy = touches[1].clientY - touches[0].clientY;
            this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }

    /**
     * Handle touch move (mobile support)
     */
    handleTouchMove(e) {
        e.preventDefault(); // Prevent browser zoom/scroll

        const touches = e.touches;

        if (touches.length === 1 && this.isTouching) {
            // Single touch - pan
            const rect = this.topCanvas.getBoundingClientRect();
            const touchX = touches[0].clientX - rect.left;
            const touchY = touches[0].clientY - rect.top;

            this.viewport.x = touchX - this.touchStartX;
            this.viewport.y = touchY - this.touchStartY;

            this.markAllTilesDirty();
            this.render();
        } else if (touches.length === 2) {
            // Two fingers - pinch zoom
            const dx = touches[1].clientX - touches[0].clientX;
            const dy = touches[1].clientY - touches[0].clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);

            if (this.lastTouchDistance > 0) {
                const delta = currentDistance - this.lastTouchDistance;

                // Zoom threshold (pixels of pinch movement needed)
                const zoomThreshold = 30;

                if (delta > zoomThreshold) {
                    this.zoomIn();
                    this.lastTouchDistance = currentDistance;
                } else if (delta < -zoomThreshold) {
                    this.zoomOut();
                    this.lastTouchDistance = currentDistance;
                }
            } else {
                this.lastTouchDistance = currentDistance;
            }
        }
    }

    /**
     * Handle touch end (mobile support)
     */
    handleTouchEnd(e) {
        e.preventDefault();

        const touches = e.touches;

        // If a single tap (no movement), treat as click
        if (touches.length === 0 && this.isTouching) {
            // Get the last touch position from changedTouches
            const lastTouch = e.changedTouches[0];
            const rect = this.topCanvas.getBoundingClientRect();
            const canvasX = lastTouch.clientX - rect.left;
            const canvasY = lastTouch.clientY - rect.top;

            // Check if this was a tap (minimal movement)
            const startCanvasX = this.touchStartX + this.viewport.x;
            const startCanvasY = this.touchStartY + this.viewport.y;
            const moveDistance = Math.sqrt(
                Math.pow(canvasX - startCanvasX, 2) +
                Math.pow(canvasY - startCanvasY, 2)
            );

            // If movement was small (< 10px), treat as tap/click
            if (moveDistance < 10) {
                const worldX = (canvasX - this.viewport.x) / this.viewport.scale;
                const worldY = (canvasY - this.viewport.y) / this.viewport.scale;

                const tappedNode = this.findNodeAt(worldX, worldY);
                if (tappedNode) {
                    this.toggleNode(tappedNode);
                }
            }
        }

        // Reset touch state
        this.isTouching = false;
        this.lastTouchDistance = 0;
    }

    /**
     * Handle mouse move for hover detection
     */
    handleMouseMove(e) {
        const rect = this.topCanvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        // Convert to world coordinates
        const worldX = (canvasX - this.viewport.x) / this.viewport.scale;
        const worldY = (canvasY - this.viewport.y) / this.viewport.scale;

        // Check if hovering over a node
        const hoveredNode = this.findNodeAt(worldX, worldY);

        if (hoveredNode !== this.hoveredNode) {
            this.hoveredNode = hoveredNode;

            // Calculate path to hovered node if unallocated
            if (hoveredNode && !this.allocatedNodes.has(hoveredNode.id) && this.allocatedNodes.size > 0) {
                this.pathToHoveredNode = this.findPathToNode(hoveredNode.id);
            } else {
                this.pathToHoveredNode = null;
            }

            this.renderMidLayer(); // Update highlights

            if (hoveredNode) {
                this.showTooltip(e, hoveredNode);
            } else {
                this.hideTooltip();
            }
        }
    }

    /**
     * Handle canvas click
     */
    handleClick(e) {
        const rect = this.topCanvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const worldX = (canvasX - this.viewport.x) / this.viewport.scale;
        const worldY = (canvasY - this.viewport.y) / this.viewport.scale;

        const clickedNode = this.findNodeAt(worldX, worldY);

        if (clickedNode) {
            this.toggleNode(clickedNode);
        }
    }

    /**
     * Find node at world coordinates (radius-based hit testing)
     * Filters out hidden ascendancy/bloodline nodes (POE official behavior)
     */
    findNodeAt(worldX, worldY) {
        if (!this.treeData?.nodes) return null;

        const allowedAscendancies = this.selectedClass?.ascendancies || [];

        // Check nodes in reverse order (top to bottom)
        for (let i = this.treeData.nodes.length - 1; i >= 0; i--) {
            const node = this.treeData.nodes[i];

            // Filter ascendancy nodes
            if (node.type === 'ascendancy') {
                if (!this.selectedClass) continue; // Skip if no class selected
                if (!allowedAscendancies.includes(node.ascendancyName)) continue;
            }

            // Filter bloodline nodes
            if (node.type === 'bloodline' && !this.selectedClass) {
                continue; // Skip if no class selected
            }

            const radius = this.nodeSizes[node.type] || this.nodeSizes.normal;

            const dx = worldX - node.x;
            const dy = worldY - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance <= radius / 2) {
                return node;
            }
        }

        return null;
    }

    /**
     * Select character class (POE official behavior)
     * Reveals class-specific ascendancy nodes and centers on starting node
     */
    selectClass(classId) {
        if (!classId) {
            this.selectedClass = null;
            this.centerView();
            return;
        }

        const classData = this.characterClasses.find(c => c.id === classId);
        if (!classData) return;

        // Clear old ascendancy/bloodline allocations when switching class
        if (this.selectedClass && this.selectedClass.id !== classData.id) {
            const oldAscendancies = this.selectedClass.ascendancies || [];
            this.treeData?.nodes.forEach(node => {
                if (node.type === 'ascendancy' && oldAscendancies.includes(node.ascendancyName)) {
                    this.allocatedNodes.delete(node.id);
                }
                if (node.type === 'bloodline') {
                    this.allocatedNodes.delete(node.id);
                }
            });
        }

        this.selectedClass = classData;

        // Find starting node
        const startNode = this.treeData?.nodes.find(n => n.id === classData.startNode);
        if (startNode) {
            // Center view on starting node
            this.viewport.x = this.options.width / 2 - startNode.x * this.viewport.scale;
            this.viewport.y = this.options.height / 2 - startNode.y * this.viewport.scale;

            // Allocate starting node
            this.allocatedNodes.add(startNode.id);

            this.markAllTilesDirty();
            this.render();
            this.updatePointsDisplay();
        }

        showToast(`Selected ${classData.name} - Ascendancy revealed`, 'success');
    }

    /**
     * Load tree data from local JSON file (GGG skilltree-export)
     */
    async loadTree(variant = 'default') {
        try {
            showToast('Loading passive tree...', 'info', 1000);

            // Map variants to file paths (GGG skilltree-export 3.27.0)
            const variantFiles = {
                'default': '/data/passive-tree-3.27.0.json',
                'alternate': '/data/passive-tree-3.27.0-alternate.json',
                'ruthless': '/data/passive-tree-3.27.0-ruthless.json',
                'ruthless-alternate': '/data/passive-tree-3.27.0-ruthless-alternate.json'
            };

            const dataUrl = variantFiles[variant] || variantFiles.default;

            console.log(`📥 Loading tree data from: ${dataUrl}`);
            const response = await fetch(dataUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch tree data: ${response.status}`);
            }

            // Load raw tree data (GGG official format)
            this.rawTreeData = await response.json();

            // Extract sprites metadata
            if (this.rawTreeData.sprites) {
                this.sprites = this.rawTreeData.sprites;
                console.log(`✅ Loaded ${Object.keys(this.sprites).length} sprite sheet definitions`);
                console.log('Available sprite sheets:', Object.keys(this.sprites).slice(0, 10).join(', '));
            }

            // Transform GGG format to our format
            this.treeData = this.transformOfficialTreeData(this.rawTreeData);

            const nodeCount = this.treeData.nodes.length;
            const linkCount = this.treeData.links.length;

            // Build adjacency list for pathfinding
            this.buildAdjacencyList();

            console.log(`✅ Transformed ${nodeCount} nodes and ${linkCount} connections`);
            showToast(`Passive tree loaded (${nodeCount} nodes)`, 'success');

            // Initial render
            this.centerView();
            this.render();

            // Auto-import from URL hash if present (shared builds)
            this.importFromLocationHash();

        } catch (error) {
            console.error('❌ Failed to load tree data:', error);
            showToast('Failed to load passive tree data', 'error');
        }
    }

    /**
     * Transform official POE tree data
     */
    transformOfficialTreeData(officialData) {
        const nodes = [];
        const links = [];

        const constants = officialData.constants || {
            orbitRadii: [0, 82, 162, 335, 493, 662, 846],
            skillsPerOrbit: [1, 6, 16, 16, 40, 72, 72],
            PSSCentreInnerRadius: 130
        };

        // Process nodes
        if (officialData.nodes && officialData.groups) {
            for (const [nodeId, nodeData] of Object.entries(officialData.nodes)) {
                const group = officialData.groups[nodeData.group];
                let x = 0, y = 0;

                if (group) {
                    x = group.x || 0;
                    y = group.y || 0;

                    if (nodeData.orbit > 0 && nodeData.orbit < constants.orbitRadii.length) {
                        const orbitRadius = constants.orbitRadii[nodeData.orbit];
                        const skillsInOrbit = constants.skillsPerOrbit[nodeData.orbit];
                        const angle = (2 * Math.PI * nodeData.orbitIndex) / skillsInOrbit;

                        x += orbitRadius * Math.sin(angle);
                        y += -orbitRadius * Math.cos(angle);
                    }
                }

                const node = {
                    id: nodeId,
                    name: nodeData.name || `Node ${nodeId}`,
                    type: this.detectNodeType(nodeData),
                    stats: nodeData.stats || [],
                    x: x,
                    y: y,
                    icon: nodeData.icon,
                    group: nodeData.group,
                    orbit: nodeData.orbit,
                    orbitIndex: nodeData.orbitIndex,
                    ascendancyName: nodeData.ascendancyName,
                    classStartIndex: nodeData.classStartIndex,
                    // POE official additional properties
                    isKeystone: nodeData.isKeystone || false,
                    isNotable: nodeData.isNotable || false,
                    isJewelSocket: nodeData.isJewelSocket || false,
                    isMastery: nodeData.isMastery || false,
                    isBloodline: nodeData.isBloodline || false,
                    isMultipleChoiceOption: nodeData.isMultipleChoiceOption || false,
                    reminderText: nodeData.reminderText,
                    flavourText: nodeData.flavourText,
                    // Mastery effects
                    masteryEffects: nodeData.masteryEffects || []
                };

                nodes.push(node);
            }
        }

        // Process connections
        if (officialData.nodes) {
            for (const [nodeId, nodeData] of Object.entries(officialData.nodes)) {
                if (nodeData.out && Array.isArray(nodeData.out)) {
                    nodeData.out.forEach(targetId => {
                        links.push({
                            source: nodeId,
                            target: String(targetId)
                        });
                    });
                }
            }
        }

        console.log(`Transformed ${nodes.length} nodes and ${links.length} connections`);
        return { nodes, links };
    }

    /**
     * Detect node type (POE official flags)
     */
    detectNodeType(nodeData) {
        if (nodeData.isKeystone) return 'keystone';
        if (nodeData.isMastery) return 'mastery';
        if (nodeData.isJewelSocket) return 'jewel';
        if (nodeData.isNotable) return 'notable';
        if (nodeData.isBloodline) return 'bloodline';
        if (nodeData.ascendancyName) return 'ascendancy';
        if (nodeData.classStartIndex !== undefined) return 'classStart';
        if (nodeData.spc && nodeData.spc.length > 0) return 'classStart'; // Alternative class start detection
        return 'normal';
    }

    /**
     * Main render function
     */
    render() {
        this.renderMainLayer();
        this.renderMidLayer();
        this.renderTopLayer();
    }

    /**
     * Start animation loop
     */
    startAnimation() {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.animationTime = 0;

        const animate = (timestamp) => {
            if (!this.isAnimating) return;

            this.animationTime = timestamp;
            this.render();

            this.animationFrame = requestAnimationFrame(animate);
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    /**
     * Stop animation loop
     */
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    /**
     * Render main canvas (background + nodes + connections)
     */
    renderMainLayer() {
        // Clear with black
        this.mainCtx.fillStyle = '#000000';
        this.mainCtx.fillRect(0, 0, this.options.width, this.options.height);

        // Draw background pattern
        this.renderBackground();

        if (!this.treeData) return;

        // Save context
        this.mainCtx.save();

        // Apply viewport transform
        this.mainCtx.translate(this.viewport.x, this.viewport.y);
        this.mainCtx.scale(this.viewport.scale, this.viewport.scale);

        // Render group backgrounds
        this.renderGroupBackgrounds(this.mainCtx);

        // Render connections
        this.renderConnections(this.mainCtx);

        // Render nodes
        this.renderNodes(this.mainCtx);

        // Restore context
        this.mainCtx.restore();
    }

    /**
     * Render background texture pattern
     */
    renderBackground() {
        // Create background pattern if not exists
        if (!this.backgroundPattern && this.sprites?.background) {
            const zoomKey = String(this.zoomLevels[this.options.spriteZoomLevel]);
            const bgData = this.sprites.background[zoomKey];

            if (bgData) {
                const cdnUrl = bgData.filename;
                const urlMatch = cdnUrl?.match(/\/([^\/]+\.(?:jpg|png|webp))(?:\?|$)/i);

                if (urlMatch) {
                    const localFileName = urlMatch[1];
                    const bgUrl = `${this.options.assetBaseUrl}${localFileName}`;

                    if (this.spriteImages.has(bgUrl)) {
                        const bgImage = this.spriteImages.get(bgUrl);
                        const coords = bgData.coords?.['Background2'];

                        if (coords) {
                            // Create pattern from background tile
                            const tempCanvas = document.createElement('canvas');
                            tempCanvas.width = coords.w;
                            tempCanvas.height = coords.h;
                            const tempCtx = tempCanvas.getContext('2d');

                            tempCtx.drawImage(
                                bgImage,
                                coords.x, coords.y, coords.w, coords.h,
                                0, 0, coords.w, coords.h
                            );

                            this.backgroundPattern = this.mainCtx.createPattern(tempCanvas, 'repeat');
                        }
                    } else {
                        // Load background image
                        this.loadImage(bgUrl).then(() => {
                            requestAnimationFrame(() => this.render());
                        }).catch(() => {});
                    }
                }
            }
        }

        // Fill with pattern
        if (this.backgroundPattern) {
            this.mainCtx.fillStyle = this.backgroundPattern;
            this.mainCtx.fillRect(0, 0, this.options.width, this.options.height);
        }
    }

    /**
     * Render group background circles
     */
    renderGroupBackgrounds(ctx) {
        if (!this.sprites?.groupBackground || !this.rawTreeData?.groups) return;

        const zoomKey = String(this.zoomLevels[this.options.spriteZoomLevel]);
        const gbData = this.sprites.groupBackground[zoomKey];

        if (!gbData) return;

        const cdnUrl = gbData.filename;
        const urlMatch = cdnUrl?.match(/\/([^\/]+\.(?:jpg|png|webp))(?:\?|$)/i);
        if (!urlMatch) return;

        const localFileName = urlMatch[1];
        const gbUrl = `${this.options.assetBaseUrl}${localFileName}`;

        if (!this.spriteImages.has(gbUrl)) {
            // Load group background image
            this.loadImage(gbUrl).then(() => {
                requestAnimationFrame(() => this.render());
            }).catch(() => {});
            return;
        }

        const gbImage = this.spriteImages.get(gbUrl);

        // Render group backgrounds for each group
        Object.values(this.rawTreeData.groups).forEach(group => {
            if (!group.x || !group.y) return;

            // Get appropriate background sprite based on group orbit count
            const groupBgName = group.orbits?.length > 3 ? 'PSGroupBackground3' : 'PSGroupBackground1';
            const coords = gbData.coords?.[groupBgName];

            if (coords) {
                const scale = 1.0; // Adjust as needed
                const w = coords.w * scale;
                const h = coords.h * scale;

                ctx.globalAlpha = 0.3; // Semi-transparent
                ctx.drawImage(
                    gbImage,
                    coords.x, coords.y, coords.w, coords.h,
                    group.x - w/2, group.y - h/2, w, h
                );
                ctx.globalAlpha = 1.0;
            }
        });
    }

    /**
     * Render connections (arc for same orbit, straight for different)
     * Filters out connections to hidden ascendancy/bloodline nodes
     * Highlights allocated paths
     */
    renderConnections(ctx) {
        if (!this.treeData?.links) return;

        const nodeMap = new Map(this.treeData.nodes.map(n => [n.id, n]));
        const allowedAscendancies = this.selectedClass?.ascendancies || [];

        this.treeData.links.forEach(link => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);

            if (!source || !target) return;

            // Filter connections to ascendancy nodes (POE official behavior)
            if (source.type === 'ascendancy' || target.type === 'ascendancy') {
                if (!this.selectedClass) return; // No class selected, skip ascendancy connections
                const sourceAllowed = source.type !== 'ascendancy' || allowedAscendancies.includes(source.ascendancyName);
                const targetAllowed = target.type !== 'ascendancy' || allowedAscendancies.includes(target.ascendancyName);
                if (!sourceAllowed || !targetAllowed) return;
            }

            // Filter connections to bloodline nodes
            if (source.type === 'bloodline' || target.type === 'bloodline') {
                if (!this.selectedClass) return; // No class selected, skip bloodline connections
            }

            const isAllocated = this.allocatedNodes.has(source.id) && this.allocatedNodes.has(target.id);
            const isPartial = this.allocatedNodes.has(source.id) || this.allocatedNodes.has(target.id);
            const isPath = isAllocated; // Both nodes allocated = path

            // Determine connection style
            if (source.orbit === target.orbit && source.group === target.group) {
                // Same orbit - use arc (POE official approach)
                this.drawArc(ctx, source, target, isAllocated, isPartial);
            } else {
                // Different orbit/group - straight line
                this.drawStraightPath(ctx, source, target, isAllocated, isPartial);
            }
        });
    }

    /**
     * Draw arc connection (for same orbit nodes)
     */
    drawArc(ctx, source, target, isAllocated, isPartial) {
        // Calculate arc parameters
        const centerX = (source.x + target.x) / 2;
        const centerY = (source.y + target.y) / 2;
        const radius = Math.sqrt(Math.pow(source.x - centerX, 2) + Math.pow(source.y - centerY, 2));

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius,
                Math.atan2(source.y - centerY, source.x - centerX),
                Math.atan2(target.y - centerY, target.x - centerX));

        if (isAllocated) {
            ctx.strokeStyle = '#b89968'; // Gold
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.9;
        } else if (isPartial) {
            ctx.strokeStyle = '#7a6f5c'; // Dim gold
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
        } else {
            ctx.strokeStyle = '#4a4a4a'; // Dark gray
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
        }

        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }

    /**
     * Draw straight path connection
     */
    drawStraightPath(ctx, source, target, isAllocated, isPartial) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);

        if (isAllocated) {
            // Draw glow for allocated paths
            ctx.save();
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 6;
            ctx.strokeStyle = '#d4af37'; // Brighter gold
            ctx.lineWidth = 5;
            ctx.globalAlpha = 1.0;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        } else if (isPartial) {
            ctx.strokeStyle = '#7a6f5c';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
            ctx.lineCap = 'round';
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#4a4a4a';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        ctx.globalAlpha = 1.0;
    }

    /**
     * Render nodes with Canvas
     * Only renders ascendancy nodes for selected class (POE official behavior)
     */
    renderNodes(ctx) {
        if (!this.treeData?.nodes) return;

        // Get allowed ascendancy names for current class
        const allowedAscendancies = this.selectedClass?.ascendancies || [];

        // Render in layers: normal -> notable -> keystone -> ascendancy -> bloodline -> class start
        const layers = ['normal', 'notable', 'mastery', 'jewel', 'keystone', 'ascendancy', 'bloodline', 'classStart'];

        layers.forEach(type => {
            this.treeData.nodes
                .filter(n => {
                    if (n.type !== type) return false;

                    // Filter ascendancy nodes: only show if class is selected and matches
                    if (n.type === 'ascendancy') {
                        if (!this.selectedClass) return false; // No class selected, hide all ascendancies
                        return allowedAscendancies.includes(n.ascendancyName);
                    }

                    // Filter bloodline nodes: only show if class is selected
                    if (n.type === 'bloodline') {
                        return this.selectedClass !== null;
                    }

                    return true;
                })
                .forEach(node => {
                    // Render synchronously - sprite loading happens in background
                    this.renderNode(ctx, node);
                });
        });
    }

    /**
     * Render individual node with sprite images (GGG official sprites)
     */
    renderNode(ctx, node) {
        const isAllocated = this.allocatedNodes.has(node.id);
        const isHovered = this.hoveredNode?.id === node.id;
        const radius = (this.nodeSizes[node.type] || this.nodeSizes.normal) / 2;

        // Try to render sprite if available
        const spriteRendered = this.renderNodeSprite(ctx, node, isAllocated, isHovered);

        // Render circle only if sprite not rendered
        if (!spriteRendered) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

            if (isAllocated) {
                ctx.fillStyle = this.getNodeColor(node);
                ctx.fill();
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else if (isHovered) {
                ctx.fillStyle = '#3a3a3a';
                ctx.fill();
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                ctx.fillStyle = '#1a1a1a';
                ctx.fill();
                ctx.strokeStyle = this.getNodeColor(node);
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Draw node label for keystones
        if (node.type === 'keystone' || (node.type === 'notable' && isAllocated)) {
            ctx.save();
            ctx.fillStyle = isAllocated ? '#d4af37' : '#999';
            ctx.font = `${isAllocated ? 'bold ' : ''}12px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;
            ctx.fillText(node.name || '', node.x, node.y + radius + 5);
            ctx.restore();
        }
    }

    /**
     * Render node sprite from sprite sheet (GGG official)
     * Returns true if sprite was rendered, false if fallback needed
     */
    renderNodeSprite(ctx, node, isAllocated, isHovered) {
        if (!node.icon || !this.sprites) return false;

        try {
            // Determine sprite sheet based on node type and state
            let spriteSheetName = 'normalActive';

            // Map node types to correct sprite sheets (GGG official naming)
            if (node.type === 'keystone') {
                spriteSheetName = isAllocated ? 'keystoneActive' : 'keystoneInactive';
            } else if (node.type === 'notable') {
                spriteSheetName = isAllocated ? 'notableActive' : 'notableInactive';
            } else if (node.type === 'normal') {
                spriteSheetName = isAllocated ? 'normalActive' : 'normalInactive';
            } else if (node.type === 'mastery') {
                // Mastery nodes have multiple states
                if (isAllocated) {
                    spriteSheetName = 'masteryActiveSelected';
                } else if (this.isMasteryConnected(node)) {
                    spriteSheetName = 'masteryConnected';
                } else {
                    spriteSheetName = 'masteryInactive';
                }
            } else if (node.type === 'jewel') {
                // Jewels use special sprite sheet
                return this.renderJewelSocket(ctx, node, isAllocated, isHovered);
            } else if (node.type === 'ascendancy') {
                // Ascendancy nodes use normal sprite sheets but may have special icons
                spriteSheetName = isAllocated ? 'notableActive' : 'notableInactive';
            } else if (node.type === 'bloodline') {
                // Bloodline nodes similar to normal nodes
                spriteSheetName = isAllocated ? 'normalActive' : 'normalInactive';
            } else if (node.type === 'classStart') {
                // Class start nodes use ascendancy sprite sheet for class icons
                return this.renderClassStart(ctx, node);
            }

            // Get sprite sheet metadata - zoom keys are STRINGS
            const zoomLevels = [0.1246, 0.2109, 0.2972, 0.3835];
            const zoomKey = String(zoomLevels[this.options.spriteZoomLevel]); // Convert to string!

            const spriteSheet = this.sprites[spriteSheetName];
            if (!spriteSheet) {
                if (!this._warnedSheets) this._warnedSheets = new Set();
                if (!this._warnedSheets.has(spriteSheetName)) {
                    console.warn(`❌ Sprite sheet not found: ${spriteSheetName}`);
                    this._warnedSheets.add(spriteSheetName);
                }
                return false;
            }

            const zoomData = spriteSheet[zoomKey];
            if (!zoomData) {
                console.warn(`❌ Zoom level ${zoomKey} not found in ${spriteSheetName}`);
                return false;
            }

            const coords = zoomData.coords?.[node.icon];
            if (!coords) return false;

            // Get the filename from metadata (extract from CDN URL)
            const cdnUrl = zoomData.filename;
            if (!cdnUrl) {
                console.warn(`❌ No filename in sprite metadata for ${spriteSheetName}`);
                return false;
            }

            // Extract filename from CDN URL (e.g., "skills-2.jpg" from "https://web.poecdn.com/.../skills-2.jpg?hash")
            const urlMatch = cdnUrl.match(/\/([^\/]+\.(?:jpg|png|webp))(?:\?|$)/i);
            if (!urlMatch) {
                console.warn(`❌ Could not extract filename from URL: ${cdnUrl}`);
                return false;
            }
            const localFileName = urlMatch[1];
            const spriteUrl = `${this.options.assetBaseUrl}${localFileName}`;

            // Check if image is already loaded
            if (this.spriteImages.has(spriteUrl)) {
                const image = this.spriteImages.get(spriteUrl);

                // Calculate scale to match node size
                const nodeRadius = (this.nodeSizes[node.type] || this.nodeSizes.normal) / 2;
                const spriteScale = (nodeRadius * 2) / Math.max(coords.w, coords.h);

                const w = coords.w * spriteScale;
                const h = coords.h * spriteScale;

                // Save context for clipping
                ctx.save();

                // Create circular clip path (POE official style)
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
                ctx.clip();

                // Draw sprite (will be clipped to circle)
                ctx.drawImage(
                    image,
                    coords.x, coords.y, coords.w, coords.h, // Source rectangle
                    node.x - w/2, node.y - h/2, w, h         // Destination rectangle
                );

                // Restore context (remove clip)
                ctx.restore();

                // Draw mastery glow effect if allocated (animated)
                if (node.type === 'mastery' && isAllocated) {
                    this.renderMasteryGlow(ctx, node);
                }

                // Draw frame overlay (POE official frames)
                this.renderNodeFrame(ctx, node, isAllocated, isHovered);

                return true; // Sprite rendered successfully

            } else {
                // Start loading the image
                this.loadImage(spriteUrl).then(() => {
                    // Trigger re-render when first sprite loads
                    if (!this.spritesLoaded) {
                        this.spritesLoaded = true;
                        console.log('✅ First sprite loaded, re-rendering tree');
                        requestAnimationFrame(() => this.render());
                    }
                }).catch((error) => {
                    console.error(`❌ Failed to load sprite: ${spriteUrl}`, error);
                });

                return false; // Sprite not yet loaded, use fallback
            }

        } catch (error) {
            return false;
        }
    }

    /**
     * Render class start node (large class icon)
     */
    renderClassStart(ctx, node) {
        if (!this.sprites?.ascendancy) return false;

        try {
            // Map node to class name
            const classNames = {
                '26725': 'Ascendant',  // Scion
                '4': 'Marauder',
                '48679': 'Ranger',
                '41529': 'Witch',
                '55549': 'Duelist',
                '36634': 'Templar',
                '26196': 'Shadow'
            };

            const className = classNames[node.id];
            if (!className) return false;

            const ascendancySpriteName = `Classes${className}`;

            const zoomLevels = [0.1246, 0.2109, 0.2972, 0.3835];
            const zoomKey = String(zoomLevels[this.options.spriteZoomLevel]);

            const ascendancyData = this.sprites.ascendancy[zoomKey];
            if (!ascendancyData) return false;

            const coords = ascendancyData.coords?.[ascendancySpriteName];
            if (!coords) return false;

            // Extract filename
            const cdnUrl = ascendancyData.filename;
            if (!cdnUrl) return false;

            const urlMatch = cdnUrl.match(/\/([^\/]+\.(?:jpg|png|webp))(?:\?|$)/i);
            if (!urlMatch) return false;

            const localFileName = urlMatch[1];
            const ascendancyUrl = `${this.options.assetBaseUrl}${localFileName}`;

            // Check if loaded
            if (this.spriteImages.has(ascendancyUrl)) {
                const classImage = this.spriteImages.get(ascendancyUrl);

                const nodeRadius = (this.nodeSizes.classStart || 100) / 2;
                const scale = (nodeRadius * 2) / Math.max(coords.w, coords.h);

                const w = coords.w * scale;
                const h = coords.h * scale;

                // Draw class icon
                ctx.drawImage(
                    classImage,
                    coords.x, coords.y, coords.w, coords.h,
                    node.x - w/2, node.y - h/2, w, h
                );

                return true;
            } else {
                // Load ascendancy sprite
                this.loadImage(ascendancyUrl).then(() => {
                    if (!this.spritesLoaded) {
                        requestAnimationFrame(() => this.render());
                    }
                }).catch(() => {});

                return false;
            }

        } catch (error) {
            return false;
        }
    }

    /**
     * Check if mastery node is connected (has adjacent allocated nodes)
     */
    isMasteryConnected(masteryNode) {
        if (!this.treeData?.links) return false;

        // Find all nodes connected to this mastery
        const connectedNodeIds = this.treeData.links
            .filter(link => link.source === masteryNode.id || link.target === masteryNode.id)
            .map(link => link.source === masteryNode.id ? link.target : link.source);

        // Check if any connected node is allocated
        return connectedNodeIds.some(nodeId => this.allocatedNodes.has(nodeId));
    }

    /**
     * Render jewel socket (special handling for jewel nodes)
     */
    renderJewelSocket(ctx, node, isAllocated, isHovered) {
        if (!this.sprites?.jewel) return false;

        try {
            // Jewel sockets use different sprite naming
            // Default to unallocated socket
            let jewelSpriteName = 'JewelSocketNormal';

            if (isAllocated) {
                // Can check node.jewelData for specific types (red, blue, green, prismatic, etc.)
                // For now, use default active
                jewelSpriteName = 'JewelSocketActiveBlue'; // Default active jewel
            }

            const zoomLevels = [0.1246, 0.2109, 0.2972, 0.3835];
            const zoomKey = String(zoomLevels[this.options.spriteZoomLevel]);

            const jewelData = this.sprites.jewel[zoomKey];
            if (!jewelData) return false;

            const coords = jewelData.coords?.[jewelSpriteName];
            if (!coords) {
                // Try alternative names
                const altNames = ['JewelSocketActivePrismaticAlt', 'JewelSocketActiveBlueAlt', 'JewelFrameAllocated'];
                for (const altName of altNames) {
                    if (jewelData.coords?.[altName]) {
                        jewelSpriteName = altName;
                        break;
                    }
                }

                const finalCoords = jewelData.coords?.[jewelSpriteName];
                if (!finalCoords) return false;
            }

            const finalCoords = jewelData.coords[jewelSpriteName];

            // Extract filename from CDN URL
            const cdnUrl = jewelData.filename;
            if (!cdnUrl) return false;

            const urlMatch = cdnUrl.match(/\/([^\/]+\.(?:jpg|png|webp))(?:\?|$)/i);
            if (!urlMatch) return false;

            const localFileName = urlMatch[1];
            const jewelUrl = `${this.options.assetBaseUrl}${localFileName}`;

            // Check if jewel image is loaded
            if (this.spriteImages.has(jewelUrl)) {
                const jewelImage = this.spriteImages.get(jewelUrl);

                const nodeRadius = (this.nodeSizes.jewel || this.nodeSizes.normal) / 2;
                const jewelScale = (nodeRadius * 2) / Math.max(finalCoords.w, finalCoords.h);

                const w = finalCoords.w * jewelScale;
                const h = finalCoords.h * jewelScale;

                // Draw jewel sprite (no circular clip needed for jewels)
                ctx.drawImage(
                    jewelImage,
                    finalCoords.x, finalCoords.y, finalCoords.w, finalCoords.h,
                    node.x - w/2, node.y - h/2, w, h
                );

                return true;
            } else {
                // Load jewel sprite
                this.loadImage(jewelUrl).then(() => {
                    if (!this.spritesLoaded) {
                        requestAnimationFrame(() => this.render());
                    }
                }).catch(() => {});

                return false;
            }

        } catch (error) {
            return false;
        }
    }

    /**
     * Render mastery glow effect (animated)
     */
    renderMasteryGlow(ctx, node) {
        if (!this.sprites?.masteryActiveEffect) return;

        try {
            const zoomLevels = [0.1246, 0.2109, 0.2972, 0.3835];
            const zoomKey = String(zoomLevels[this.options.spriteZoomLevel]);

            const effectData = this.sprites.masteryActiveEffect[zoomKey];
            if (!effectData || !node.icon) return;

            const coords = effectData.coords?.[node.icon];
            if (!coords) return;

            // Extract filename
            const cdnUrl = effectData.filename;
            if (!cdnUrl) return;

            const urlMatch = cdnUrl.match(/\/([^\/]+\.(?:jpg|png|webp))(?:\?|$)/i);
            if (!urlMatch) return;

            const localFileName = urlMatch[1];
            const effectUrl = `${this.options.assetBaseUrl}${localFileName}`;

            if (!this.spriteImages.has(effectUrl)) {
                // Load effect sprite
                this.loadImage(effectUrl).then(() => {
                    // Start animation when effect loads
                    if (!this.isAnimating) {
                        this.startAnimation();
                    }
                }).catch(() => {});
                return;
            }

            const effectImage = this.spriteImages.get(effectUrl);

            // Calculate pulsing opacity (sine wave)
            const pulseSpeed = 0.002; // Speed of pulse
            const minOpacity = 0.3;
            const maxOpacity = 0.8;
            const opacity = minOpacity + (maxOpacity - minOpacity) *
                           (0.5 + 0.5 * Math.sin(this.animationTime * pulseSpeed));

            // Calculate scale
            const nodeRadius = (this.nodeSizes.mastery || this.nodeSizes.normal) / 2;
            const effectScale = (nodeRadius * 2.5) / Math.max(coords.w, coords.h); // Larger for glow

            const w = coords.w * effectScale;
            const h = coords.h * effectScale;

            // Draw glow effect
            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow

            ctx.drawImage(
                effectImage,
                coords.x, coords.y, coords.w, coords.h,
                node.x - w/2, node.y - h/2, w, h
            );

            ctx.restore();

        } catch (error) {
            // Silently fail
        }
    }

    /**
     * Render node frame overlay (GGG official frames)
     */
    renderNodeFrame(ctx, node, isAllocated, isHovered) {
        if (!this.sprites?.frame) return;

        try {
            // Determine frame name based on node type and state
            let frameName = null;

            if (node.type === 'keystone') {
                if (isAllocated) {
                    frameName = 'KeystoneFrameAllocated';
                } else {
                    frameName = 'KeystoneFrameUnallocated';
                }
            } else if (node.type === 'notable') {
                if (isAllocated) {
                    frameName = 'NotableFrameAllocated';
                } else {
                    frameName = 'NotableFrameUnallocated';
                }
            } else if (node.type === 'normal') {
                // Normal nodes don't typically have frames in POE
                return;
            } else if (node.type === 'jewel') {
                // Jewel frames handled separately
                return;
            }

            if (!frameName) return;

            // Get frame sprite metadata
            const zoomLevels = [0.1246, 0.2109, 0.2972, 0.3835];
            const zoomKey = String(zoomLevels[this.options.spriteZoomLevel]);

            const frameData = this.sprites.frame[zoomKey];
            if (!frameData) return;

            const coords = frameData.coords?.[frameName];
            if (!coords) return;

            // Extract filename from CDN URL
            const cdnUrl = frameData.filename;
            if (!cdnUrl) return;

            const urlMatch = cdnUrl.match(/\/([^\/]+\.(?:jpg|png|webp))(?:\?|$)/i);
            if (!urlMatch) return;

            const localFileName = urlMatch[1];
            const frameUrl = `${this.options.assetBaseUrl}${localFileName}`;

            // Check if frame image is already loaded
            if (this.spriteImages.has(frameUrl)) {
                const frameImage = this.spriteImages.get(frameUrl);

                // Calculate scale to match node size
                const nodeRadius = (this.nodeSizes[node.type] || this.nodeSizes.normal) / 2;
                const frameScale = (nodeRadius * 2.2) / Math.max(coords.w, coords.h); // Slightly larger than node

                const w = coords.w * frameScale;
                const h = coords.h * frameScale;

                // Draw frame (centered on node)
                ctx.drawImage(
                    frameImage,
                    coords.x, coords.y, coords.w, coords.h, // Source
                    node.x - w/2, node.y - h/2, w, h         // Destination
                );
            } else {
                // Start loading the frame image
                this.loadImage(frameUrl).then(() => {
                    // Re-render when frame loads
                    if (!this.spritesLoaded) {
                        requestAnimationFrame(() => this.render());
                    }
                }).catch(() => {
                    // Silently fail
                });
            }

        } catch (error) {
            // Silently fail - frames are optional
        }
    }

    /**
     * Load image (with caching)
     */
    async loadImage(url) {
        // Check cache
        if (this.spriteImages.has(url)) {
            return this.spriteImages.get(url);
        }

        // Check if already loading
        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url);
        }

        // Create loading promise
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.spriteImages.set(url, img);
                this.loadingPromises.delete(url);
                resolve(img);
            };
            img.onerror = () => {
                this.loadingPromises.delete(url);
                reject(new Error(`Failed to load: ${url}`));
            };
            img.src = url;
        });

        this.loadingPromises.set(url, promise);
        return promise;
    }

    /**
     * Get node color by type (POE official colors)
     */
    getNodeColor(node) {
        switch (node.type) {
            case 'classStart': return '#3b82f6'; // Blue
            case 'keystone': return '#8b5cf6'; // Purple
            case 'mastery': return '#7c3aed'; // Deep purple
            case 'jewel': return '#14b8a6'; // Teal
            case 'notable': return '#10b981'; // Green
            case 'bloodline': return '#ef4444'; // Red
            case 'ascendancy': return '#f97316'; // Orange
            default: return '#6b7280'; // Gray
        }
    }

    /**
     * Render path preview showing shortest path to hovered node
     */
    renderPathPreview(ctx, pathData) {
        if (!pathData?.path || !this.treeData?.nodes) return;

        const { path, cost } = pathData;
        const nodeMap = new Map(this.treeData.nodes.map(n => [n.id, n]));

        // Draw path connections
        for (let i = 0; i < path.length - 1; i++) {
            const sourceNode = nodeMap.get(path[i]);
            const targetNode = nodeMap.get(path[i + 1]);

            if (!sourceNode || !targetNode) continue;

            // Skip already allocated connections
            const isAllocated = this.allocatedNodes.has(sourceNode.id) &&
                              this.allocatedNodes.has(targetNode.id);

            if (isAllocated) continue;

            // Draw preview path with distinctive style
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);

            // Animated dashed line for path preview
            const dashSpeed = 0.001;
            const dashOffset = (this.animationTime * dashSpeed) % 20;
            ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = -dashOffset;

            // Cyan/blue color for path preview
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.7;
            ctx.lineCap = 'round';

            // Add glow
            ctx.shadowColor = '#3b82f6';
            ctx.shadowBlur = 8;

            ctx.stroke();
            ctx.restore();
        }

        // Draw preview nodes (nodes that will be allocated)
        path.forEach((nodeId, index) => {
            // Skip first node (already allocated) and last node (hovered, already highlighted)
            if (index === 0 || index === path.length - 1) return;

            // Skip already allocated nodes
            if (this.allocatedNodes.has(nodeId)) return;

            const node = nodeMap.get(nodeId);
            if (!node) return;

            const nodeRadius = (this.nodeSizes[node.type] || this.nodeSizes.normal) / 2;

            // Draw preview node indicator
            ctx.save();

            // Outer glow
            const glowGradient = ctx.createRadialGradient(
                node.x, node.y, nodeRadius * 0.5,
                node.x, node.y, nodeRadius * 1.5
            );
            glowGradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
            glowGradient.addColorStop(0.7, 'rgba(59, 130, 246, 0.3)');
            glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = glowGradient;
            ctx.fill();

            // Ring indicator
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius + 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.8;
            ctx.stroke();

            ctx.restore();
        });

        // Display cost indicator on hovered node
        if (cost > 0 && this.hoveredNode) {
            ctx.save();

            const costText = `${cost} pts`;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const nodeRadius = (this.nodeSizes[this.hoveredNode.type] || this.nodeSizes.normal) / 2;
            const textY = this.hoveredNode.y - nodeRadius - 20;

            // Background
            const textMetrics = ctx.measureText(costText);
            const padding = 6;
            const bgWidth = textMetrics.width + padding * 2;
            const bgHeight = 20;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(
                this.hoveredNode.x - bgWidth / 2,
                textY - bgHeight / 2,
                bgWidth,
                bgHeight
            );

            // Border
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 1;
            ctx.strokeRect(
                this.hoveredNode.x - bgWidth / 2,
                textY - bgHeight / 2,
                bgWidth,
                bgHeight
            );

            // Text
            ctx.fillStyle = '#3b82f6';
            ctx.fillText(costText, this.hoveredNode.x, textY);

            ctx.restore();
        }
    }

    /**
     * Render search result highlights
     */
    renderSearchHighlights(ctx) {
        if (!this.searchResults || this.searchResults.length === 0) return;

        this.searchResults.forEach((result, index) => {
            const node = result.node;
            const nodeRadius = (this.nodeSizes[node.type] || this.nodeSizes.normal) / 2;
            const isCurrent = index === this.currentSearchIndex;

            ctx.save();

            // Different style for current result vs other results
            if (isCurrent) {
                // Current result: bright green pulsing glow
                const pulseSpeed = 0.003;
                const minOpacity = 0.5;
                const maxOpacity = 1.0;
                const opacity = minOpacity + (maxOpacity - minOpacity) *
                               (0.5 + 0.5 * Math.sin(this.animationTime * pulseSpeed));

                // Outer glow
                const glowRadius = nodeRadius * 2.5;
                const gradient = ctx.createRadialGradient(
                    node.x, node.y, nodeRadius,
                    node.x, node.y, glowRadius
                );
                gradient.addColorStop(0, 'rgba(34, 197, 94, ' + (opacity * 0.8) + ')'); // Green
                gradient.addColorStop(0.5, 'rgba(34, 197, 94, ' + (opacity * 0.4) + ')');
                gradient.addColorStop(1, 'rgba(34, 197, 94, 0)');

                ctx.beginPath();
                ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Ring
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRadius + 4, 0, Math.PI * 2);
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 3;
                ctx.globalAlpha = opacity;
                ctx.stroke();
            } else {
                // Other results: subtle yellow glow
                ctx.beginPath();
                ctx.arc(node.x, node.y, nodeRadius + 3, 0, Math.PI * 2);
                ctx.strokeStyle = '#eab308';
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.5;
                ctx.stroke();

                // Small yellow dot
                ctx.beginPath();
                ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#eab308';
                ctx.globalAlpha = 0.7;
                ctx.fill();
            }

            ctx.restore();
        });

        // Ensure animation continues for search highlights
        if (this.searchResults.length > 0 && !this.isAnimating) {
            this.startAnimation();
        }
    }

    /**
     * Render mid canvas (highlights and animations)
     */
    renderMidLayer() {
        // Clear
        this.midCtx.clearRect(0, 0, this.options.width, this.options.height);

        // Save context
        this.midCtx.save();
        this.midCtx.translate(this.viewport.x, this.viewport.y);
        this.midCtx.scale(this.viewport.scale, this.viewport.scale);

        // Draw search result highlights (if any)
        if (this.searchResults.length > 0) {
            this.renderSearchHighlights(this.midCtx);
        }

        // Draw path preview if available (only if hovering)
        if (this.hoveredNode && this.pathToHoveredNode?.path && this.pathToHoveredNode.path.length > 1) {
            this.renderPathPreview(this.midCtx, this.pathToHoveredNode);
        }

        // Draw animated hover highlight (only if hovering)
        if (!this.hoveredNode) {
            this.midCtx.restore();
            return;
        }

        // Draw animated hover highlight
        const radius = (this.nodeSizes[this.hoveredNode.type] || this.nodeSizes.normal) / 2;

        // Pulsing scale animation
        const pulseSpeed = 0.003;
        const minScale = 1.0;
        const maxScale = 1.15;
        const scale = minScale + (maxScale - minScale) *
                     (0.5 + 0.5 * Math.sin(this.animationTime * pulseSpeed));

        // Pulsing opacity
        const minOpacity = 0.5;
        const maxOpacity = 0.9;
        const opacity = minOpacity + (maxOpacity - minOpacity) *
                       (0.5 + 0.5 * Math.sin(this.animationTime * pulseSpeed));

        // Draw outer glow
        const glowRadius = (radius + 8) * scale;
        const gradient = this.midCtx.createRadialGradient(
            this.hoveredNode.x, this.hoveredNode.y, radius,
            this.hoveredNode.x, this.hoveredNode.y, glowRadius
        );
        gradient.addColorStop(0, 'rgba(245, 158, 11, ' + (opacity * 0.8) + ')');
        gradient.addColorStop(0.5, 'rgba(245, 158, 11, ' + (opacity * 0.4) + ')');
        gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');

        this.midCtx.beginPath();
        this.midCtx.arc(this.hoveredNode.x, this.hoveredNode.y, glowRadius, 0, Math.PI * 2);
        this.midCtx.fillStyle = gradient;
        this.midCtx.fill();

        // Draw inner ring
        this.midCtx.beginPath();
        this.midCtx.arc(this.hoveredNode.x, this.hoveredNode.y, (radius + 3) * scale, 0, Math.PI * 2);
        this.midCtx.strokeStyle = '#f59e0b';
        this.midCtx.lineWidth = 2;
        this.midCtx.globalAlpha = opacity;
        this.midCtx.stroke();

        this.midCtx.restore();

        // Ensure animation continues for hover effect
        if (!this.isAnimating) {
            this.startAnimation();
        }
    }

    /**
     * Render top canvas (UI overlays)
     */
    renderTopLayer() {
        // Clear
        this.topCtx.clearRect(0, 0, this.options.width, this.options.height);

        // Debug info (optional)
        if (false) { // Set to true for debug
            this.topCtx.fillStyle = '#fff';
            this.topCtx.font = '12px monospace';
            this.topCtx.fillText(`Zoom: ${this.viewport.scale.toFixed(2)}x`, 10, 20);
            this.topCtx.fillText(`Pos: ${Math.round(this.viewport.x)}, ${Math.round(this.viewport.y)}`, 10, 40);
            this.topCtx.fillText(`Nodes: ${this.treeData?.nodes.length || 0}`, 10, 60);
        }
    }

    /**
     * Show tooltip for node
     */
    showTooltip(e, node) {
        let tooltip = document.getElementById('tree-tooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'tree-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(20, 20, 20, 0.95);
                border: 1px solid #555;
                border-radius: 6px;
                padding: 12px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.5);
                z-index: 20;
                pointer-events: none;
                max-width: 300px;
            `;
            this.container.appendChild(tooltip);
        }

        // Check if this is a mastery with selected effect
        let masteryEffectHtml = '';
        if ((node.isMastery || node.type === 'mastery') && this.allocatedNodes.has(node.id)) {
            const selectedEffectId = this.masterySelections.get(node.id);
            if (selectedEffectId && node.masteryEffects) {
                const effectData = node.masteryEffects.find(e => e.effect === selectedEffectId);
                if (effectData) {
                    masteryEffectHtml = `
                        <div style="color: #60a5fa; font-size: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #444;">
                            <div style="color: #fbbf24; font-weight: 600; margin-bottom: 4px;">Selected Effect:</div>
                            ${effectData.stats.map(s => `• ${s}`).join('<br>')}
                        </div>
                    `;
                }
            }
        }

        tooltip.innerHTML = `
            <div style="font-weight: bold; color: white; margin-bottom: 8px;">
                ${node.name}
            </div>
            ${node.stats && node.stats.length > 0 ? `
                <div style="color: #aaa; font-size: 12px;">
                    ${node.stats.map(s => `• ${s}`).join('<br>')}
                </div>
            ` : ''}
            ${masteryEffectHtml}
            <div style="color: #666; font-size: 11px; margin-top: 8px;">
                Click to ${this.allocatedNodes.has(node.id) ? 'deallocate' : 'allocate'}
            </div>
        `;

        const rect = this.container.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
        tooltip.style.top = (e.clientY - rect.top + 10) + 'px';
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('tree-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * Toggle node allocation
     */
    toggleNode(node) {
        if (this.allocatedNodes.has(node.id)) {
            // Deallocate node
            this.allocatedNodes.delete(node.id);

            // Remove mastery selection if it's a mastery
            if (node.isMastery || node.type === 'mastery') {
                this.masterySelections.delete(node.id);
            }

            showToast(`Deallocated: ${node.name}`, 'info');
        } else {
            // Allocate node

            // Debug mastery detection
            console.log('Toggle node:', {
                name: node.name,
                isMastery: node.isMastery,
                type: node.type,
                masteryEffects: node.masteryEffects
            });

            // If it's a mastery, show effect selection modal
            if ((node.isMastery || node.type === 'mastery') && node.masteryEffects && node.masteryEffects.length > 0) {
                console.log('Opening mastery modal for:', node.name);
                this.showMasteryEffectModal(node);
                return; // Don't allocate yet, wait for user to select effect
            }

            this.allocatedNodes.add(node.id);
            showToast(`Allocated: ${node.name}`, 'success');
        }

        this.markAllTilesDirty();
        this.render();
        this.updatePointsDisplay();

        // Emit event
        this.emit('nodeAllocated', node.id);
    }

    /**
     * Show mastery effect selection modal
     */
    showMasteryEffectModal(masteryNode) {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
        backdrop.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 9999;';

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto';
        modal.style.cssText = 'background: #1f2937; border-radius: 0.5rem; max-width: 42rem; width: 100%; margin: 1rem; max-height: 80vh; overflow-y: auto; padding: 1.5rem;';

        // Modal header
        const header = document.createElement('div');
        header.style.cssText = 'margin-bottom: 1rem; border-bottom: 2px solid #374151; padding-bottom: 1rem;';
        header.innerHTML = `
            <h3 style="color: #f59e0b; font-size: 1.5rem; font-weight: bold; margin: 0;">${masteryNode.name}</h3>
            <p style="color: #9ca3af; font-size: 0.875rem; margin-top: 0.5rem;">Select a mastery effect:</p>
        `;

        // Effects list
        const effectsList = document.createElement('div');
        effectsList.style.cssText = 'display: flex; flex-direction: column; gap: 0.75rem;';

        masteryNode.masteryEffects.forEach((effectData, index) => {
            const effectButton = document.createElement('button');
            effectButton.style.cssText = `
                background: #374151;
                border: 2px solid #4b5563;
                border-radius: 0.375rem;
                padding: 1rem;
                text-align: left;
                cursor: pointer;
                transition: all 0.2s;
                color: #e5e7eb;
            `;

            // Hover effect
            effectButton.onmouseenter = () => {
                effectButton.style.background = '#4b5563';
                effectButton.style.borderColor = '#f59e0b';
            };
            effectButton.onmouseleave = () => {
                effectButton.style.background = '#374151';
                effectButton.style.borderColor = '#4b5563';
            };

            // Effect stats
            const statsHtml = effectData.stats.map(stat =>
                `<div style="color: #60a5fa; font-size: 0.95rem; margin-top: 0.25rem;">• ${stat}</div>`
            ).join('');

            effectButton.innerHTML = `
                <div style="font-weight: 600; color: #fbbf24; margin-bottom: 0.5rem;">Effect ${index + 1}</div>
                ${statsHtml}
            `;

            effectButton.onclick = () => {
                this.selectMasteryEffect(masteryNode, effectData.effect);
                document.body.removeChild(backdrop);
            };

            effectsList.appendChild(effectButton);
        });

        // Cancel button
        const cancelButton = document.createElement('button');
        cancelButton.style.cssText = `
            background: #6b7280;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 0.375rem;
            border: none;
            cursor: pointer;
            margin-top: 1rem;
            width: 100%;
            font-weight: 600;
        `;
        cancelButton.textContent = 'Cancel';
        cancelButton.onclick = () => {
            document.body.removeChild(backdrop);
        };

        // Assemble modal
        modal.appendChild(header);
        modal.appendChild(effectsList);
        modal.appendChild(cancelButton);
        backdrop.appendChild(modal);

        // Close on backdrop click
        backdrop.onclick = (e) => {
            if (e.target === backdrop) {
                document.body.removeChild(backdrop);
            }
        };

        // Close on ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(backdrop);
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // Add to DOM
        document.body.appendChild(backdrop);
    }

    /**
     * Select mastery effect and allocate node
     */
    selectMasteryEffect(masteryNode, effectId) {
        // Store the selection
        this.masterySelections.set(masteryNode.id, effectId);

        // Allocate the mastery node
        this.allocatedNodes.add(masteryNode.id);

        // Get effect stats for display
        const effectData = masteryNode.masteryEffects.find(e => e.effect === effectId);
        const effectText = effectData?.stats[0] || 'Mastery effect';

        showToast(`Allocated: ${masteryNode.name} - ${effectText}`, 'success');

        this.markAllTilesDirty();
        this.render();
        this.updatePointsDisplay();

        // Emit event
        this.emit('nodeAllocated', masteryNode.id);
    }

    /**
     * Get selected mastery effect for a node
     */
    getMasteryEffect(nodeId) {
        return this.masterySelections.get(nodeId);
    }

    /**
     * Update points display (accurate POE counting)
     */
    updatePointsDisplay() {
        const pointsEl = document.getElementById('points-used');
        if (pointsEl) {
            // Count only actual passive points (exclude class start, ascendancy class start, mastery)
            let passivePoints = 0;

            this.allocatedNodes.forEach(nodeId => {
                const node = this.treeData.nodes.find(n => n.id === nodeId);
                if (!node) return;

                // Exclude these from point count (POE official rules)
                if (node.type === 'classStart') return; // Class start is free
                if (node.type === 'ascendancy') return; // Ascendancy points counted separately
                if (node.type === 'mastery') return; // Masteries are free

                passivePoints++;
            });

            pointsEl.textContent = passivePoints;
        }
    }

    /**
     * Get allocated counts by type
     */
    getAllocatedCounts() {
        const counts = {
            normal: 0,
            notable: 0,
            keystone: 0,
            jewel: 0,
            mastery: 0,
            ascendancy: 0,
            total: 0
        };

        this.allocatedNodes.forEach(nodeId => {
            const node = this.treeData.nodes.find(n => n.id === nodeId);
            if (!node) return;

            const type = node.type;
            if (counts.hasOwnProperty(type)) {
                counts[type]++;
            }

            // Count towards total (excluding class start and masteries)
            if (type !== 'classStart' && type !== 'mastery' && type !== 'ascendancy') {
                counts.total++;
            }
        });

        return counts;
    }

    /**
     * Build adjacency list from tree links for pathfinding
     * Called once when tree data is loaded
     */
    buildAdjacencyList() {
        this.adjacencyList.clear();

        if (!this.treeData?.links) return;

        // Initialize adjacency list for all nodes
        this.treeData.nodes.forEach(node => {
            this.adjacencyList.set(node.id, []);
        });

        // Build bidirectional adjacency list
        this.treeData.links.forEach(link => {
            const sourceId = link.source;
            const targetId = link.target;

            // Add edge in both directions (undirected graph)
            if (this.adjacencyList.has(sourceId)) {
                this.adjacencyList.get(sourceId).push(targetId);
            }
            if (this.adjacencyList.has(targetId)) {
                this.adjacencyList.get(targetId).push(sourceId);
            }
        });
    }

    /**
     * Find shortest path between two nodes using BFS
     * Returns array of node IDs representing the path, or null if no path exists
     */
    findShortestPath(startNodeId, endNodeId) {
        if (!this.adjacencyList.has(startNodeId) || !this.adjacencyList.has(endNodeId)) {
            return null;
        }

        if (startNodeId === endNodeId) {
            return [startNodeId];
        }

        // BFS to find shortest path
        const queue = [[startNodeId]];
        const visited = new Set([startNodeId]);

        while (queue.length > 0) {
            const path = queue.shift();
            const currentNodeId = path[path.length - 1];

            // Get neighbors
            const neighbors = this.adjacencyList.get(currentNodeId) || [];

            for (const neighborId of neighbors) {
                if (visited.has(neighborId)) continue;

                const newPath = [...path, neighborId];

                // Found the target
                if (neighborId === endNodeId) {
                    return newPath;
                }

                visited.add(neighborId);
                queue.push(newPath);
            }
        }

        return null; // No path found
    }

    /**
     * Find shortest path from any allocated node to target node
     * Returns {path: [], cost: number, startNodeId: string} or null
     */
    findPathToNode(targetNodeId) {
        if (!this.treeData?.nodes) return null;

        // If target is already allocated, no path needed
        if (this.allocatedNodes.has(targetNodeId)) {
            return { path: [targetNodeId], cost: 0, startNodeId: targetNodeId };
        }

        let shortestPath = null;
        let minCost = Infinity;
        let bestStartNodeId = null;

        // Try to find path from each allocated node
        this.allocatedNodes.forEach(allocatedNodeId => {
            const path = this.findShortestPath(allocatedNodeId, targetNodeId);

            if (path) {
                const cost = this.getPathCost(path);

                if (cost < minCost) {
                    minCost = cost;
                    shortestPath = path;
                    bestStartNodeId = allocatedNodeId;
                }
            }
        });

        if (shortestPath) {
            return {
                path: shortestPath,
                cost: minCost,
                startNodeId: bestStartNodeId
            };
        }

        return null;
    }

    /**
     * Calculate point cost of a path
     * Excludes already allocated nodes, class starts, and masteries
     */
    getPathCost(path) {
        if (!path || !this.treeData?.nodes) return 0;

        let cost = 0;

        path.forEach(nodeId => {
            // Skip already allocated nodes
            if (this.allocatedNodes.has(nodeId)) return;

            const node = this.treeData.nodes.find(n => n.id === nodeId);
            if (!node) return;

            // Skip free nodes (POE official rules)
            if (node.type === 'classStart') return; // Class start is free
            if (node.type === 'mastery') return; // Masteries are free

            cost++;
        });

        return cost;
    }

    /**
     * Search nodes by name, type, or stats
     * Returns array of matching nodes
     */
    searchNodes(query) {
        if (!query || !this.treeData?.nodes) {
            this.searchResults = [];
            this.currentSearchIndex = -1;
            this.searchQuery = '';
            this.render();
            return [];
        }

        this.searchQuery = query.toLowerCase();
        const results = [];

        this.treeData.nodes.forEach(node => {
            // Search by name
            if (node.name && node.name.toLowerCase().includes(this.searchQuery)) {
                results.push({
                    node: node,
                    matchType: 'name',
                    matchText: node.name
                });
                return;
            }

            // Search by type
            if (node.type && node.type.toLowerCase().includes(this.searchQuery)) {
                results.push({
                    node: node,
                    matchType: 'type',
                    matchText: node.type
                });
                return;
            }

            // Search by stats (if available)
            if (node.stats && Array.isArray(node.stats)) {
                for (const stat of node.stats) {
                    if (stat.toLowerCase().includes(this.searchQuery)) {
                        results.push({
                            node: node,
                            matchType: 'stat',
                            matchText: stat
                        });
                        return;
                    }
                }
            }
        });

        this.searchResults = results;
        this.currentSearchIndex = results.length > 0 ? 0 : -1;

        // Navigate to first result
        if (this.currentSearchIndex >= 0) {
            this.navigateToSearchResult(0);
        }

        return results;
    }

    /**
     * Navigate to specific search result
     */
    navigateToSearchResult(index) {
        if (index < 0 || index >= this.searchResults.length) {
            return false;
        }

        this.currentSearchIndex = index;
        const result = this.searchResults[index];
        const node = result.node;

        // Center view on the node
        const centerX = this.options.width / 2;
        const centerY = this.options.height / 2;

        this.viewport.x = centerX - (node.x * this.viewport.scale);
        this.viewport.y = centerY - (node.y * this.viewport.scale);

        this.markAllTilesDirty();
        this.render();

        // Show result info
        const resultNumber = index + 1;
        const totalResults = this.searchResults.length;
        showToast(
            `Result ${resultNumber}/${totalResults}: ${node.name} (${result.matchType})`,
            'info'
        );

        return true;
    }

    /**
     * Go to next search result
     */
    nextSearchResult() {
        if (this.searchResults.length === 0) return false;

        const nextIndex = (this.currentSearchIndex + 1) % this.searchResults.length;
        return this.navigateToSearchResult(nextIndex);
    }

    /**
     * Go to previous search result
     */
    previousSearchResult() {
        if (this.searchResults.length === 0) return false;

        const prevIndex = (this.currentSearchIndex - 1 + this.searchResults.length) % this.searchResults.length;
        return this.navigateToSearchResult(prevIndex);
    }

    /**
     * Clear search results
     */
    clearSearch() {
        this.searchResults = [];
        this.currentSearchIndex = -1;
        this.searchQuery = '';
        this.render();
        showToast('Search cleared', 'info');
    }

    /**
     * Get current search state
     */
    getSearchState() {
        return {
            query: this.searchQuery,
            results: this.searchResults,
            currentIndex: this.currentSearchIndex,
            totalResults: this.searchResults.length
        };
    }

    /**
     * Export current build to URL-safe string
     * Format: version|classId|ascendancyId|nodeIds
     * Compatible with sharing and bookmarking
     */
    exportToPoeUrl() {
        const version = '1'; // Our format version
        const classId = this.selectedClass?.id || '';
        const ascendancyId = this.selectedAscendancy || '';

        // Get allocated nodes (exclude class start)
        const allocatedNodeIds = Array.from(this.allocatedNodes)
            .filter(nodeId => {
                const node = this.treeData.nodes.find(n => n.id === nodeId);
                return node && node.type !== 'classStart';
            });

        // Build data object
        const buildData = {
            version: version,
            class: classId,
            ascendancy: ascendancyId,
            nodes: allocatedNodeIds,
            masterySelections: Object.fromEntries(this.masterySelections)
        };

        // Convert to JSON and encode
        const jsonString = JSON.stringify(buildData);
        const base64 = btoa(encodeURIComponent(jsonString));

        // Generate URL
        const baseUrl = window.location.origin + window.location.pathname;
        const buildUrl = `${baseUrl}#build=${base64}`;

        return buildUrl;
    }

    /**
     * Import build from URL
     * Parses URL hash or full URL with build data
     */
    importFromPoeUrl(url) {
        try {
            // Extract build data from URL
            let buildData;

            if (url.includes('#build=')) {
                // Our format: #build=base64data
                const hash = url.split('#build=')[1];
                const decoded = decodeURIComponent(atob(hash));
                buildData = JSON.parse(decoded);
            } else if (url.includes('pathofexile.com')) {
                // POE official URL - not yet implemented
                showToast('POE official URLs not yet supported. Use export to generate compatible URLs.', 'warning');
                return false;
            } else {
                throw new Error('Invalid URL format');
            }

            // Validate build data
            if (!buildData.version || !buildData.nodes) {
                throw new Error('Invalid build data structure');
            }

            // Reset current tree
            this.allocatedNodes.clear();
            this.masterySelections.clear();

            // Load class if specified
            if (buildData.class) {
                this.selectClass(buildData.class);
            }

            // Load ascendancy if specified
            if (buildData.ascendancy) {
                this.selectedAscendancy = buildData.ascendancy;
            }

            // Load allocated nodes
            buildData.nodes.forEach(nodeId => {
                this.allocatedNodes.add(nodeId);
            });

            // Load mastery selections
            if (buildData.masterySelections) {
                Object.entries(buildData.masterySelections).forEach(([nodeId, effectId]) => {
                    this.masterySelections.set(nodeId, effectId);
                });
            }

            this.updatePointsDisplay();
            this.centerView();
            this.render();

            showToast(`Build imported! ${buildData.nodes.length} nodes allocated`, 'success');
            return true;

        } catch (error) {
            console.error('Import error:', error);
            showToast('Failed to import build: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Copy build URL to clipboard
     */
    async copyBuildUrl() {
        try {
            const url = this.exportToPoeUrl();

            // Try modern clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                showToast('Build URL copied to clipboard!', 'success');
                return true;
            }

            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();

            const success = document.execCommand('copy');
            document.body.removeChild(textarea);

            if (success) {
                showToast('Build URL copied to clipboard!', 'success');
                return true;
            } else {
                throw new Error('Copy command failed');
            }

        } catch (error) {
            console.error('Copy error:', error);

            // Show URL in prompt as last resort
            const url = this.exportToPoeUrl();
            prompt('Copy this URL:', url);
            return false;
        }
    }

    /**
     * Import build from URL in browser location hash
     * Call this on page load to auto-import shared builds
     */
    importFromLocationHash() {
        const hash = window.location.hash;

        if (hash && hash.includes('#build=')) {
            const url = window.location.href;
            return this.importFromPoeUrl(url);
        }

        return false;
    }

    /**
     * Zoom in (next zoom level)
     */
    zoomIn() {
        if (this.currentZoomIndex < this.zoomLevels.length - 1) {
            this.currentZoomIndex++;
            this.viewport.scale = this.zoomLevels[this.currentZoomIndex];
            this.markAllTilesDirty();
            this.render();
        }
    }

    /**
     * Zoom out (previous zoom level)
     */
    zoomOut() {
        if (this.currentZoomIndex > 0) {
            this.currentZoomIndex--;
            this.viewport.scale = this.zoomLevels[this.currentZoomIndex];
            this.markAllTilesDirty();
            this.render();
        }
    }

    /**
     * Center view
     */
    centerView() {
        this.viewport.x = this.options.width / 2;
        this.viewport.y = this.options.height / 2;
        this.viewport.scale = 0.1246; // POE official starting zoom
        this.currentZoomIndex = 0;
        this.markAllTilesDirty();
        this.render();
    }

    /**
     * Reset tree (POE official behavior)
     * Clears allocations and class selection, hides ascendancy nodes
     */
    resetTree() {
        this.allocatedNodes.clear();
        this.selectedClass = null;
        this.selectedAscendancy = null;
        document.getElementById('class-select').value = '';
        this.updatePointsDisplay();
        this.centerView(); // Reset view position too
        showToast('Tree reset - Class and ascendancy cleared', 'success');
    }

    /**
     * Mark all tiles as dirty (need redraw)
     */
    markAllTilesDirty() {
        this.dirtyTiles.clear();
        // For now, we just re-render everything
        // In production, you'd calculate which tiles are visible and mark only those
    }

    /**
     * Emit custom event
     */
    emit(event, data) {
        const customEvent = new CustomEvent(`tree:${event}`, {
            detail: data
        });
        this.container.dispatchEvent(customEvent);
    }

    /**
     * Get allocated nodes
     */
    getAllocatedNodes() {
        return Array.from(this.allocatedNodes);
    }

    /**
     * Save current build to localStorage
     */
    saveBuild(buildName) {
        if (!buildName || !buildName.trim()) {
            buildName = prompt('Enter build name:');
            if (!buildName) return;
        }

        const build = {
            name: buildName,
            class: this.selectedClass?.id || null,
            allocatedNodes: Array.from(this.allocatedNodes),
            masterySelections: Object.fromEntries(this.masterySelections),
            timestamp: Date.now(),
            version: '1.0'
        };

        // Get existing builds
        const builds = this.getSavedBuilds();

        // Add or update build
        builds[buildName] = build;

        // Save to localStorage
        localStorage.setItem('poe_passive_builds', JSON.stringify(builds));

        this.currentBuildName = buildName;
        showToast(`Build "${buildName}" saved!`, 'success');

        return build;
    }

    /**
     * Load build from localStorage
     */
    loadBuild(buildName) {
        const builds = this.getSavedBuilds();
        const build = builds[buildName];

        if (!build) {
            showToast(`Build "${buildName}" not found`, 'error');
            return false;
        }

        // Reset current tree
        this.allocatedNodes.clear();
        this.masterySelections.clear();

        // Load class
        if (build.class) {
            this.selectClass(build.class);
        }

        // Load allocated nodes
        build.allocatedNodes.forEach(nodeId => {
            this.allocatedNodes.add(nodeId);
        });

        // Load mastery selections
        if (build.masterySelections) {
            Object.entries(build.masterySelections).forEach(([nodeId, effectId]) => {
                this.masterySelections.set(nodeId, effectId);
            });
        }

        this.currentBuildName = buildName;
        this.updatePointsDisplay();
        this.render();

        showToast(`Build "${buildName}" loaded!`, 'success');
        return true;
    }

    /**
     * Get all saved builds
     */
    getSavedBuilds() {
        const data = localStorage.getItem('poe_passive_builds');
        return data ? JSON.parse(data) : {};
    }

    /**
     * Delete saved build
     */
    deleteBuild(buildName) {
        const builds = this.getSavedBuilds();

        if (!builds[buildName]) {
            showToast(`Build "${buildName}" not found`, 'error');
            return false;
        }

        delete builds[buildName];
        localStorage.setItem('poe_passive_builds', JSON.stringify(builds));

        if (this.currentBuildName === buildName) {
            this.currentBuildName = null;
        }

        showToast(`Build "${buildName}" deleted!`, 'success');
        return true;
    }

    /**
     * Export build as JSON
     */
    exportBuild() {
        const build = {
            name: this.currentBuildName || 'Unnamed Build',
            class: this.selectedClass?.id || null,
            allocatedNodes: Array.from(this.allocatedNodes),
            masterySelections: Object.fromEntries(this.masterySelections),
            timestamp: Date.now(),
            version: '1.0'
        };

        const json = JSON.stringify(build, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${build.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();

        URL.revokeObjectURL(url);
        showToast('Build exported!', 'success');
    }

    /**
     * Import build from JSON
     */
    importBuild(jsonString) {
        try {
            const build = JSON.parse(jsonString);

            // Validate build structure
            if (!build.allocatedNodes || !Array.isArray(build.allocatedNodes)) {
                throw new Error('Invalid build format');
            }

            // Reset tree
            this.allocatedNodes.clear();
            this.masterySelections.clear();

            // Load class
            if (build.class) {
                this.selectClass(build.class);
            }

            // Load nodes
            build.allocatedNodes.forEach(nodeId => {
                this.allocatedNodes.add(nodeId);
            });

            // Load mastery selections
            if (build.masterySelections) {
                Object.entries(build.masterySelections).forEach(([nodeId, effectId]) => {
                    this.masterySelections.set(nodeId, effectId);
                });
            }

            this.currentBuildName = build.name || 'Imported Build';
            this.updatePointsDisplay();
            this.render();

            showToast('Build imported successfully!', 'success');
            return true;

        } catch (error) {
            showToast('Failed to import build: ' + error.message, 'error');
            return false;
        }
    }

    /**
     * Destroy viewer
     */
    destroy() {
        this.stopAnimation();
        this.container.innerHTML = '';
    }
}

export default PassiveTreeViewer;
