// src/views/diagram/react-graph-generator.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DiagramGenerator } from './graph-generator';
import { Node, Edge, Graph } from '../../converter/types';

/**
 * Generates interactive diagrams using the digramaatic_ui React library
 */
export class ReactGraphGenerator extends DiagramGenerator {
    /**
     * Generate an interactive React-based diagram
     * @param targetNode The node to generate a diagram for
     * @param allNodes All nodes in the project (for finding relationships)
     * @returns An empty string, as we're generating HTML directly
     */
    public generateDiagram(targetNode: Node, allNodes: Node[]): string {
        // We don't need to return a string as we'll be generating React components
        // This is just to satisfy the interface
        return '';
    }
    
    /**
     * Display the generated diagram in a webview panel
     * @param context The extension context
     * @param targetNode The node to show the diagram for
     * @param allNodes All nodes in the project
     * @param diagramFormat The format of the diagram (ignored, will always use React)
     * @param graph Optional full graph data including edges
     */
    public async showDiagram(
        context: vscode.ExtensionContext,
        targetNode: Node,
        allNodes: Node[],
        diagramFormat: string = 'react',
        graph?: Graph
    ): Promise<void> {
        // Create a webview panel
        const panel = vscode.window.createWebviewPanel(
            'dependencyDiagram',
            `Diagram: ${targetNode.title}`,
            vscode.ViewColumn.One,
            { 
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(path.join(context.extensionPath, 'media')),
                    vscode.Uri.file(path.join(context.extensionPath, 'resources')),
                    vscode.Uri.file(path.join(context.extensionPath, 'dist', 'webview'))
                ]
            }
        );
        
        // Prepare data for the React app
        const graphData = this.prepareGraphData(targetNode, allNodes, graph);
        
        // Get path to assets
        const mainScript = this.getWebviewResourcePath(context, panel, 'dist/webview/assets/index.js');
        const mainCss = this.getWebviewResourcePath(context, panel, 'dist/webview/assets/style.css');
        
        if (!mainScript) {
            vscode.window.showErrorMessage('Could not load dependency diagram: build assets missing');
            panel.dispose();
            return;
        }
        
        // Generate HTML for the webview
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dependency Diagram</title>
                ${mainCss ? `<link rel="stylesheet" href="${mainCss}">` : ''}
                <script>
                    // Make data available to React app
                    window.diagramData = ${JSON.stringify(graphData)};
                    window.vscode = acquireVsCodeApi();
                    
                    // Add process polyfill for browser environment
                    window.process = {
                        env: { NODE_ENV: 'production' },
                        browser: true
                    };
                    
