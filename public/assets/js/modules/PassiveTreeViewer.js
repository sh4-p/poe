/**
 * Passive Tree Viewer Module
 * POE/PoB style visualization with official GGG assets
 */

import { showToast } from './utils.js';

export class PassiveTreeViewer {
    constructor(containerEl, options = {}) {
        this.container = containerEl;
        this.options = {
            width: 1200,
            height: 800,
            enableZoom: true,
            enablePan: true,
            minZoom: 0.1,
            maxZoom: 5, // Increased max zoom for detail
            nodeRadius: 8,
            startingNodeRadius: 12,
            notableRadius: 10,
            keystoneRadius: 14,
            useSprites: true, // Enable GGG official sprites
            spriteZoomLevel: 2, // Higher quality (0=low, 1=med, 2=high, 3=max)
            assetBaseUrl: 'https://raw.githubusercontent.com/grindinggear/skilltree-export/3.27.0/assets/',
            enableLOD: true, // Level of detail based on zoom
            ...options
        };

        // Current zoom state for LOD
        this.currentZoomScale = 1;

        this.treeData = null;
        this.rawTreeData = null; // Store raw tree data for groups, etc.
        this.allocatedNodes = new Set();
        this.selectedNode = null;
        this.hoveredNode = null;
        this.pathToNode = new Map();
        this.pointsUsed = 0;

        // D3 objects
        this.svg = null;
        this.g = null;
        this.zoom = null;
        this.simulation = null;

        // Asset layers
        this.backgroundLayer = null;
        this.groupBackgroundLayer = null;
        this.connectionLayer = null;
        this.nodeLayer = null;

        // Sprite data from GGG
        this.sprites = null;
        this.spriteSheets = new Map(); // Cache for loaded sprite sheets
        this.spriteImages = new Map(); // Cache for loaded images

        // Starting class position
        this.startingClass = null;

        this.initialize();
    }

    /**
     * Initialize tree viewer
     */
    async initialize() {
        // Check if D3 is available
        if (typeof d3 === 'undefined') {
            this.renderLoadingD3();
            await this.loadD3();
        }

        this.setupSVG();
        this.setupControls();

        // Load default tree data
        await this.loadTree();
    }

