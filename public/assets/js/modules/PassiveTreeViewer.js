/**
 * Passive Tree Viewer Module
 * Interactive passive skill tree visualization with D3.js
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
            minZoom: 0.5,
            maxZoom: 3,
            nodeRadius: 8,
            startingNodeRadius: 12,
            notableRadius: 10,
            keystoneRadius: 14,
            useSprites: true, // Enable sprite rendering from GGG CDN
            spriteZoomLevel: 0.2109, // Default zoom level (index 1)
            ...options
        };

        this.treeData = null;
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
     * Setup SVG canvas
     */
    setupSVG() {
        // Clear container
        this.container.innerHTML = '';

        // Create SVG with PoB-style background
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)
            .style('background', 'radial-gradient(circle at center, #1a202c 0%, #0d1117 100%)')
            .style('border-radius', '8px');

        // Add definitions for gradients and patterns
        const defs = this.svg.append('defs');

        // Subtle grid pattern (PoB style)
        const pattern = defs.append('pattern')
            .attr('id', 'grid-pattern')
            .attr('width', 50)
            .attr('height', 50)
            .attr('patternUnits', 'userSpaceOnUse');

        pattern.append('rect')
            .attr('width', 50)
            .attr('height', 50)
            .attr('fill', 'none');

        pattern.append('path')
            .attr('d', 'M 50 0 L 0 0 0 50')
            .attr('fill', 'none')
            .attr('stroke', '#2d3748')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.15);

        // Node glow effect
        const glow = defs.append('filter')
            .attr('id', 'glow');
        glow.append('feGaussianBlur')
            .attr('stdDeviation', '2.5')
            .attr('result', 'coloredBlur');
        const feMerge = glow.append('feMerge');
        feMerge.append('feMergeNode').attr('in', 'coloredBlur');
        feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

        // Create main group for zoom/pan
        this.g = this.svg.append('g')
            .attr('class', 'tree-group');

        // Add background pattern layer
        this.g.append('rect')
            .attr('x', -10000)
            .attr('y', -10000)
            .attr('width', 20000)
            .attr('height', 20000)
            .attr('fill', 'url(#grid-pattern)')
            .style('pointer-events', 'none');

        // Add zoom behavior
        if (this.options.enableZoom) {
            this.zoom = d3.zoom()
                .scaleExtent([this.options.minZoom, this.options.maxZoom])
                .on('zoom', (event) => {
                    this.g.attr('transform', event.transform);
                });

            this.svg.call(this.zoom);
        }

        // Center the view and zoom out to see more of the tree
        const initialTransform = d3.zoomIdentity
            .translate(this.options.width / 2, this.options.height / 2)
            .scale(0.15); // Start zoomed out like PoB

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
                    // Store raw tree data for sprite access
                    const rawTreeData = apiData.tree;

                    // Extract sprite data from official tree
                    if (rawTreeData.sprites && this.options.useSprites) {
                        this.sprites = rawTreeData.sprites;
                        console.log(`Loaded ${Object.keys(this.sprites).length} sprite sheets`);
                    }

                    // Transform official POE data format to our format
                    this.treeData = this.transformOfficialTreeData(rawTreeData);
                    console.log(`Loaded ${apiData.nodeCount} nodes from official POE data`);
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
     * Render the tree (PoB style - cleaner visualization)
     */
    renderTree() {
        if (!this.treeData) return;

        // Clear existing
        this.g.selectAll('*').remove();

        // Create node lookup for performance
        const nodeMap = new Map(this.treeData.nodes.map(n => [n.id, n]));

        // Filter nodes - only show important ones for clarity
        // In a real build, we'd only show allocated + nearby nodes
        const visibleNodes = this.treeData.nodes.filter(n =>
            n.type === 'keystone' ||
            n.type === 'notable' ||
            n.type === 'mastery' ||
            n.type === 'jewel' ||
            n.type === 'classStart' ||
            n.type === 'root' ||
            this.allocatedNodes.has(n.id)
        );

        // Draw connection lines (thinner, darker)
        const linkGroup = this.g.append('g')
            .attr('class', 'links')
            .style('opacity', 0.3);

        this.treeData.links.forEach(link => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);

            if (!source || !target) return;

            // Only draw links between visible important nodes
            const sourceVisible = visibleNodes.find(n => n.id === source.id);
            const targetVisible = visibleNodes.find(n => n.id === target.id);

            if (!sourceVisible && !targetVisible) return;

            linkGroup.append('line')
                .attr('x1', source.x)
                .attr('y1', source.y)
                .attr('x2', target.x)
                .attr('y2', target.y)
                .attr('stroke', this.allocatedNodes.has(source.id) && this.allocatedNodes.has(target.id) ? '#d4af37' : '#444')
                .attr('stroke-width', this.allocatedNodes.has(source.id) && this.allocatedNodes.has(target.id) ? 3 : 1.5)
                .attr('stroke-linecap', 'round');
        });

        // Draw all normal nodes as tiny dots (for context)
        const normalNodes = this.g.append('g')
            .attr('class', 'normal-nodes')
            .style('opacity', 0.25);

        this.treeData.nodes
            .filter(n => n.type === 'normal' && !this.allocatedNodes.has(n.id))
            .forEach(node => {
                normalNodes.append('circle')
                    .attr('cx', node.x)
                    .attr('cy', node.y)
                    .attr('r', 3)
                    .attr('fill', '#666')
                    .attr('stroke', 'none');
            });

        // Draw important nodes (keystones, notables, etc.)
        const nodeGroup = this.g.append('g')
            .attr('class', 'important-nodes');

        visibleNodes.forEach(node => {
            const isAllocated = this.allocatedNodes.has(node.id);
            const g = nodeGroup.append('g')
                .attr('class', 'node')
                .attr('transform', `translate(${node.x}, ${node.y})`)
                .style('cursor', 'pointer')
                .on('click', (event) => this.handleNodeClick(event, node))
                .on('mouseenter', (event) => this.handleNodeHover(event, node))
                .on('mouseleave', () => this.handleNodeLeave());

            // Glow effect for allocated nodes
            if (isAllocated) {
                g.append('circle')
                    .attr('r', this.getNodeRadius(node) + 4)
                    .attr('fill', 'none')
                    .attr('stroke', '#f59e0b')
                    .attr('stroke-width', 2)
                    .style('opacity', 0.6)
                    .style('filter', 'blur(3px)');
            }

            // Main node circle
            g.append('circle')
                .attr('r', this.getNodeRadius(node))
                .attr('fill', isAllocated ? this.getNodeColor(node) : '#2d3748')
                .attr('stroke', isAllocated ? '#f59e0b' : this.getNodeColor(node))
                .attr('stroke-width', isAllocated ? 2.5 : 2)
                .style('opacity', isAllocated ? 1 : 0.7);

            // Inner circle for special nodes
            if (node.type === 'keystone' || node.type === 'mastery') {
                g.append('circle')
                    .attr('r', this.getNodeRadius(node) - 4)
                    .attr('fill', 'none')
                    .attr('stroke', isAllocated ? '#fff' : this.getNodeColor(node))
                    .attr('stroke-width', 1.5)
                    .style('opacity', isAllocated ? 0.8 : 0.5);
            }

            // Node icon placeholder (would be sprite in full implementation)
            if (node.type !== 'normal') {
                g.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .attr('fill', isAllocated ? '#000' : '#888')
                    .attr('font-size', '10px')
                    .attr('font-weight', 'bold')
                    .style('pointer-events', 'none')
                    .text(this.getNodeIcon(node.type));
            }
        });

        // Add labels for keystones and allocated notables only
        const labelGroup = this.g.append('g')
            .attr('class', 'labels');

        visibleNodes
            .filter(n => n.type === 'keystone' || (n.type === 'notable' && this.allocatedNodes.has(n.id)))
            .forEach(node => {
                labelGroup.append('text')
                    .attr('x', node.x)
                    .attr('y', node.y + this.getNodeRadius(node) + 14)
                    .attr('text-anchor', 'middle')
                    .attr('fill', this.allocatedNodes.has(node.id) ? '#f59e0b' : '#a0aec0')
                    .attr('font-size', '11px')
                    .attr('font-weight', this.allocatedNodes.has(node.id) ? 'bold' : 'normal')
                    .style('pointer-events', 'none')
                    .text(node.name || '');
            });

        console.log(`Rendered ${visibleNodes.length} important nodes (total: ${this.treeData.nodes.length})`);
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
     * Get sprite data for a node icon
     * Returns sprite coordinates from GGG sprite sheets
     */
    getSpriteForNode(node) {
        if (!this.sprites || !node.icon) {
            return null;
        }

        // Determine which sprite sheet based on node type and state
        let spriteSheetKey;
        const isAllocated = this.allocatedNodes.has(node.id);

        // Map node types to sprite sheet keys based on GGG format
        if (node.type === 'keystone') {
            spriteSheetKey = isAllocated ? 'keystoneActive' : 'keystoneInactive';
        } else if (node.type === 'notable') {
            spriteSheetKey = isAllocated ? 'notableActive' : 'notableInactive';
        } else if (node.type === 'mastery') {
            spriteSheetKey = 'mastery';
        } else if (node.type === 'jewel') {
            spriteSheetKey = 'jewel';
        } else {
            spriteSheetKey = isAllocated ? 'normalActive' : 'normalInactive';
        }

        // Get sprite sheet for the desired zoom level
        const zoomKey = this.options.spriteZoomLevel.toString();
        const spriteSheet = this.sprites[spriteSheetKey];

        if (!spriteSheet || !spriteSheet[zoomKey]) {
            return null;
        }

        const zoomData = spriteSheet[zoomKey];

        // Find coordinates for this node's icon
        if (zoomData.coords && zoomData.coords[node.icon]) {
            return {
                url: zoomData.filename,
                coords: zoomData.coords[node.icon],
                sheetWidth: zoomData.w,
                sheetHeight: zoomData.h
            };
        }

        return null;
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
