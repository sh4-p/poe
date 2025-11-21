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
                this.resetTree();
                e.preventDefault();
                break;
        }
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

            console.log(`✅ Transformed ${nodeCount} nodes and ${linkCount} connections`);
            showToast(`Passive tree loaded (${nodeCount} nodes)`, 'success');

            // Initial render
            this.centerView();
            this.render();

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
                    flavourText: nodeData.flavourText
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
     * Render mid canvas (highlights and animations)
     */
    renderMidLayer() {
        // Clear
        this.midCtx.clearRect(0, 0, this.options.width, this.options.height);

        if (!this.hoveredNode) return;

        // Save context
        this.midCtx.save();
        this.midCtx.translate(this.viewport.x, this.viewport.y);
        this.midCtx.scale(this.viewport.scale, this.viewport.scale);

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

        tooltip.innerHTML = `
            <div style="font-weight: bold; color: white; margin-bottom: 8px;">
                ${node.name}
            </div>
            ${node.stats && node.stats.length > 0 ? `
                <div style="color: #aaa; font-size: 12px;">
                    ${node.stats.map(s => `• ${s}`).join('<br>')}
                </div>
            ` : ''}
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
            this.allocatedNodes.delete(node.id);
            showToast(`Deallocated: ${node.name}`, 'info');
        } else {
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

        // Load class
        if (build.class) {
            this.selectClass(build.class);
        }

        // Load allocated nodes
        build.allocatedNodes.forEach(nodeId => {
            this.allocatedNodes.add(nodeId);
        });

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

            // Load class
            if (build.class) {
                this.selectClass(build.class);
            }

            // Load nodes
            build.allocatedNodes.forEach(nodeId => {
                this.allocatedNodes.add(nodeId);
            });

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
