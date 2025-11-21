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

        // Create SVG
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${this.options.width} ${this.options.height}`)
            .style('background', '#0a0a0a')
            .style('border-radius', '8px');

        // Add definitions for gradients and patterns
        const defs = this.svg.append('defs');

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

        // Add zoom behavior
        if (this.options.enableZoom) {
            this.zoom = d3.zoom()
                .scaleExtent([this.options.minZoom, this.options.maxZoom])
                .on('zoom', (event) => {
                    this.g.attr('transform', event.transform);
                });

            this.svg.call(this.zoom);
        }

        // Center the view
        const initialTransform = d3.zoomIdentity
            .translate(this.options.width / 2, this.options.height / 2)
            .scale(1);

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
                    // Transform official POE data format to our format
                    this.treeData = this.transformOfficialTreeData(apiData.tree);
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
        // Official POE data has a different structure
        // Transform it to our expected format

        const nodes = [];
        const links = [];

        // Process nodes from official data
        if (officialData.nodes) {
            for (const [nodeId, nodeData] of Object.entries(officialData.nodes)) {
                // Transform node data
                const node = {
                    id: nodeId,
                    name: nodeData.name || nodeData.dn || `Node ${nodeId}`,
                    type: this.detectNodeType(nodeData),
                    stats: nodeData.sd || nodeData.stats || [],
                    x: nodeData.x || 0,
                    y: nodeData.y || 0,
                    orbit: nodeData.orbit || nodeData.o || 0,
                    orbitIndex: nodeData.orbitIndex || nodeData.oidx || 0
                };

                nodes.push(node);
            }
        }

        // Process connections/links
        if (officialData.nodes) {
            for (const [nodeId, nodeData] of Object.entries(officialData.nodes)) {
                if (nodeData.out || nodeData.o) {
                    const connections = nodeData.out || nodeData.o || [];
                    connections.forEach(targetId => {
                        links.push({
                            source: nodeId,
                            target: String(targetId)
                        });
                    });
                }
            }
        }

        return { nodes, links };
    }

    /**
     * Detect node type from official data
     */
    detectNodeType(nodeData) {
        // Determine node type based on official data flags
        if (nodeData.isNotable || nodeData.not) return 'notable';
        if (nodeData.isKeystone || nodeData.ks) return 'keystone';
        if (nodeData.isMastery || nodeData.m) return 'mastery';
        if (nodeData.isJewelSocket || nodeData.isSocket) return 'jewel';
        if (nodeData.ascendancyName || nodeData.spc) return 'ascendancy';
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
     * Render the tree
     */
    renderTree() {
        if (!this.treeData) return;

        // Clear existing
        this.g.selectAll('*').remove();

        // Draw links
        const link = this.g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.treeData.links)
            .enter()
            .append('line')
            .attr('x1', d => {
                const source = this.treeData.nodes.find(n => n.id === d.source);
                return source ? source.x : 0;
            })
            .attr('y1', d => {
                const source = this.treeData.nodes.find(n => n.id === d.source);
                return source ? source.y : 0;
            })
            .attr('x2', d => {
                const target = this.treeData.nodes.find(n => n.id === d.target);
                return target ? target.x : 0;
            })
            .attr('y2', d => {
                const target = this.treeData.nodes.find(n => n.id === d.target);
                return target ? target.y : 0;
            })
            .attr('stroke', '#333')
            .attr('stroke-width', 2);

        // Draw nodes
        const node = this.g.append('g')
            .attr('class', 'nodes')
            .selectAll('circle')
            .data(this.treeData.nodes)
            .enter()
            .append('circle')
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => this.getNodeRadius(d))
            .attr('fill', d => this.getNodeColor(d))
            .attr('stroke', '#555')
            .attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('click', (event, d) => this.handleNodeClick(event, d))
            .on('mouseenter', (event, d) => this.handleNodeHover(event, d))
            .on('mouseleave', () => this.handleNodeLeave());

        // Add node labels
        const label = this.g.append('g')
            .attr('class', 'labels')
            .selectAll('text')
            .data(this.treeData.nodes.filter(n => n.type !== 'normal'))
            .enter()
            .append('text')
            .attr('x', d => d.x)
            .attr('y', d => d.y + this.getNodeRadius(d) + 15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#fff')
            .attr('font-size', '10px')
            .style('pointer-events', 'none')
            .text(d => d.name);
    }

    /**
     * Get node radius based on type
     */
    getNodeRadius(node) {
        switch (node.type) {
            case 'start': return this.options.startingNodeRadius;
            case 'keystone': return this.options.keystoneRadius;
            case 'notable': return this.options.notableRadius;
            default: return this.options.nodeRadius;
        }
    }

    /**
     * Get node color
     */
    getNodeColor(node) {
        if (this.allocatedNodes.has(node.id)) {
            return '#f59e0b'; // Yellow for allocated
        }

        switch (node.type) {
            case 'start': return '#3b82f6'; // Blue
            case 'keystone': return '#8b5cf6'; // Purple
            case 'notable': return '#10b981'; // Green
            default: return '#6b7280'; // Gray
        }
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
