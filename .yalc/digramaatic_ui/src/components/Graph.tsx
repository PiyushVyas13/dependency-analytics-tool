// src/components/Graph.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Import our Node type, with explicit renaming to avoid collision with DOM Node type
import { GraphData, Node as GraphNode, Edge } from '../types/graph';

// Import extracted components
import { GraphNode as GraphNodeComponent } from './graph-node/GraphNode';
import { GraphControls } from './graph/GraphControls';
import { GraphStats } from './graph/GraphStats';
import { NodeDetailsPanel } from './graph/NodeDetailsPanel';
import { GraphEdges } from './graph/GraphEdges';
import { GraphDefs } from './graph/GraphDefs';

// Import layout utilities
import {
  createSpiralLayout,
  createDonutLayout,
  createCircularLayout,
  createForceLayout,
  getInitialZoomScale
} from '../utils/graphLayout';

interface GraphProps {
  data: GraphData;
  width?: number;
  height?: number;
  autoLayout?: 'circular' | 'force' | 'tree' | 'spiral' | 'donut';
  nodeSizeScale?: number;
  theme?: 'light' | 'dark';
}

/**
 * Main Graph component for visualizing nodes and their relationships
 */
export const Graph: React.FC<GraphProps> = ({
  data,
  width = 800,
  height = 600,
  autoLayout = 'circular',
  nodeSizeScale = 1,
  theme = 'light'
}) => {
  // Process incoming data
  const processedData = React.useMemo(() => {
    if (!data || !data.nodes || !Array.isArray(data.nodes)) {
      console.error('Invalid graph data format');
      return { nodes: [], edges: [], metadata: {} } as GraphData;
    }
    return data;
  }, [data]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<SVGSVGElement>(null);
  const transformGroupRef = useRef<SVGGElement>(null);

  // State
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<{
    nodes: Set<string>;
    edges: Set<string>;
  }>({ nodes: new Set(), edges: new Set() });
  const [containerSize, setContainerSize] = useState({ width, height });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({ width: 5000, height: 5000 });
  const [expandingNode, setExpandingNode] = useState<string | null>(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = rect.width || width;
        const newHeight = rect.height || height;

        setContainerSize({
          width: newWidth,
          height: newHeight
        });

        // Significantly increase the viewport size to allow for nodes dragged far away
        setViewportSize({
          width: Math.max(newWidth * 5, 5000),
          height: Math.max(newHeight * 5, 5000)
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height]);

  // Handle node position changes
  const handleNodePositionChange = useCallback((id: string, newPosition: { x: number; y: number }) => {
    setNodePositions(prev => ({
      ...prev,
      [id]: newPosition
    }));
  }, []);

  // Find connected nodes
  const findConnectedNodes = useCallback((nodeId: string) => {
    const connectedNodes = new Set<string>();
    const connectedEdges = new Set<string>();

    connectedNodes.add(nodeId);

    processedData.edges.forEach((edge) => {
      if (edge.source === nodeId || edge.target === nodeId) {
        connectedEdges.add(`${edge.source}-${edge.target}`);
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }
    });

    return { nodes: connectedNodes, edges: connectedEdges };
  }, [processedData.edges]);

  // Node click handler
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    const { nodes, edges } = findConnectedNodes(node.id);
    setHighlightedPath({ nodes, edges });
  }, [findConnectedNodes]);

  // Show node dependencies
  const handleShowDependencies = useCallback((node: GraphNode) => {
    const dependencies = new Set<string>();
    const dependencyEdges = new Set<string>();

    processedData.edges.forEach((edge) => {
      if (edge.target === node.id) {
        dependencies.add(edge.source);
        dependencyEdges.add(`${edge.source}-${edge.target}`);
      }
    });

    setHighlightedPath({
      nodes: new Set([node.id, ...dependencies]),
      edges: dependencyEdges,
    });
  }, [processedData.edges]);

  // Show node dependents
  const handleShowDependents = useCallback((node: GraphNode) => {
    const dependents = new Set<string>();
    const dependentEdges = new Set<string>();

    processedData.edges.forEach((edge) => {
      if (edge.source === node.id) {
        dependents.add(edge.target);
        dependentEdges.add(`${edge.source}-${edge.target}`);
      }
    });

    setHighlightedPath({
      nodes: new Set([node.id, ...dependents]),
      edges: dependentEdges,
    });
  }, [processedData.edges]);

  // Edge click handler
  const handleEdgeClick = useCallback((edge: Edge) => {
    setHighlightedPath({
      nodes: new Set([edge.source, edge.target]),
      edges: new Set([`${edge.source}-${edge.target}`]),
    });
  }, []);

  // Background click handler
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedNode(null);
      setHighlightedPath({ nodes: new Set(), edges: new Set() });
    }
  }, []);

  // Node display utilities
  const getNodeDisplayName = useCallback((node: GraphNode) => {
    return node.name || node.title || `Node ${node.id}`;
  }, []);

  const getNodeDisplayType = useCallback((node: GraphNode) => {
    return node.type || 'unknown';
  }, []);

  const getNodeDisplayPath = useCallback((node: GraphNode) => {
    return node.filepath || node.metadata?.filePath || node.metadata?.path || '';
  }, []);

  // Calculate node statistics
  const nodeStats = React.useMemo(() => {
    const types = new Map<string, number>();

    processedData.nodes.forEach(node => {
      const type = getNodeDisplayType(node);
      types.set(type, (types.get(type) || 0) + 1);
    });

    return {
      total: processedData.nodes.length,
      types: Object.fromEntries(types.entries())
    };
  }, [processedData.nodes, getNodeDisplayType]);

  // Handle section toggle in node details panel
  const toggleSection = useCallback((sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Zoom and pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const svgRect = graphRef.current?.getBoundingClientRect();
    if (!svgRect) return;

    const pointerX = e.clientX - svgRect.left;
    const pointerY = e.clientY - svgRect.top;

    // Make zooming more gradual
    const delta = e.deltaY * -0.005;
    const newScale = Math.min(Math.max(transform.scale + delta, 0.1), 5);
    const scaleFactor = newScale / transform.scale;

    const tx = pointerX - (pointerX - transform.x) * scaleFactor;
    const ty = pointerY - (pointerY - transform.y) * scaleFactor;

    setTransform({
      x: tx,
      y: ty,
      scale: newScale
    });
  }, [transform]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || 
        (e.target as HTMLElement).classList.contains('graph-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleResetView = useCallback(() => {
    const resetScale = getInitialZoomScale(processedData.nodes.length);
    const translateX = (containerSize.width / 2) - ((viewportSize.width / 2) * resetScale);
    const translateY = (containerSize.height / 2) - ((viewportSize.height / 2) * resetScale);
    
    setTransform({
      x: translateX,
      y: translateY,
      scale: resetScale
    });
  }, [containerSize, viewportSize, processedData.nodes.length]);

  const handleZoomIn = useCallback(() => {
    setTransform(prev => {
      const newScale = Math.min(prev.scale + 0.2, 5);
      return {
        ...prev,
        scale: newScale
      };
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform(prev => {
      const newScale = Math.max(prev.scale - 0.2, 0.1);
      return {
        ...prev,
        scale: newScale
      };
    });
  }, []);

  // Layout calculation for nodes
  useEffect(() => {
    if (!processedData.nodes || processedData.nodes.length === 0) return;
  
    const nodeCount = processedData.nodes.length;
  
    // Calculate available space and center
    const availableWidth = viewportSize.width * 0.6;
    const availableHeight = viewportSize.height * 0.6;
    const center = { 
      x: viewportSize.width / 2, 
      y: viewportSize.height / 2
    };
  
    let positions: Record<string, { x: number; y: number }> = {};
    const actualLayout = nodeCount > 50 && autoLayout === 'circular' ? 'donut' : autoLayout;
  
    // Choose layout algorithm based on configuration
    if (actualLayout === 'circular') {
      positions = createCircularLayout(
        processedData.nodes,
        center,
        { width: availableWidth, height: availableHeight }
      );
    } else if (actualLayout === 'tree') {
      // Fall back to circular layout
      positions = createCircularLayout(
        processedData.nodes,
        center,
        { width: availableWidth, height: availableHeight }
      );
    } else if (actualLayout === 'spiral') {
      positions = createSpiralLayout(
        processedData.nodes,
        center,
        { width: availableWidth, height: availableHeight }
      );
    } else if (actualLayout === 'donut') {
      positions = createDonutLayout(
        processedData.nodes,
        center,
        { width: availableWidth, height: availableHeight }
      );
    } else {
      positions = createForceLayout(
        processedData.nodes,
        center,
        { width: availableWidth, height: availableHeight }
      );
    }
  
    setNodePositions(positions);
  
    // Set initial transform to show all nodes at once
    if (transformGroupRef.current) {
      const initialScale = getInitialZoomScale(nodeCount);
      
      // FIXED TRANSFORM CALCULATION:
      // We need to calculate how much to translate the viewport so that the center
      // of the graph (viewportSize/2) is positioned at the center of the container
      const translateX = (containerSize.width / 2) - ((viewportSize.width / 2) * initialScale);
      const translateY = (containerSize.height / 2) - ((viewportSize.height / 2) * initialScale);
                      
      setTransform({
        x: translateX,
        y: translateY,
        scale: initialScale
      });
    }
  }, [processedData.nodes, processedData.edges, viewportSize, autoLayout, containerSize]);
  
  // Also fix the handleResetView function to use the same calculation
  

  // Background styles
  const colors = theme === 'dark' 
    ? {
        background: 'bg-gray-900',
        backgroundPattern: 'radial-gradient(circle, #333 1px, transparent 1px)',
        text: 'text-white',
        textSecondary: 'text-gray-300',
        panel: 'bg-gray-800/90 border-gray-700',
      }
    : {
        background: 'bg-white',
        backgroundPattern: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
        text: 'text-gray-900',
        textSecondary: 'text-gray-600',
        panel: 'bg-white/90 border-gray-100',
      };

  // Implement handler functions for the new features

  // Focus the view on a specific node
  const handleFocusNode = useCallback((node: GraphNode) => {
    // Find the node position
    const nodePos = nodePositions[node.id];
    if (!nodePos) return;

    // Calculate the center transform to focus on this node
    // Instead of applying a scale factor to current scale, set a fixed zoom level
    const focusScale = 1.5;
    
    // Calculate the transform needed to center the node
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    
    // Calculate the necessary transform to position the node at the center
    const newX = centerX - (nodePos.x * focusScale);
    const newY = centerY - (nodePos.y * focusScale);
    
    // Apply the new transform
    setTransform({
      x: newX,
      y: newY,
      scale: focusScale
    });
    
    // Also select the node
    setSelectedNode(node);
  }, [nodePositions, containerSize]);

  // Open the source file of a node
  const handleOpenSourceFile = useCallback((node: GraphNode) => {
    const filePath = getNodeDisplayPath(node);
    if (!filePath) return;
    
    // Try multiple approaches to ensure maximum compatibility
    
    // 1. Dispatch a custom event that the parent application can listen for
    window.dispatchEvent(new CustomEvent('openSourceFile', { 
      detail: { filePath, node }
    }));
    
    // 2. Try to use parent window postMessage for iframe scenarios
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'openSourceFile',
          data: { filePath, node }
        }, '*');
      }
    } catch (e) {
      console.error('Failed to post message to parent:', e);
    }
    
    // 3. Try to use localStorage event for cross-window communication
    try {
      localStorage.setItem('digramaatic_openSourceFile', JSON.stringify({
        filePath,
        nodeId: node.id,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Failed to use localStorage:', e);
    }
    
    console.log('Request to open source file:', filePath);
  }, [getNodeDisplayPath]);

  // Reveal the file in the file tree
  const handleRevealInFileTree = useCallback((node: GraphNode) => {
    const filePath = getNodeDisplayPath(node);
    if (!filePath) return;
    
    // Try multiple approaches to ensure maximum compatibility
    
    // 1. Dispatch a custom event that the parent application can listen for
    window.dispatchEvent(new CustomEvent('revealInFileTree', { 
      detail: { filePath, node }
    }));
    
    // 2. Try to use parent window postMessage for iframe scenarios
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'revealInFileTree',
          data: { filePath, node }
        }, '*');
      }
    } catch (e) {
      console.error('Failed to post message to parent:', e);
    }
    
    // 3. Try to use localStorage event for cross-window communication
    try {
      localStorage.setItem('digramaatic_revealInFileTree', JSON.stringify({
        filePath,
        nodeId: node.id,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Failed to use localStorage:', e);
    }
    
    console.log('Request to reveal in file tree:', filePath);
  }, [getNodeDisplayPath]);

  // Expand the graph to show more direct children of a node
  const handleExpandNode = useCallback((node: GraphNode) => {
    // Show loading animation on the expanding node
    setExpandingNode(node.id);
    
    // Try multiple approaches to ensure maximum compatibility
    
    // 1. Dispatch a custom event that the parent application can listen for
    window.dispatchEvent(new CustomEvent('expandNode', { 
      detail: { nodeId: node.id, node }
    }));
    
    // 2. Try to use parent window postMessage for iframe scenarios
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'expandNode',
          data: { nodeId: node.id, node }
        }, '*');
      }
    } catch (e) {
      console.error('Failed to post message to parent:', e);
    }
    
    // 3. Try to use localStorage event for cross-window communication
    try {
      localStorage.setItem('digramaatic_expandNode', JSON.stringify({
        nodeId: node.id,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.error('Failed to use localStorage:', e);
    }
    
    console.log('Request to expand node:', node.id);
    
    // Keep track of newly added nodes that don't already exist in the current view
    const newNodeIds = new Set<string>();
    const newEdgeKeys = new Set<string>();
    const childEdges = new Set<string>();
    
    // Find all direct children (nodes that this node has edges to)
    processedData.edges.forEach((edge) => {
      if (edge.source === node.id) {
        // Add the target node and edge to our tracking sets
        childEdges.add(`${edge.source}-${edge.target}`);
        
        // Only add to newNodeIds if the node doesn't already have a position
        // This ensures we only expand to show NEW nodes
        if (!nodePositions[edge.target] || 
            (nodePositions[edge.target].x === 0 && nodePositions[edge.target].y === 0)) {
          newNodeIds.add(edge.target);
          newEdgeKeys.add(`${edge.source}-${edge.target}`);
        }
      }
    });
    
    // Check node metadata for any additional dependencies that might not be in edges
    if (node.metadata) {
      // Check for outgoing dependencies
      if (node.metadata.outgoingDependencies && Array.isArray(node.metadata.outgoingDependencies)) {
        node.metadata.outgoingDependencies.forEach((dep: string) => {
          // Find matching node for this dependency
          const dependentNode = processedData.nodes.find(n => 
            n.id === dep || 
            n.name === dep || 
            n.title === dep || 
            n.metadata?.fullName === dep);
          
          if (dependentNode) {
            childEdges.add(`${node.id}-${dependentNode.id}`);
            
            // Only add to newNodeIds if the node doesn't already have a position
            if (!nodePositions[dependentNode.id] || 
                (nodePositions[dependentNode.id].x === 0 && nodePositions[dependentNode.id].y === 0)) {
              newNodeIds.add(dependentNode.id);
              newEdgeKeys.add(`${node.id}-${dependentNode.id}`);
            }
          }
        });
      }
      
      // Check for imports (common in TypeScript/JavaScript components)
      if (node.metadata.imports && Array.isArray(node.metadata.imports)) {
        node.metadata.imports.forEach((imp: any) => {
          const importName = typeof imp === 'string' ? imp : imp.name || imp.path;
          if (!importName) return;
          
          // Find matching node for this import
          const importedNode = processedData.nodes.find(n => 
            n.id === importName || 
            n.name === importName || 
            n.title === importName || 
            (n.metadata?.filePath && importName.includes(n.metadata.filePath)));
          
          if (importedNode) {
            childEdges.add(`${node.id}-${importedNode.id}`);
            
            // Only add to newNodeIds if the node doesn't already have a position
            if (!nodePositions[importedNode.id] || 
                (nodePositions[importedNode.id].x === 0 && nodePositions[importedNode.id].y === 0)) {
              newNodeIds.add(importedNode.id);
              newEdgeKeys.add(`${node.id}-${importedNode.id}`);
            }
          }
        });
      }
    }
    
    if (newNodeIds.size > 0) {
      // Get the node's current position as anchor
      const nodePos = nodePositions[node.id] || { x: 0, y: 0 };
      
      // Only proceed if we have a valid position for the source node
      if (nodePos.x !== 0 || nodePos.y !== 0) {
        // Create positions for the new nodes in a circle around the source node
        const newPositions = { ...nodePositions };
        
        // Radius for placing new nodes
        const radius = 200;
        
        // Calculate positions for the newly revealed nodes in a circular arrangement
        const nodesToPlaceArray = Array.from(newNodeIds);
        const angleStep = (2 * Math.PI) / Math.max(nodesToPlaceArray.length, 1);
        
        // Start angle - for just one node, place it to the right
        // For multiple nodes, distribute evenly around the source
        let startAngle = 0;
        if (nodesToPlaceArray.length === 1) {
          startAngle = 0; // Place to the right
        } else if (nodesToPlaceArray.length === 2) {
          startAngle = -Math.PI / 2; // Start from bottom
        } else {
          startAngle = -Math.PI / 2; // Start from bottom for 3+ nodes
        }
        
        nodesToPlaceArray.forEach((id, index) => {
          const angle = startAngle + index * angleStep;
          newPositions[id] = {
            x: nodePos.x + radius * Math.cos(angle),
            y: nodePos.y + radius * Math.sin(angle)
          };
        });
        
        // Update the node positions
        setNodePositions(newPositions);
        
        // Log feedback
        console.log(`Added ${newNodeIds.size} new dependencies for node: ${node.name || node.title || node.id}`);
      }
    }
    
    // Update highlighted path to include this node and its immediate outgoing connections
    // This makes the newly added connections more visible without changing the full graph view
    setHighlightedPath({
      nodes: new Set([node.id, ...childEdges.values()].filter(id => typeof id === 'string')),
      edges: childEdges,
    });
    
    // Select the node
    setSelectedNode(node);
    
    // Hide loading animation after everything is done
    setTimeout(() => setExpandingNode(null), 500);
  }, [processedData.edges, processedData.nodes, nodePositions]);

  // Go to the parent(s) of a node
  const handleGoToParent = useCallback((node: GraphNode) => {
    // Find all direct parents (nodes that have edges to this node)
    const parents = new Set<string>();
    const parentEdges = new Set<string>();

    processedData.edges.forEach((edge) => {
      if (edge.target === node.id) {
        parents.add(edge.source);
        parentEdges.add(`${edge.source}-${edge.target}`);
      }
    });

    // Update highlighted path to include this node and all direct parents
    setHighlightedPath({
      nodes: new Set([node.id, ...parents]),
      edges: parentEdges,
    });
    
    // If there's only one parent, select it
    if (parents.size === 1) {
      const parentId = Array.from(parents)[0];
      const parentNode = processedData.nodes.find(n => n.id === parentId);
      if (parentNode) {
        setSelectedNode(parentNode);
      }
    }
  }, [processedData.edges, processedData.nodes]);

  // Copy the import path of a node to clipboard
  const handleCopyImportPath = useCallback((node: GraphNode) => {
    const filePath = getNodeDisplayPath(node);
    if (!filePath) {
      console.log('No file path available for this node');
      return;
    }
    
    // Format the import path
    let importPath = filePath;
    
    // Remove file extension if exists
    importPath = importPath.replace(/\.(tsx|ts|jsx|js|java|py)$/, '');
    
    // Handle directory separator normalization
    importPath = importPath.replace(/\\/g, '/');
    
    // Remove leading slash if exists
    if (importPath.startsWith('/')) {
      importPath = importPath.substring(1);
    }
    
    // Format based on likely project structure
    if (importPath.includes('/src/')) {
      // For projects that use src directory structure:
      // - handle 'src/components/Button.tsx' -> '@/components/Button'
      importPath = '@/' + importPath.split('/src/')[1]; 
    } else if (importPath.includes('/app/') || importPath.includes('/pages/')) {
      // For Next.js projects:
      // - handle 'app/page.tsx' -> '@/app/page'
      // - handle 'pages/index.tsx' -> '@/pages/index'
      const segments = importPath.split('/');
      const appOrPagesIndex = segments.findIndex((s: string) => s === 'app' || s === 'pages');
      if (appOrPagesIndex >= 0) {
        importPath = '@/' + segments.slice(appOrPagesIndex).join('/');
      }
    } else if (importPath.includes('/packages/') || importPath.includes('/libs/')) {
      // For monorepo structures:
      // - handle 'packages/ui/Button.tsx' -> '@org/ui/Button'
      const segments = importPath.split('/');
      const packageIndex = segments.findIndex((s: string) => s === 'packages' || s === 'libs');
      if (packageIndex >= 0 && segments.length > packageIndex + 1) {
        importPath = '@org/' + segments.slice(packageIndex + 1).join('/');
      }
    }
    
    // Copy to clipboard
    try {
      navigator.clipboard.writeText(importPath)
        .then(() => {
          // Show visual feedback
          console.log('Import path copied to clipboard:', importPath);
          
          // Create a temporary visual feedback element
          const feedbackEl = document.createElement('div');
          feedbackEl.textContent = `Copied: ${importPath}`;
          feedbackEl.style.position = 'fixed';
          feedbackEl.style.bottom = '20px';
          feedbackEl.style.left = '50%';
          feedbackEl.style.transform = 'translateX(-50%)';
          feedbackEl.style.padding = '10px 20px';
          feedbackEl.style.background = theme === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
          feedbackEl.style.color = theme === 'dark' ? '#fff' : '#000';
          feedbackEl.style.borderRadius = '4px';
          feedbackEl.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
          feedbackEl.style.zIndex = '9999';
          feedbackEl.style.transition = 'opacity 0.3s ease-in-out';
          
          document.body.appendChild(feedbackEl);
          
          // Fade out and remove after 2 seconds
          setTimeout(() => {
            feedbackEl.style.opacity = '0';
            setTimeout(() => {
              if (document.body.contains(feedbackEl)) {
                document.body.removeChild(feedbackEl);
              }
            }, 300);
          }, 2000);
        })
        .catch(err => {
          console.error('Error copying to clipboard:', err);
        });
    } catch (err) {
      console.error('Clipboard API not supported:', err);
      
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = importPath;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          console.log('Import path copied to clipboard (fallback):', importPath);
        } else {
          console.error('Failed to copy import path using execCommand');
        }
      } catch (err) {
        console.error('Error using execCommand to copy:', err);
      }
      
      document.body.removeChild(textArea);
    }
  }, [getNodeDisplayPath, theme]);

  // Add effect to reset highlighted paths when graph data changes
  useEffect(() => {
    // Reset highlightedPath and selectedNode when processedData changes
    // This prevents dangling arrows when switching between full and focused views
    setHighlightedPath({ nodes: new Set(), edges: new Set() });
    setSelectedNode(null);
    
    // Reset positions for nodes that no longer exist in the data
    setNodePositions(prevPositions => {
      const currentNodeIds = new Set(processedData.nodes.map(node => node.id));
      const newPositions: Record<string, { x: number; y: number }> = {};
      
      // Only keep positions for nodes that still exist in the data
      Object.entries(prevPositions).forEach(([id, pos]) => {
        if (currentNodeIds.has(id)) {
          newPositions[id] = pos;
        }
      });
      
      return newPositions;
    });
  }, [processedData.nodes]);

  return (
    <div 
      ref={containerRef}
      className={`${colors.background} relative overflow-hidden w-full h-full rounded-lg`}
      style={{ minHeight: `${height}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg 
        ref={graphRef}
        className="absolute top-0 left-0 w-full h-full cursor-grab"
        style={{ 
          cursor: isPanning ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        onWheel={handleWheel}
        onClick={handleBackgroundClick}
      >
        <GraphDefs theme={theme} />
        
        <rect 
          className="graph-background"
          x="0" 
          y="0" 
          width={viewportSize.width} 
          height={viewportSize.height} 
          fill="url(#grid-pattern)" 
          transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}
        />
        
        <g 
          ref={transformGroupRef}
          transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}
        >
          {/* Render graph edges */}
          <GraphEdges 
            edges={processedData.edges}
            nodePositions={nodePositions}
            nodeSizeScale={nodeSizeScale}
            selectedNode={selectedNode}
            highlightedPath={highlightedPath}
            theme={theme}
            transform={transform}
            onEdgeClick={handleEdgeClick}
          />

          {/* Render graph nodes */}
          {processedData.nodes.map((node) => {
            const position = nodePositions[node.id] || { x: 0, y: 0 };

            if (position.x === 0 && position.y === 0) return null;

            // Remove position culling to allow nodes to be visible even when outside the viewport
            // When scrolling back to these areas, nodes will be visible again

            const isHighlighted = selectedNode?.id === node.id;
            const isPathHighlighted = highlightedPath.nodes.has(node.id);

            const displayName = getNodeDisplayName(node);
            const displayType = getNodeDisplayType(node);
            const displayPath = getNodeDisplayPath(node);

            return (
              <foreignObject
                key={`node-${node.id}`}
                x={position.x - (180 * nodeSizeScale / 2)}
                y={position.y - (180 * nodeSizeScale / 2)}
                width={180 * nodeSizeScale}
                height={180 * nodeSizeScale}
                className="overflow-visible"
              >
                <GraphNodeComponent
                  node={{
                    ...node,
                    name: displayName,
                    type: displayType,
                    filepath: displayPath
                  }}
                  position={{ x: 180 * nodeSizeScale / 2, y: 180 * nodeSizeScale / 2 }}
                  onPositionChange={(id, newPos) => {
                    const graphPos = {
                      x: position.x + (newPos.x - (180 * nodeSizeScale / 2)),
                      y: position.y + (newPos.y - (180 * nodeSizeScale / 2))
                    };
                    handleNodePositionChange(id, graphPos);
                  }}
                  isHighlighted={isHighlighted}
                  isPathHighlighted={isPathHighlighted}
                  onNodeClick={handleNodeClick}
                  onShowDependencies={handleShowDependencies}
                  onShowDependents={handleShowDependents}
                  sizeScale={nodeSizeScale}
                  theme={theme}
                  totalNodesInView={processedData.nodes.length}
                  isInteractive={true}
                  zoomScale={transform.scale}
                  onFocusNode={handleFocusNode}
                  onOpenSourceFile={handleOpenSourceFile}
                  onRevealInFileTree={handleRevealInFileTree}
                  onExpandNode={handleExpandNode}
                  onGoToParent={handleGoToParent}
                  onCopyImportPath={handleCopyImportPath}
                  expandingNode={expandingNode}
                />
              </foreignObject>
            );
          })}
        </g>
      </svg>

      {/* Control panel */}
      <GraphControls 
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetView={handleResetView}
        theme={theme}
      />

      {/* Stats panel */}
      <GraphStats
        nodeStats={nodeStats}
        data={processedData}
        transform={transform}
        theme={theme}
      />

      {/* Node details panel */}
      <NodeDetailsPanel
        node={selectedNode}
        position={selectedNode && nodePositions[selectedNode.id] 
          ? nodePositions[selectedNode.id] 
          : null}
        containerSize={containerSize}
        theme={theme}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        onShowDependencies={handleShowDependencies}
        onShowDependents={handleShowDependents}
        onClose={() => setSelectedNode(null)}
        getNodeDisplayName={getNodeDisplayName}
        getNodeDisplayType={getNodeDisplayType}
        getNodeDisplayPath={getNodeDisplayPath}
      />
    </div>
  );
};

export default Graph;