    /**
     * Load D3.js library
     */
    async loadD3() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://d3js.org/d3.v7.min.js';
            script.onload = () => {
                console.log('D3.js loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load D3.js');
                reject(new Error('Failed to load D3.js'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Render loading message while D3 loads
     */
    renderLoadingD3() {
        this.container.innerHTML = `
            <div class="flex items-center justify-center h-full">
                <div class="text-center">
                    <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                    <p class="text-gray-400">Loading Passive Tree Viewer...</p>
                </div>
            </div>
        `;
    }

    /**
     * Setup SVG canvas with POE-style layers
     */
    setupSVG() {
        // Clear container
        this.container.innerHTML = '';

        // Create SVG with dark background
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)
            .style('background', '#000000')
            .style('border-radius', '8px');

        // Add definitions for filters
        const defs = this.svg.append('defs');

        // Node glow effect
        const glow = defs.append('filter')
            .attr('id', 'node-glow');
        glow.append('feGaussianBlur')
            .attr('stdDeviation', '3')
            .attr('result', 'coloredBlur');
        const feMerge = glow.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Create main group for zoom/pan
        this.g = this.svg.append('g')
            .attr('class', 'tree-group');

        // Create layers in correct order (back to front)
        this.backgroundLayer = this.g.append('g')
            .attr('class', 'background-layer');

        this.groupBackgroundLayer = this.g.append('g')
            .attr('class', 'group-background-layer');

        this.connectionLayer = this.g.append('g')
            .attr('class', 'connection-layer');

        this.nodeLayer = this.g.append('g')
            .attr('class', 'node-layer');

        // Add zoom behavior with LOD support
        if (this.options.enableZoom) {
            this.zoom = d3.zoom()
                .scaleExtent([this.options.minZoom, this.options.maxZoom])
                .on('zoom', (event) => {
                    this.g.attr('transform', event.transform);

                    // Track zoom for LOD
                    if (this.options.enableLOD) {
                        const newScale = event.transform.k;
                        if (Math.abs(newScale - this.currentZoomScale) > 0.5) {
                            this.currentZoomScale = newScale;
                            this.updateLOD(newScale);
                        }
                    }
                });

            this.svg.call(this.zoom);
        }

        // Center the view and zoom out to see the whole tree
        const initialTransform = d3.zoomIdentity
            .translate(this.options.width / 2, this.options.height / 2)
            .scale(0.15); // Start zoomed out like POE

        if (this.zoom) {
            this.svg.call(this.zoom.transform, initialTransform);
        }
    }

    /**
     * Setup UI controls
     */
    setupControls() {
        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'passive-tree-controls absolute top-4 right-4 bg-gray-800 rounded-lg p-4 shadow-lg border border-gray-700';
        controlsDiv.innerHTML = `
            <div class="space-y-3">
                <div class="text-sm">
                    <div class="font-bold text-yellow-500 mb-2">Passive Points</div>
                    <div class="text-2xl font-bold text-white" id="points-used">0</div>
                    <div class="text-xs text-gray-400">points allocated</div>
                </div>
                <div class="border-t border-gray-700 pt-3">
                    <button id="tree-reset" class="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm">
                        Reset Tree
                    </button>
                </div>
                <div class="border-t border-gray-700 pt-3">
                    <button id="tree-zoom-in" class="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm mb-1">
                        Zoom In
                    </button>
                    <button id="tree-zoom-out" class="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm mb-1">
                        Zoom Out
                    </button>
                    <button id="tree-center" class="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm">
                        Center
                    </button>
                </div>
                <div class="border-t border-gray-700 pt-3">
                    <input type="text" id="node-search" placeholder="Search nodes..."
                        class="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white">
                </div>
            </div>
        `;

        this.container.style.position = 'relative';
        this.container.appendChild(controlsDiv);

        // Bind events
        document.getElementById('tree-reset')?.addEventListener('click', () => this.resetTree());
        document.getElementById('tree-zoom-in')?.addEventListener('click', () => this.zoomIn());
        document.getElementById('tree-zoom-out')?.addEventListener('click', () => this.zoomOut());
        document.getElementById('tree-center')?.addEventListener('click', () => this.centerView());
        document.getElementById('node-search')?.addEventListener('input', (e) => this.handleSearch(e.target.value));
    }

    /**
     * Load tree data from POE official sources
     */
    async loadTree(version = 'latest') {
        try {
            showToast('Loading passive tree...', 'info', 1000);

            // Try to load from API first (will fetch from official POE sources)
            const response = await fetch('/api/passive-tree?version=' + version);

            if (response.ok) {
                const apiData = await response.json();

                if (apiData.success && apiData.tree) {
                    // Store raw tree data for groups, sprites, constants
                    this.rawTreeData = apiData.tree;

                    // Extract sprite data from official tree
                    if (this.rawTreeData.sprites && this.options.useSprites) {
                        this.sprites = this.rawTreeData.sprites;
                        console.log(`Loaded ${Object.keys(this.sprites).length} sprite sheets from GGG`);
                    }

                    // Transform official POE data format to our format
                    this.treeData = this.transformOfficialTreeData(this.rawTreeData);
                    console.log(`Loaded ${apiData.nodeCount} nodes from official POE data (v3.27.0)`);
                    showToast(`Passive tree loaded (${apiData.nodeCount} nodes)`, 'success');
                } else {
                    throw new Error('Invalid API response');
                }
            } else {
                throw new Error('API request failed');
            }

            this.renderTree();

        } catch (error) {
            console.error('Failed to load tree data from API:', error);

            // Fallback to sample data for development
            console.warn('Using sample passive tree data');
            this.treeData = this.getSampleTreeData();
            this.renderTree();
            showToast('Using sample tree (API unavailable)', 'info');
        }
    }

    /**
     * Transform official POE tree data to our viewer format
     */
    transformOfficialTreeData(officialData) {
        // Official GGG skilltree-export format uses groups + orbits for positioning
        // Nodes reference their group and orbit position

        const nodes = [];
        const links = [];

        // Extract constants for calculations
        const constants = officialData.constants || {
            orbitRadii: [0, 82, 162, 335, 493, 662, 846],
            skillsPerOrbit: [1, 6, 16, 16, 40, 72, 72]
        };

        // Process nodes from official data
        if (officialData.nodes && officialData.groups) {
            for (const [nodeId, nodeData] of Object.entries(officialData.nodes)) {
                // Calculate actual position from group + orbit system
                const group = officialData.groups[nodeData.group];
                let x = 0, y = 0;

                if (group) {
                    // Start with group position
                    x = group.x || 0;
                    y = group.y || 0;

                    // Add orbit offset if not center node
                    if (nodeData.orbit > 0 && nodeData.orbit < constants.orbitRadii.length) {
                        const orbitRadius = constants.orbitRadii[nodeData.orbit];
                        const skillsInOrbit = constants.skillsPerOrbit[nodeData.orbit];
                        const angle = (2 * Math.PI * nodeData.orbitIndex) / skillsInOrbit;

                        x += orbitRadius * Math.sin(angle);
                        y += -orbitRadius * Math.cos(angle); // Negative because Y grows downward
                    }
                }

                // Transform node data
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
                    // Additional properties for special node types
                    ascendancyName: nodeData.ascendancyName,
                    reminderText: nodeData.reminderText,
                    flavourText: nodeData.flavourText
                };

                // Add mastery-specific data
                if (nodeData.isMastery) {
                    node.masteryEffects = nodeData.masteryEffects;
                    node.inactiveIcon = nodeData.inactiveIcon;
                    node.activeIcon = nodeData.activeIcon;
                }

                // Add jewel socket-specific data
                if (nodeData.isJewelSocket) {
                    node.expansionJewel = nodeData.expansionJewel;
                }

                nodes.push(node);
            }
        }

        // Process connections/links from 'out' property
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

        console.log(`Transformed ${nodes.length} nodes and ${links.length} connections from official POE data`);
        return { nodes, links };
    }

    /**
     * Detect node type from official data
     */
    detectNodeType(nodeData) {
        // Determine node type based on official GGG data flags
        // Check in order of specificity
        if (nodeData.isKeystone) return 'keystone';
        if (nodeData.isMastery) return 'mastery';
        if (nodeData.isJewelSocket) return 'jewel';
        if (nodeData.isNotable) return 'notable';
        if (nodeData.isBloodline) return 'bloodline';
        if (nodeData.ascendancyName) return 'ascendancy';
        if (nodeData.classStartIndex !== undefined) return 'classStart';

        // Check for root node (center of tree)
        if (nodeData.orbit === 0 && nodeData.group === 0) return 'root';

        return 'normal';
    }

    /**
     * Get sample tree data for development
     */
    getSampleTreeData() {
        // Create a sample tree structure
        const nodes = [];
        const links = [];

        // Create starting node (Scion)
        const startNode = {
            id: 'start',
            name: 'Scion Start',
            type: 'start',
            stats: [],
            x: 0,
            y: 0
        };
        nodes.push(startNode);

        // Create sample nodes in a circular pattern
        const rings = 5;
        const nodesPerRing = 12;
        let nodeId = 1;

        for (let ring = 1; ring <= rings; ring++) {
            const radius = ring * 100;
            const angleStep = (2 * Math.PI) / nodesPerRing;

            for (let i = 0; i < nodesPerRing; i++) {
                const angle = i * angleStep;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                const nodeType = ring === rings ? 'keystone' :
                               ring % 2 === 0 ? 'notable' : 'normal';

                const node = {
                    id: `node_${nodeId}`,
                    name: this.generateNodeName(nodeType, nodeId),
                    type: nodeType,
                    stats: this.generateNodeStats(nodeType),
                    x: x,
                    y: y,
                    ring: ring,
                    angle: i
                };

                nodes.push(node);

                // Create links to previous ring
                if (ring === 1) {
                    links.push({
                        source: 'start',
                        target: node.id
                    });
                } else {
                    // Connect to nearest nodes in previous ring
                    const prevRing = nodes.filter(n => n.ring === ring - 1);
                    const nearestInPrevRing = this.findNearestNode(node, prevRing);

                    if (nearestInPrevRing) {
                        links.push({
                            source: nearestInPrevRing.id,
                            target: node.id
                        });
                    }
                }

                // Connect within ring
                if (i > 0) {
                    const prevInRing = nodes.find(n =>
                        n.ring === ring && n.angle === i - 1
                    );
                    if (prevInRing) {
                        links.push({
                            source: prevInRing.id,
                            target: node.id
                        });
                    }
                }

                nodeId++;
            }

            // Close the ring
            const firstInRing = nodes.find(n => n.ring === ring && n.angle === 0);
            const lastInRing = nodes.find(n => n.ring === ring && n.angle === nodesPerRing - 1);
            if (firstInRing && lastInRing) {
                links.push({
                    source: lastInRing.id,
                    target: firstInRing.id
                });
            }
        }

        return { nodes, links };
    }

    /**
     * Generate sample node name
     */
    generateNodeName(type, id) {
        const names = {
            start: ['Scion Start'],
            keystone: ['Iron Reflexes', 'Resolute Technique', 'Acrobatics', 'Eldritch Battery'],
            notable: ['Life and Mana', 'Attack Speed', 'Spell Damage', 'Resistance'],
            normal: ['Strength', 'Dexterity', 'Intelligence', 'Life']
        };

        const typeNames = names[type] || names.normal;
        return typeNames[id % typeNames.length] + (type === 'normal' ? ` ${id}` : '');
    }

    /**
     * Generate sample node stats
     */
    generateNodeStats(type) {
        const stats = {
            start: [],
            keystone: ['Converts all Evasion to Armour', 'Iron Reflexes'],
            notable: ['+20 to Strength', '+10% to Fire Resistance', '+8% increased maximum Life'],
            normal: ['+10 to Strength']
        };

        return stats[type] || stats.normal;
    }

    /**
     * Find nearest node
     */
    findNearestNode(node, candidates) {
        let nearest = null;
        let minDist = Infinity;

        for (const candidate of candidates) {
            const dist = Math.sqrt(
                Math.pow(node.x - candidate.x, 2) +
                Math.pow(node.y - candidate.y, 2)
            );

            if (dist < minDist) {
                minDist = dist;
                nearest = candidate;
            }
        }

        return nearest;
    }

    /**
     * Render the tree with official GGG assets (Full POE style)
     */
    async renderTree() {
        if (!this.treeData || !this.rawTreeData) return;

        console.log('🎨 Rendering passive tree with GGG official assets...');

        // Clear all layers
        this.backgroundLayer.selectAll('*').remove();
        this.groupBackgroundLayer.selectAll('*').remove();
        this.connectionLayer.selectAll('*').remove();
        this.nodeLayer.selectAll('*').remove();

        // 1. Render tree background
        await this.renderBackground();

        // 2. Render group backgrounds
        await this.renderGroupBackgrounds();

        // 3. Render connections between nodes
        this.renderConnections();

        // 4. Render nodes with GGG sprites
        await this.renderNodes();

        console.log('✅ Tree rendering complete');
    }

    /**
     * Render tree background image
     */
    async renderBackground() {
        const zoomLevel = this.options.spriteZoomLevel;
        const backgroundUrl = `${this.options.assetBaseUrl}background-${zoomLevel}.png`;

        try {
            // Load background image
            const img = await this.loadSpriteImage(backgroundUrl);

            // Calculate bounds from tree data
            const minX = this.rawTreeData.min_x || -15000;
            const minY = this.rawTreeData.min_y || -15000;
            const maxX = this.rawTreeData.max_x || 15000;
            const maxY = this.rawTreeData.max_y || 15000;

            // Add background image centered
            this.backgroundLayer.append('image')
                .attr('xlink:href', backgroundUrl)
                .attr('x', minX)
                .attr('y', minY)
                .attr('width', maxX - minX)
                .attr('height', maxY - minY)
                .style('opacity', 0.15) // Subtle background
                .style('pointer-events', 'none');

            console.log('✓ Background rendered');
        } catch (error) {
            console.warn('Background image failed to load, using fallback:', error.message);
            // Fallback: dark radial gradient
            this.svg.style('background', 'radial-gradient(circle, #0a0a0a 0%, #000000 100%)');
        }
    }

    /**
     * Render group backgrounds (PSGroupBackground1-3)
     */
    async renderGroupBackgrounds() {
        if (!this.rawTreeData.groups) return;

        const zoomLevel = this.options.spriteZoomLevel;
        const groupBgUrl = `${this.options.assetBaseUrl}group-background-${zoomLevel}.png`;

        try {
            // Preload group background sprite
            await this.loadSpriteImage(groupBgUrl);

            // Render backgrounds for groups that have them
            for (const [groupId, groupData] of Object.entries(this.rawTreeData.groups)) {
                if (groupData.background) {
                    const bg = groupData.background;

                    // Calculate size based on orbits
                    const orbits = groupData.orbits || [0];
                    const maxOrbit = Math.max(...orbits);
                    const size = maxOrbit > 0 ? 150 : 100;

                    // Add group background
                    this.groupBackgroundLayer.append('image')
                        .attr('xlink:href', groupBgUrl)
                        .attr('x', groupData.x - size / 2)
                        .attr('y', groupData.y - size / 2)
                        .attr('width', size)
                        .attr('height', size)
                        .style('opacity', 0.3)
                        .style('pointer-events', 'none');
                }
            }

            console.log('✓ Group backgrounds rendered');
        } catch (error) {
            console.warn('Group backgrounds failed to load:', error.message);
        }
    }

    /**
     * Render connections between nodes with POE-style lines
     */
    async renderConnections() {
        if (!this.treeData.links) return;

        const nodeMap = new Map(this.treeData.nodes.map(n => [n.id, n]));
        const lineUrl = `${this.options.assetBaseUrl}line-${this.options.spriteZoomLevel}.png`;

        // Try to preload line sprite
        let useLineSprite = false;
        try {
            await this.loadSpriteImage(lineUrl);
            useLineSprite = true;
        } catch (e) {
            console.warn('Line sprite not available, using SVG lines');
        }

        this.treeData.links.forEach(link => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);

            if (!source || !target) return;

            const isAllocated = this.allocatedNodes.has(source.id) && this.allocatedNodes.has(target.id);
            const isPartialPath = this.allocatedNodes.has(source.id) || this.allocatedNodes.has(target.id);

            // Calculate line properties
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            if (useLineSprite && isAllocated) {
                // Use GGG line sprite for allocated paths
                this.connectionLayer.append('image')
                    .attr('xlink:href', lineUrl)
                    .attr('x', source.x)
                    .attr('y', source.y - 2)
                    .attr('width', length)
                    .attr('height', 4)
                    .attr('preserveAspectRatio', 'none')
                    .style('transform', `rotate(${angle}deg)`)
                    .style('transform-origin', '0 2px')
                    .style('opacity', 0.9);
            } else {
                // Fallback to SVG line
                let strokeColor, strokeWidth, opacity;

                if (isAllocated) {
                    strokeColor = '#b89968'; // Gold
                    strokeWidth = 4;
                    opacity = 0.9;
                } else if (isPartialPath) {
                    strokeColor = '#7a6f5c'; // Dim gold
                    strokeWidth = 3;
                    opacity = 0.6;
                } else {
                    strokeColor = '#4a4a4a'; // Dark gray
                    strokeWidth = 2;
                    opacity = 0.3;
                }

                this.connectionLayer.append('line')
                    .attr('x1', source.x)
                    .attr('y1', source.y)
                    .attr('x2', target.x)
                    .attr('y2', target.y)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth)
                    .attr('stroke-linecap', 'round')
                    .style('opacity', opacity);
            }
        });

        console.log(`✓ Rendered ${this.treeData.links.length} connections`);
    }

    /**
     * Render nodes using GGG sprite sheets
     */
    async renderNodes() {
        if (!this.treeData.nodes) return;

        // Filter to important nodes only
        const visibleNodes = this.treeData.nodes.filter(n =>
            n.type === 'keystone' ||
            n.type === 'notable' ||
            n.type === 'mastery' ||
            n.type === 'jewel' ||
            n.type === 'classStart' ||
            n.type === 'root' ||
            this.allocatedNodes.has(n.id)
        );

        console.log(`Rendering ${visibleNodes.length} nodes (${this.treeData.nodes.length} total)`);

        for (const node of visibleNodes) {
            await this.renderNode(node);
        }

        // Render small dots for normal nodes (context)
        this.treeData.nodes
            .filter(n => n.type === 'normal' && !this.allocatedNodes.has(n.id))
            .forEach(node => {
                this.nodeLayer.append('circle')
                    .attr('cx', node.x)
                    .attr('cy', node.y)
                    .attr('r', 3)
                    .attr('fill', '#333')
                    .style('opacity', 0.3);
            });

        console.log('✓ All nodes rendered');
    }

    /**
     * Render individual node with sprite from GGG sprite sheet
     * Uses Canvas for accurate sprite extraction
     */
    async renderNode(node) {
        const isAllocated = this.allocatedNodes.has(node.id);
        const spriteData = this.getSpriteForNode(node);

        // Node group for hover/click
        const g = this.nodeLayer.append('g')
            .attr('class', 'tree-node')
            .attr('data-node-id', node.id)
            .style('cursor', 'pointer')
            .on('click', (event) => this.handleNodeClick(event, node))
            .on('mouseenter', (event) => this.handleNodeHover(event, node))
            .on('mouseleave', () => this.handleNodeLeave());

        if (spriteData && this.options.useSprites) {
            // Use GGG sprite with Canvas extraction
            try {
                const spriteImage = await this.loadSpriteImage(spriteData.url);
                const croppedDataUrl = await this.cropSpriteFromSheet(
                    spriteImage,
                    spriteData.coords
                );

                if (croppedDataUrl) {
                    const scale = this.getSpriteScale(node);
                    const w = spriteData.coords.w * scale;
                    const h = spriteData.coords.h * scale;

                    // Add cropped sprite
                    g.append('image')
                        .attr('xlink:href', croppedDataUrl)
                        .attr('x', node.x - w / 2)
                        .attr('y', node.y - h / 2)
                        .attr('width', w)
                        .attr('height', h)
                        .style('opacity', isAllocated ? 1 : 0.7);

                    // Add frame overlay if available
                    const frameUrl = `${this.options.assetBaseUrl}frame-${this.options.spriteZoomLevel}.png`;
                    try {
                        await this.loadSpriteImage(frameUrl);
                        const frameScale = scale * 1.1; // Frame slightly larger
                        const frameSize = Math.max(w, h) * 1.2;

                        g.append('image')
                            .attr('xlink:href', frameUrl)
                            .attr('x', node.x - frameSize / 2)
                            .attr('y', node.y - frameSize / 2)
                            .attr('width', frameSize)
                            .attr('height', frameSize)
                            .style('opacity', isAllocated ? 0.8 : 0.5)
                            .style('pointer-events', 'none');
                    } catch (e) {
                        // Frame optional
                    }
                } else {
                    throw new Error('Failed to crop sprite');
                }

            } catch (error) {
                console.warn(`Sprite rendering failed for ${node.id}:`, error.message);
                // Fallback to colored circle
                this.renderNodeFallback(g, node, isAllocated);
            }
        } else {
            // Fallback to colored circle
            this.renderNodeFallback(g, node, isAllocated);
        }

        // Add glow for allocated nodes
        if (isAllocated) {
            g.style('filter', 'url(#node-glow)');
        }

        // Add label for keystones and allocated notables
        if (node.type === 'keystone' || (node.type === 'notable' && isAllocated)) {
            const radius = this.getNodeRadius(node);
            this.nodeLayer.append('text')
                .attr('x', node.x)
                .attr('y', node.y + radius + 20)
                .attr('text-anchor', 'middle')
                .attr('fill', isAllocated ? '#d4af37' : '#999')
                .attr('font-size', '12px')
                .attr('font-weight', isAllocated ? 'bold' : 'normal')
                .style('pointer-events', 'none')
                .style('text-shadow', '0 0 4px rgba(0,0,0,0.8)')
                .text(node.name || '');
        }
    }

    /**
     * Crop sprite from sprite sheet using Canvas
     * This ensures accurate extraction
     */
    async cropSpriteFromSheet(spriteImage, coords) {
        try {
            // Create off-screen canvas
            const canvas = document.createElement('canvas');
            canvas.width = coords.w;
            canvas.height = coords.h;
            const ctx = canvas.getContext('2d');

            // Draw cropped region
            ctx.drawImage(
                spriteImage,
                coords.x, coords.y, coords.w, coords.h,  // Source
                0, 0, coords.w, coords.h                   // Destination
            );

            // Convert to data URL
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Canvas crop failed:', error);
            return null;
        }
    }

    /**
     * Render node fallback (colored circle when sprite fails)
     */
    renderNodeFallback(g, node, isAllocated) {
        const radius = this.getNodeRadius(node);

        // Outer glow circle
        if (isAllocated) {
            g.append('circle')
                .attr('cx', node.x)
                .attr('cy', node.y)
                .attr('r', radius + 4)
                .attr('fill', 'none')
                .attr('stroke', '#f59e0b')
                .attr('stroke-width', 2)
                .style('opacity', 0.6);
        }

        // Main node circle
        g.append('circle')
            .attr('cx', node.x)
            .attr('cy', node.y)
            .attr('r', radius)
            .attr('fill', isAllocated ? this.getNodeColor(node) : '#2d3748')
            .attr('stroke', isAllocated ? '#f59e0b' : this.getNodeColor(node))
            .attr('stroke-width', isAllocated ? 2.5 : 2)
            .style('opacity', isAllocated ? 1 : 0.7);

        // Inner circle for special nodes
        if (node.type === 'keystone' || node.type === 'mastery') {
            g.append('circle')
                .attr('cx', node.x)
                .attr('cy', node.y)
                .attr('r', radius - 4)
                .attr('fill', 'none')
                .attr('stroke', isAllocated ? '#fff' : this.getNodeColor(node))
                .attr('stroke-width', 1.5)
                .style('opacity', isAllocated ? 0.8 : 0.5);
        }
    }

    /**
     * Get sprite scale based on node type (bigger for more detail)
     */
    getSpriteScale(node) {
        // Base scale multiplier for better visibility
        const baseMultiplier = 2.5;

        switch (node.type) {
            case 'root': return 3.5 * baseMultiplier;
            case 'classStart': return 3.0 * baseMultiplier;
            case 'keystone': return 2.8 * baseMultiplier;
            case 'notable': return 2.2 * baseMultiplier;
            case 'mastery': return 2.5 * baseMultiplier;
            case 'jewel': return 2.0 * baseMultiplier;
            default: return 1.5 * baseMultiplier;
        }
    }

    /**
     * Get node radius based on type
     */
    getNodeRadius(node) {
        switch (node.type) {
            case 'root': return 16;
            case 'classStart': return this.options.startingNodeRadius;
            case 'keystone': return this.options.keystoneRadius;
            case 'mastery': return 12;
            case 'jewel': return 12;
            case 'notable': return this.options.notableRadius;
            case 'ascendancy': return this.options.notableRadius;
            case 'bloodline': return this.options.notableRadius;
            default: return this.options.nodeRadius;
        }
    }

    /**
     * Get node color based on official POE colors
     */
    getNodeColor(node) {
        if (this.allocatedNodes.has(node.id)) {
            return '#f59e0b'; // Yellow/gold for allocated
        }

        switch (node.type) {
            case 'root': return '#ffffff'; // White for center
            case 'classStart': return '#3b82f6'; // Blue for class starts
            case 'keystone': return '#8b5cf6'; // Purple for keystones
            case 'mastery': return '#7c3aed'; // Deep purple for masteries
            case 'jewel': return '#14b8a6'; // Teal for jewel sockets
            case 'notable': return '#10b981'; // Green for notables
            case 'ascendancy': return '#ef4444'; // Red for ascendancy nodes
            case 'bloodline': return '#f97316'; // Orange for bloodline
            default: return '#6b7280'; // Gray for normal nodes
        }
    }

    /**
     * Get icon for node type (placeholder until we implement sprites)
     */
    getNodeIcon(type) {
        const icons = {
            'root': '◆',
            'classStart': '★',
            'keystone': '◈',
            'mastery': '✦',
            'jewel': '◎',
            'notable': '●',
            'ascendancy': '◆',
            'bloodline': '◇'
        };
        return icons[type] || '·';
    }

    /**
     * Get sprite data for a node icon from GGG sprite sheets
     * Returns sprite coordinates and URL
     */
    getSpriteForNode(node) {
        if (!this.sprites || !node.icon) {
            return null;
        }

        // Determine which sprite sheet based on node type and state
        let spriteSheetKey;
        const isAllocated = this.allocatedNodes.has(node.id);

        // Map node types to GGG sprite sheet keys
        if (node.type === 'keystone') {
            spriteSheetKey = isAllocated ? 'keystoneActive' : 'keystoneInactive';
        } else if (node.type === 'notable') {
            spriteSheetKey = isAllocated ? 'notableActive' : 'notableInactive';
        } else if (node.type === 'mastery') {
            // Mastery has multiple states
            if (isAllocated) {
                spriteSheetKey = 'masteryActiveSelected';
            } else {
                spriteSheetKey = 'masteryInactive';
            }
        } else if (node.type === 'jewel') {
            spriteSheetKey = 'jewel';
        } else if (node.type === 'classStart' || node.type === 'root') {
            spriteSheetKey = 'startNode';
        } else {
            // Normal nodes
            spriteSheetKey = isAllocated ? 'normalActive' : 'normalInactive';
        }

        const spriteSheet = this.sprites[spriteSheetKey];
        if (!spriteSheet) {
            console.warn(`Sprite sheet not found: ${spriteSheetKey}`);
            return null;
        }

        // GGG uses zoom levels as keys: 0.1246, 0.2109, 0.2972, 0.3835
        // We use index 0-3, convert to actual zoom level
        const zoomLevels = this.rawTreeData.imageZoomLevels || [0.1246, 0.2109, 0.2972, 0.3835];
        const zoomKey = zoomLevels[this.options.spriteZoomLevel];
        const zoomData = spriteSheet[zoomKey.toString()];

        if (!zoomData) {
            console.warn(`Zoom data not found for level: ${zoomKey}`);
            return null;
        }

        // Find coordinates for this node's icon path
        const coords = zoomData.coords && zoomData.coords[node.icon];
        if (!coords) {
            return null;
        }

        return {
            url: zoomData.filename,
            coords: coords,
            sheetWidth: zoomData.w,
            sheetHeight: zoomData.h
        };
    }

    /**
     * Load and cache sprite sheet image
     */
    async loadSpriteImage(url) {
        // Check cache first
        if (this.spriteImages.has(url)) {
            return this.spriteImages.get(url);
        }

        // Check if already loading
        if (this.spriteSheets.has(url)) {
            return this.spriteSheets.get(url);
        }

        // Create loading promise
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // Enable CORS
            img.onload = () => {
                this.spriteImages.set(url, img);
                this.spriteSheets.delete(url); // Remove from loading
                resolve(img);
            };
            img.onerror = () => {
                this.spriteSheets.delete(url); // Remove from loading
                reject(new Error(`Failed to load sprite: ${url}`));
            };
            img.src = url;
        });

        // Store promise while loading
        this.spriteSheets.set(url, promise);

        return promise;
    }

    /**
     * Update level of detail based on zoom
     */
    updateLOD(zoomScale) {
        // Adjust node visibility based on zoom
        if (zoomScale < 0.3) {
            // Very zoomed out - only show major nodes
            this.nodeLayer.selectAll('.tree-node').style('display', (d) => {
                const node = d.__data__ || d;
                return (node.type === 'keystone' || node.type === 'root') ? 'block' : 'none';
            });
        } else if (zoomScale < 0.6) {
            // Medium zoom - show keystones and notables
            this.nodeLayer.selectAll('.tree-node').style('display', (d) => {
                const node = d.__data__ || d;
                return (node.type === 'keystone' || node.type === 'notable' || node.type === 'root') ? 'block' : 'none';
            });
        } else {
            // Zoomed in - show all important nodes
            this.nodeLayer.selectAll('.tree-node').style('display', 'block');
        }

        console.log(`LOD updated for zoom: ${zoomScale.toFixed(2)}`);
    }

    /**
     * Handle node click
     */
    handleNodeClick(event, node) {
        event.stopPropagation();

        if (this.allocatedNodes.has(node.id)) {
            this.deallocateNode(node.id);
        } else {
            this.allocateNode(node.id);
        }

        this.updateNodeDisplay();
        this.updatePointsDisplay();
    }

    /**
     * Handle node hover
     */
    handleNodeHover(event, node) {
        this.hoveredNode = node;
        this.showNodeTooltip(event, node);
    }

    /**
     * Handle node leave
     */
    handleNodeLeave() {
        this.hoveredNode = null;
        this.hideNodeTooltip();
    }

    /**
     * Show node tooltip
     */
    showNodeTooltip(event, node) {
        // Remove existing tooltip
        d3.select('.tree-tooltip').remove();

        const tooltip = d3.select(this.container)
            .append('div')
            .attr('class', 'tree-tooltip absolute bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl z-50')
            .style('left', (event.pageX - this.container.offsetLeft + 10) + 'px')
            .style('top', (event.pageY - this.container.offsetTop + 10) + 'px');

        tooltip.append('div')
            .attr('class', 'font-bold text-white mb-1')
            .text(node.name);

        if (node.stats && node.stats.length > 0) {
            const statsList = tooltip.append('div')
                .attr('class', 'text-sm text-gray-300');

            node.stats.forEach(stat => {
                statsList.append('div').text('• ' + stat);
            });
        }

        tooltip.append('div')
            .attr('class', 'text-xs text-gray-500 mt-2')
            .text('Click to ' + (this.allocatedNodes.has(node.id) ? 'deallocate' : 'allocate'));
    }

    /**
     * Hide node tooltip
     */
    hideNodeTooltip() {
        d3.select('.tree-tooltip').remove();
    }

    /**
     * Update node display
     */
    updateNodeDisplay() {
        this.g.selectAll('circle')
            .attr('fill', d => this.getNodeColor(d))
            .attr('filter', d => this.allocatedNodes.has(d.id) ? 'url(#glow)' : null);
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
     * Allocate node
     */
    allocateNode(nodeId) {
        this.allocatedNodes.add(nodeId);
        this.emit('nodeAllocated', nodeId);
    }

    /**
     * Deallocate node
     */
    deallocateNode(nodeId) {
        this.allocatedNodes.delete(nodeId);
        this.emit('nodeDeallocated', nodeId);
    }

    /**
     * Get allocated nodes
     */
    getAllocatedNodes() {
        return Array.from(this.allocatedNodes);
    }

    /**
     * Reset tree
     */
    resetTree() {
        this.allocatedNodes.clear();
        this.updateNodeDisplay();
        this.updatePointsDisplay();
        showToast('Passive tree reset', 'success');
    }

    /**
     * Zoom in
     */
    zoomIn() {
        if (this.zoom) {
            this.svg.transition().duration(300)
                .call(this.zoom.scaleBy, 1.3);
        }
    }

    /**
     * Zoom out
     */
    zoomOut() {
        if (this.zoom) {
            this.svg.transition().duration(300)
                .call(this.zoom.scaleBy, 0.7);
        }
    }

    /**
     * Center view
     */
    centerView() {
        if (this.zoom) {
            const initialTransform = d3.zoomIdentity
                .translate(this.options.width / 2, this.options.height / 2)
                .scale(1);

            this.svg.transition().duration(500)
                .call(this.zoom.transform, initialTransform);
        }
    }

    /**
     * Handle search
     */
    handleSearch(query) {
        if (!query || !this.treeData) {
            this.updateNodeDisplay();
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matches = this.treeData.nodes.filter(node =>
            node.name.toLowerCase().includes(lowerQuery) ||
            node.stats.some(stat => stat.toLowerCase().includes(lowerQuery))
        );

        // Highlight matching nodes
        this.g.selectAll('circle')
            .attr('stroke', d => {
                return matches.find(m => m.id === d.id) ? '#f59e0b' : '#555';
            })
            .attr('stroke-width', d => {
                return matches.find(m => m.id === d.id) ? 4 : 2;
            });

        if (matches.length > 0) {
            showToast(`Found ${matches.length} matching node(s)`, 'info');
        }
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
     * Destroy tree viewer
     */
    destroy() {
        if (this.svg) {
            this.svg.remove();
        }
        this.container.innerHTML = '';
    }
}

export default PassiveTreeViewer;
