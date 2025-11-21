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
            assetBaseUrl: 'https://raw.githubusercontent.com/grindinggear/skilltree-export/3.27.0/assets/',
            spriteZoomLevel: 2, // 0=low, 1=med, 2=high, 3=max
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
     * Load tree data
     */
    async loadTree() {
        try {
            showToast('Loading passive tree...', 'info', 1000);

            const response = await fetch('/api/passive-tree?version=latest');

            if (response.ok) {
                const apiData = await response.json();

                if (apiData.success && apiData.tree) {
                    this.rawTreeData = apiData.tree;

                    // Extract sprites
                    if (this.rawTreeData.sprites) {
                        this.sprites = this.rawTreeData.sprites;
                        console.log(`Loaded ${Object.keys(this.sprites).length} sprite sheets`);
                    }

                    // Transform data
                    this.treeData = this.transformOfficialTreeData(this.rawTreeData);
                    console.log(`Loaded ${apiData.nodeCount} nodes from official POE data`);

                    showToast(`Passive tree loaded (${apiData.nodeCount} nodes)`, 'success');

                    // Initial render
                    this.centerView();
                    this.render();
                }
            } else {
                throw new Error('API failed');
            }

        } catch (error) {
            console.error('Failed to load tree:', error);
            showToast('Failed to load tree data', 'error');
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
     * Render main canvas (background + nodes + connections)
     */
    renderMainLayer() {
        // Clear
        this.mainCtx.fillStyle = '#000000';
        this.mainCtx.fillRect(0, 0, this.options.width, this.options.height);

        if (!this.treeData) return;

        // Save context
        this.mainCtx.save();

        // Apply viewport transform
        this.mainCtx.translate(this.viewport.x, this.viewport.y);
        this.mainCtx.scale(this.viewport.scale, this.viewport.scale);

        // Render connections first
        this.renderConnections(this.mainCtx);

        // Render nodes
        this.renderNodes(this.mainCtx);

        // Restore context
        this.mainCtx.restore();
    }

    /**
     * Render connections (arc for same orbit, straight for different)
     * Filters out connections to hidden ascendancy/bloodline nodes
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
            ctx.strokeStyle = '#b89968';
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.9;
        } else if (isPartial) {
            ctx.strokeStyle = '#7a6f5c';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6;
        } else {
            ctx.strokeStyle = '#4a4a4a';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3;
        }

        ctx.lineCap = 'round';
        ctx.stroke();
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
                .forEach(node => this.renderNode(ctx, node));
        });
    }

    /**
     * Render individual node
     */
    renderNode(ctx, node) {
        const isAllocated = this.allocatedNodes.has(node.id);
        const isHovered = this.hoveredNode?.id === node.id;
        const radius = (this.nodeSizes[node.type] || this.nodeSizes.normal) / 2;

        // Draw node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        if (isAllocated) {
            ctx.fillStyle = this.getNodeColor(node);
            ctx.fill();

            // Glow effect
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

        // Draw hover highlight
        const radius = (this.nodeSizes[this.hoveredNode.type] || this.nodeSizes.normal) / 2;

        this.midCtx.beginPath();
        this.midCtx.arc(this.hoveredNode.x, this.hoveredNode.y, radius + 5, 0, Math.PI * 2);
        this.midCtx.strokeStyle = '#f59e0b';
        this.midCtx.lineWidth = 3;
        this.midCtx.globalAlpha = 0.8;
        this.midCtx.stroke();

        this.midCtx.restore();
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
     * Update points display
     */
    updatePointsDisplay() {
        const pointsEl = document.getElementById('points-used');
        if (pointsEl) {
            pointsEl.textContent = this.allocatedNodes.size;
        }
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
     * Destroy viewer
     */
    destroy() {
        this.container.innerHTML = '';
    }
}

export default PassiveTreeViewer;