                    // Set additional visualization parameters
                    window.viewParams = {
                        singleNodeMode: ${graphData.nodes.length === 1},
                        showSections: true,
                        autoLayout: "${graphData.nodes.length === 1 ? 'single' : 'circular'}",
                        focusedNodeId: "${targetNode.id}",
                        fullGraphAvailable: ${!!graphData.metadata?.fullGraphAvailable}
                    };
                </script>
                <style>
                    body, html {
                        margin: 0;
                        padding: 0;
                        height: 100vh;
                        width: 100vw;
                        overflow: hidden;
                    }
                    #root {
                        height: 100vh;
                        width: 100vw;
                    }
                    
                    /* Component detail view styles */
                    .component-detail {
                        padding: 2rem;
                    }
                    .component-heading {
                        margin-bottom: 1rem;
                        font-weight: bold;
                    }
                    .component-section {
                        margin-bottom: 1.5rem;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        padding: 1rem;
                    }
                    .section-heading {
                        font-weight: bold;
                        margin-bottom: 0.5rem;
                        color: #64D2FF;
                    }
                    .section-items {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }
                    .item-prop {
                        color: #F8C555;
                    }
                    .item-state {
                        color: #FC9AD9;
                    }
                    .item-hook {
                        color: #56D364;
                    }
                    
                    /* Controls */
                    .graph-controls {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        z-index: 100;
                        display: flex;
                        gap: 8px;
                    }
                    .graph-control-button {
                        background-color: rgba(30, 30, 30, 0.7);
                        color: #e0e0e0;
                        border: 1px solid #4a5568;
                        border-radius: 4px;
                        padding: 6px 12px;
                        font-size: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .graph-control-button:hover {
                        background-color: rgba(50, 50, 50, 0.9);
                        border-color: #718096;
                    }
                    .vscode-light .graph-control-button {
                        background-color: rgba(240, 240, 240, 0.7);
                        color: #333333;
                        border-color: #cbd5e0;
                    }
                    .vscode-light .graph-control-button:hover {
                        background-color: rgba(220, 220, 220, 0.9);
                        border-color: #a0aec0;
                    }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script type="module" src="${mainScript}"></script>
            </body>
            </html>
        `;
        
        // Set the HTML content
        panel.webview.html = htmlContent;
        
        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            async (message) => {
                console.log('Received message from webview:', message.command, message);
                switch (message.command) {
                    case 'selectNode':
                        // Handle node selection (e.g., update structure view)
                        const selectedNode = allNodes.find(n => n.id === message.nodeId);
                        if (selectedNode) {
                            vscode.commands.executeCommand('dependencyAnalytics.showNodeDetails', { node: selectedNode });
                        }
                        break;
                    case 'navigateToSource':
                        // Handle navigation to source
                        if (message.filePath) {
                            this.navigateToSourceFile(message.filePath);
                        }
                        break;
                    case 'openSourceFile':
                        // Handle open in source file request
                        if (message.filePath) {
                            this.navigateToSourceFile(message.filePath);
                        }
                        break;
                    case 'revealInFileTree':
                        // Handle reveal in file tree request
                        if (message.filePath) {
                            this.revealInFileExplorer(message.filePath);
                        }
                        break;
                    case 'toggleFullGraph':
                        // Toggle between focused node view and full graph view
                        const fullGraph = this.findGraphData(allNodes);
                        if (fullGraph) {
                            const newGraphData = message.showFullGraph 
                                ? this.prepareFullGraphData(targetNode, allNodes, fullGraph)
                                : this.prepareGraphData(targetNode, allNodes, graph);
                                
                            panel.webview.postMessage({ 
                                command: 'updateGraphData', 
                                data: newGraphData,
                                showFullGraph: message.showFullGraph
                            });
                        }
                        break;
                    case 'expandNode':
                        // Handle node expansion request
                        console.log('Received expandNode command for nodeId:', message.nodeId);
                        const nodeToExpand = allNodes.find(n => n.id === message.nodeId);
                        if (nodeToExpand) {
                            console.log('Found node to expand:', nodeToExpand.title || nodeToExpand.id);
                            // Find all connections for this node
                            const fullGraphData = graph || this.findGraphData(allNodes);
                            if (fullGraphData) {
                                const expandedGraph = this.expandNodeConnections(targetNode, nodeToExpand, allNodes, fullGraphData);
                                console.log('Graph expanded, sending update to webview');
                                
                                // Update the graph data
                                panel.webview.postMessage({ 
                                    command: 'updateGraphData', 
                                    data: expandedGraph
                                });
                            } else {
                                console.log('No graph data found for expansion');
                            }
                        } else {
                            console.log('Could not find node with ID:', message.nodeId);
                        }
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    }
    
    /**
     * Prepare data for the React graph component showing only the target node and its immediate connections
     * @param targetNode The target node to focus on
     * @param allNodes All nodes in the project
     * @param graph Optional full graph data including edges
     * @returns Graph data in the format expected by the digramaatic_ui library
     */
    private prepareGraphData(targetNode: Node, allNodes: Node[], graph?: Graph): any {
        // Create a set of nodes to include in the graph
        const nodeIds = new Set<string>([targetNode.id]);
        const edges: any[] = [];
        
        // Check if we have an actual Graph object with edges already defined
        if (graph && Array.isArray(graph.edges)) {
            // Process existing edges, filter to only include those related to the target node
            graph.edges.forEach((edge: any) => {
                if (edge.source === targetNode.id || edge.target === targetNode.id) {
                    // Add both nodes to the set
                    nodeIds.add(edge.source);
                    nodeIds.add(edge.target);
                    
                    // Add the edge to our collection
                    edges.push({
                        source: edge.source,
                        target: edge.target,
                        type: edge.type || 'dependency',
                        metadata: edge.metadata || { relationship: 'related' }
                    });
                }
            });
        } else {
            // Try to find graph data if not provided
            const graphData = this.findGraphData(allNodes);
            if (graphData && Array.isArray(graphData.edges)) {
                // Process existing edges, filter to only include those related to the target node
                graphData.edges.forEach((edge: any) => {
                    if (edge.source === targetNode.id || edge.target === targetNode.id) {
                        // Add both nodes to the set
                        nodeIds.add(edge.source);
                        nodeIds.add(edge.target);
                        
                        // Add the edge to our collection
                        edges.push({
                            source: edge.source,
                            target: edge.target,
                            type: edge.type || 'dependency',
                            metadata: edge.metadata || { relationship: 'related' }
                        });
                    }
                });
            }
        }
        
        // If we didn't find any edges from graph data, fallback to generating them from metadata
        if (edges.length === 0) {
            // Find direct relationships (outgoing)
            allNodes.forEach(node => {
                if (node.metadata?.outgoingDependencies && Array.isArray(node.metadata.outgoingDependencies)) {
                    node.metadata.outgoingDependencies.forEach((dep: string) => {
                        const targetNodeData = allNodes.find(n => 
                            n.metadata?.fullName === dep || n.title === dep || n.id === dep);
                        
                        if (targetNodeData && (node.id === targetNode.id || targetNodeData.id === targetNode.id)) {
                            nodeIds.add(node.id);
                            nodeIds.add(targetNodeData.id);
                            
                            edges.push({
                                source: node.id,
                                target: targetNodeData.id,
                                type: 'dependency',
                                metadata: {
                                    direction: 'outgoing'
                                }
                            });
                        }
                    });
                }
                
                // Handle TypeScript imports (commonly stored in imports field)
                if (node.metadata?.imports && Array.isArray(node.metadata.imports)) {
                    node.metadata.imports.forEach((importInfo: any) => {
                        const importName = typeof importInfo === 'string' ? importInfo : importInfo.name || importInfo.path;
                        if (!importName) return;
                        
                        const importedNode = allNodes.find(n => 
                            n.metadata?.fullName === importName || 
                            n.title === importName || 
                            n.id === importName || 
                            (n.metadata?.filePath && n.metadata.filePath.includes(importName)));
                        
                        if (importedNode && (node.id === targetNode.id || importedNode.id === targetNode.id)) {
                            nodeIds.add(node.id);
                            nodeIds.add(importedNode.id);
                            
                            edges.push({
                                source: node.id,
                                target: importedNode.id,
                                type: 'import',
                                metadata: {
                                    direction: 'outgoing',
                                    relationship: 'imports'
                                }
                            });
                        }
                    });
                }
            });
            
            // Find inheritance relationships
            allNodes.forEach(node => {
                if (node.metadata?.superClassName && node.id === targetNode.id) {
                    const superClass = allNodes.find(n => 
                        n.metadata?.fullName === node.metadata.superClassName || 
                        n.title === node.metadata.superClassName);
                    
                    if (superClass) {
                        nodeIds.add(superClass.id);
                        
                        edges.push({
                            source: node.id,
                            target: superClass.id,
                            type: 'inheritance',
                            metadata: {
                                relationship: 'extends'
                            }
                        });
                    }
                }
                
                if (node.metadata?.superClassName && node.metadata.superClassName === targetNode.metadata?.fullName) {
                    nodeIds.add(node.id);
                    
                    edges.push({
                        source: node.id,
                        target: targetNode.id,
                        type: 'inheritance',
                        metadata: {
                            relationship: 'extends'
                        }
                    });
                }
            });
            
            // Find interface implementation relationships
            allNodes.forEach(node => {
                if (node.metadata?.interfaces && Array.isArray(node.metadata.interfaces)) {
                    node.metadata.interfaces.forEach((interfaceName: string) => {
                        const interfaceNode = allNodes.find(n => 
                            n.metadata?.fullName === interfaceName || n.title === interfaceName);
                        
                        if (interfaceNode && (node.id === targetNode.id || interfaceNode.id === targetNode.id)) {
                            nodeIds.add(node.id);
                            nodeIds.add(interfaceNode.id);
                            
                            edges.push({
                                source: node.id,
                                target: interfaceNode.id,
                                type: 'implementation',
                                metadata: {
                                    relationship: 'implements'
                                }
                            });
                        }
                    });
                }
            });
        }
        
        // Filter nodes by the ids we've collected
        const nodes = allNodes
            .filter(node => nodeIds.has(node.id))
            .map(node => this.transformNodeForReact(node));
            
        // Check if a full graph is available
        const fullGraph = this.findGraphData(allNodes);
        const fullGraphAvailable = !!fullGraph;
        
        // Return the graph data in format expected by digramaatic_ui
        return {
            nodes,
            edges,
            projectName: `Diagram: ${targetNode.title}`,
            language: this.detectLanguage(allNodes),
            layout: nodes.length === 1 ? 'single' : 'circular',
            visualization: {
                mode: edges.length === 0 ? 'detail' : 'graph',
                singleNodeDetail: edges.length === 0
            },
            metadata: {
                generatedBy: "Dependency Analytics Tool for VS Code",
                focusedNode: targetNode.id,
                isSingleNode: nodes.length === 1,
                fullGraphAvailable: fullGraphAvailable,
                isFullGraph: false
            }
        };
    }
    
    /**
     * Prepare data for the full graph view
     * @param targetNode The originally selected node
     * @param allNodes All nodes in the project
     * @param graph The full graph data including all edges
     * @returns Graph data in the format expected by the digramaatic_ui library
     */
    private prepareFullGraphData(targetNode: Node, allNodes: Node[], graph: Graph): any {
        // Transform all nodes to the React format
        const nodes = allNodes.map(node => this.transformNodeForReact(node));
        
        // Include all edges
        const edges = graph.edges.map((edge: any) => ({
            source: edge.source,
            target: edge.target,
            type: edge.type || 'dependency',
            metadata: edge.metadata || { relationship: 'related' }
        }));
        
        // Return the full graph data
        return {
            nodes,
            edges,
            projectName: `Complete Project Graph`,
            language: this.detectLanguage(allNodes),
            layout: 'force', // Force-directed layout works better for full graphs
            visualization: {
                mode: 'graph',
                singleNodeDetail: false,
                infiniteCanvas: true,
                zoomable: true,
                pannable: true
            },
            layoutSettings: {
                nodeSpacing: 120,      // Increased spacing between nodes
                edgeLength: 200,       // Longer edges to spread out the graph
                forceStrength: 0.3,    // Weaker force to allow more natural spreading
                chargeStrength: -800,  // Stronger charge to push nodes apart
                centeringForce: 0.5    // Moderate centering force
            },
            metadata: {
                generatedBy: "Dependency Analytics Tool for VS Code",
                focusedNode: targetNode.id,
                isSingleNode: false,
                fullGraphAvailable: true,
                isFullGraph: true
            }
        };
    }
    
    /**
     * Transform a node to the format expected by the digramaatic_ui library
     * @param node The node to transform
     * @returns A node in the format expected by digramaatic_ui
     */
    private transformNodeForReact(node: Node): any {
        return {
            id: node.id,
            title: node.title,
            type: node.type,
            sections: node.sections,
            metadata: {
                ...node.metadata,
                filePath: node.metadata?.sourceFile || node.metadata?.filePath,
                // Extract additional metadata for visualization
                hooks: this.extractHooks(node),
                state: this.extractState(node),
                props: this.extractProps(node)
            }
        };
    }
    
    /**
     * Extract hooks from a node's sections
     * @param node The node to extract hooks from
     * @returns Array of hook names
     */
    private extractHooks(node: Node): string[] {
        // Extract hooks from sections
        const hooks: string[] = [];
        if (node.sections) {
            for (const section of node.sections) {
                if (section.name.toLowerCase() === 'hooks' && section.items) {
                    for (const item of section.items) {
                        if (item.icon === 'hook' && item.value) {
                            hooks.push(item.value);
                        }
                    }
                }
            }
        }
        return hooks;
    }
    
    /**
     * Extract state variables from a node's sections
     * @param node The node to extract state from
     * @returns Array of state variable details
     */
    private extractState(node: Node): any[] {
        // Extract state from sections
        const stateItems: any[] = [];
        if (node.sections) {
            for (const section of node.sections) {
                if (section.name.toLowerCase() === 'state' && section.items) {
                    for (const item of section.items) {
                        if (item.icon === 'state' && item.value) {
                            stateItems.push({
                                name: item.id,
                                value: item.value
                            });
                        }
                    }
                }
            }
        }
        return stateItems;
    }
    
    /**
     * Extract props from a node's sections
     * @param node The node to extract props from
     * @returns Array of prop details
     */
    private extractProps(node: Node): any[] {
        // Extract props from sections
        const propItems: any[] = [];
        if (node.sections) {
            for (const section of node.sections) {
                if (section.name.toLowerCase() === 'props' && section.items) {
                    for (const item of section.items) {
                        if (item.icon === 'prop' && item.value) {
                            propItems.push({
                                name: item.id,
                                value: item.value
                            });
                        }
                    }
                }
            }
        }
        return propItems;
    }
    
    /**
     * Get webview resource URI
     * @param context Extension context
     * @param panel Webview panel
     * @param resourcePath Path to the resource relative to extension root
     * @returns URI to the resource in the webview
     */
    private getWebviewResourcePath(
        context: vscode.ExtensionContext,
        panel: vscode.WebviewPanel,
        resourcePath: string
    ): string | undefined {
        const resourceUri = vscode.Uri.file(path.join(context.extensionPath, resourcePath));
        
        if (!fs.existsSync(resourceUri.fsPath)) {
            console.error(`Resource not found: ${resourceUri.fsPath}`);
            return undefined;
        }
        
        const webviewUri = panel.webview.asWebviewUri(resourceUri);
        return webviewUri.toString();
    }
    
    /**
     * Detect the language of the project based on the nodes
     * @param nodes All nodes in the project
     * @returns The detected language
     */
    private detectLanguage(nodes: Node[]): string {
        // Try to detect language from node types
        const nodeTypes = new Set<string>();
        nodes.forEach(node => {
            if (node.type) nodeTypes.add(node.type.toLowerCase());
        });
        
        if (nodeTypes.has('component') || nodeTypes.has('hook')) return 'typescript';
        if (nodeTypes.has('class') || nodeTypes.has('interface')) return 'java';
        if (nodeTypes.has('model') || nodeTypes.has('view')) return 'python';
        
        // Try to detect from file extensions in metadata
        for (const node of nodes) {
            if (node.metadata?.filePath || node.metadata?.sourceFile) {
                const filePath = node.metadata?.filePath || node.metadata?.sourceFile || '';
                if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) return 'typescript';
                if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) return 'javascript';
                if (filePath.endsWith('.java')) return 'java';
                if (filePath.endsWith('.py')) return 'python';
            }
        }
        
        return 'unknown';
    }
    
    /**
     * Find the complete graph data including edges from the set of nodes
     * @param nodes All nodes in the project
     * @returns Graph data if found, otherwise undefined
     */
    private findGraphData(nodes: Node[]): Graph | undefined {
        // Check if the allNodes array is actually the entire graph object
        // This happens when the extension has loaded the graph and passed it
        if (Array.isArray(nodes) && 'edges' in (nodes as any)) {
            console.log('Found edges property in nodes array');
            return nodes as unknown as Graph;
        }
        
        // Check if the first node has a reference to the parent graph
        if (nodes.length > 0 && (nodes[0] as any)._graph) {
            console.log('Found _graph property in first node');
            return (nodes[0] as any)._graph;
        }
        
        // Otherwise, try to rebuild the graph structure from the workspace
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            console.log('No workspace folders found');
            return undefined;
        }
        
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        console.log('Workspace root:', workspaceRoot);
        
        // First try to load from standard location
        const standardDepsPath = path.join(workspaceRoot, '.vscode', 'standard-dependencies.json');
        console.log('Checking standard deps path:', standardDepsPath);
        if (fs.existsSync(standardDepsPath)) {
            console.log('Found standard deps file');
            try {
                const data = JSON.parse(fs.readFileSync(standardDepsPath, 'utf8'));
                if (data && data.nodes && data.edges) {
                    console.log(`Loaded ${data.edges.length} edges from standard file`);
                    return data as Graph;
                }
            } catch (error) {
                console.error('Error loading graph data:', error);
            }
        }
        
        // Then try from assets folder (common for demo/sample projects)
        const assetsDepsPath = path.join(workspaceRoot, 'assets', 'standard-dependencies.json');
        console.log('Checking assets deps path:', assetsDepsPath);
        if (fs.existsSync(assetsDepsPath)) {
            console.log('Found assets deps file');
            try {
                const data = JSON.parse(fs.readFileSync(assetsDepsPath, 'utf8'));
                if (data && data.nodes && data.edges) {
                    console.log(`Loaded ${data.edges.length} edges from assets file`);
                    return data as Graph;
                }
            } catch (error) {
                console.error('Error loading graph data from assets:', error);
            }
        }
        
        // Finally try the root of the workspace
        const rootDepsPath = path.join(workspaceRoot, 'standard-dependencies.json');
        console.log('Checking root deps path:', rootDepsPath);
        if (fs.existsSync(rootDepsPath)) {
            console.log('Found root deps file');
            try {
                const data = JSON.parse(fs.readFileSync(rootDepsPath, 'utf8'));
                if (data && data.nodes && data.edges) {
                    console.log(`Loaded ${data.edges.length} edges from root file`);
                    return data as Graph;
                }
            } catch (error) {
                console.error('Error loading graph data from root:', error);
            }
        }
        
        console.log('Could not find any graph data');
        return undefined;
    }

    /**
     * Navigate to a source file in the editor
     * @param filePath Path to the source file
     */
    private navigateToSourceFile(filePath: string): void {
        vscode.commands.executeCommand('dependencyAnalytics.openSourceFile', { filePath });
    }

    /**
     * Reveal a file in the explorer view
     * @param filePath Path to the file to reveal
     */
    private revealInFileExplorer(filePath: string): void {
        vscode.commands.executeCommand('dependencyAnalytics.revealInFileTree', { filePath });
    }

    /**
     * Expand node connections
     * @param node The node to expand connections for
     * @param allNodes All nodes in the project
     * @param graph The full graph data including edges
     * @returns Expanded graph data
     */
    private expandNodeConnections(focusedNode: Node, node: Node, allNodes: Node[], graph: Graph): any {
              
        // Get the current view data using the original focused node, not the expanded node
        const currentData = this.prepareGraphData(focusedNode, allNodes, graph);
        
        // Create sets for tracking included nodes and edges
        const nodeIds = new Set<string>();
        const edgeIds = new Set<string>();
        
        // Add existing nodes and edges from current data
        currentData.nodes.forEach((n: any) => nodeIds.add(n.id));
        currentData.edges.forEach((e: any) => edgeIds.add(`${e.source}-${e.target}`));
        
        // Track new nodes and edges being added by this expansion
        const newNodeIds = new Set<string>();
        const newEdgeIds = new Set<string>();
        
        console.log(`Expanding node ${node.id} - currently have ${nodeIds.size} nodes and ${edgeIds.size} edges`);
        
        // Find all outgoing dependency relationships from the full graph
        if (graph && Array.isArray(graph.edges)) {
            graph.edges.forEach((edge: any) => {
                // Find outgoing edges from the node we want to expand
                if (edge.source === node.id && !edgeIds.has(`${edge.source}-${edge.target}`)) {
                    // Add the target node to our sets
                    nodeIds.add(edge.target);
                    newNodeIds.add(edge.target);
                    
                    // Add the edge to our tracking sets
                    edgeIds.add(`${edge.source}-${edge.target}`);
                    newEdgeIds.add(`${edge.source}-${edge.target}`);
                }
            });
        }
        
        // Find additional relationships from node metadata
        if (node.metadata?.outgoingDependencies && Array.isArray(node.metadata.outgoingDependencies)) {
            node.metadata.outgoingDependencies.forEach((dep: string) => {
                const targetNodeData = allNodes.find(n => 
                    n.metadata?.fullName === dep || n.title === dep || n.id === dep);
                
                if (targetNodeData && !edgeIds.has(`${node.id}-${targetNodeData.id}`)) {
                    nodeIds.add(targetNodeData.id);
                    newNodeIds.add(targetNodeData.id);
                    
                    edgeIds.add(`${node.id}-${targetNodeData.id}`);
                    newEdgeIds.add(`${node.id}-${targetNodeData.id}`);
                }
            });
        }
        
        // Create a list of all nodes (existing + new) from our set
        const expandedNodes = Array.from(nodeIds)
            .map(id => allNodes.find(n => n.id === id))
            .filter((n): n is Node => n !== undefined)
            .map(n => this.transformNodeForReact(n));
        
        // Create a list of all edges (existing + new) from our tracking set
        const expandedEdges = Array.from(edgeIds).map(edgeKey => {
            const [source, target] = edgeKey.split('-');
            
            // First try to find the edge in the graph data
            const existingEdge = graph && Array.isArray(graph.edges) 
                ? graph.edges.find((e: any) => e.source === source && e.target === target)
                : null;
                
            if (existingEdge) {
                return existingEdge;
            }
            
            // If not found, create a basic edge
            return {
                source,
                target,
                type: 'dependency',
                metadata: { relationship: 'related' }
            };
        });
        
        // Get information about newly added nodes
        const newNodesCount = newNodeIds.size;
        const newEdgesCount = newEdgeIds.size;
        
        console.log(`Expansion added ${newNodesCount} new nodes and ${newEdgesCount} new edges`);
        
        // Highlight the newly added nodes and edges
        const highlightedEdges = Array.from(newEdgeIds);
        const highlightedNodes = [node.id, ...Array.from(newNodeIds)];
        
        
        
        // Return the expanded graph data with the same layout and visualization settings
        return {
            nodes: expandedNodes,
            edges: expandedEdges,
            projectName: currentData.projectName,
            language: currentData.language,
            layout: currentData.layout,
            visualization: currentData.visualization,
            layoutSettings: currentData.layoutSettings || {},
            metadata: {
                ...currentData.metadata,
                expandedNode: node.id,
                highlightedNodes: highlightedNodes,
                highlightedEdges: highlightedEdges,
                newNodes: Array.from(newNodeIds),
                newEdges: Array.from(newEdgeIds),
                justExpanded: true
            }
        };
    }
}