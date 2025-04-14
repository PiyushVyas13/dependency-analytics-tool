// src/components/GraphNode.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FileCode, Package, Box, Code, MoreHorizontal, Info, GitFork, X, ArrowUpRight, ArrowDownRight, File, FileText, Component, Database, FolderTree } from 'lucide-react';
import { Node } from '../types/graph';

interface GraphNodeProps {
  node: Node;
  position: { x: number; y: number };
  onPositionChange: (id: string, position: { x: number; y: number }) => void;
  isHighlighted?: boolean;
  isPathHighlighted?: boolean;
  onNodeClick?: (node: Node) => void;
  onShowDependencies?: (node: Node) => void;
  onShowDependents?: (node: Node) => void;
  sizeScale?: number;
  theme?: 'light' | 'dark';
  totalNodesInView: number;
  isInteractive?: boolean;
  zoomScale?: number;
  expandingNode?: string | null;
}

// Extracted helper components and functions

/**
 * Get the appropriate icon based on node type
 */
const NodeIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type.toLowerCase()) {
    case 'component':
      return <Component className="w-5 h-5" />;
    case 'hook':
      return <GitFork className="w-5 h-5" />;
    case 'service':
      return <Code className="w-5 h-5" />;
    case 'context':
      return <Box className="w-5 h-5" />;
    case 'module':
      return <Package className="w-5 h-5" />;
    case 'class':
      return <FileCode className="w-5 h-5" />;
    case 'file':
      return <FileText className="w-5 h-5" />;
    case 'model':
      return <Database className="w-5 h-5" />;
    case 'app':
      return <FolderTree className="w-5 h-5" />;
    case 'view':
      return <Component className="w-5 h-5" />;
    default:
      return <File className="w-5 h-5" />;
  }
};

/**
 * Get the node color scheme based on its type
 */
const getNodeColor = (type: string, theme: 'light' | 'dark') => {
  const isDark = theme === 'dark';
  
  switch (type.toLowerCase()) {
    case 'component':
      return isDark 
        ? 'bg-blue-900/40 border-blue-600 text-blue-50' 
        : 'bg-blue-50 border-blue-500 text-blue-800';
    case 'hook':
      return isDark 
        ? 'bg-purple-900/40 border-purple-600 text-purple-50' 
        : 'bg-purple-50 border-purple-500 text-purple-800';
    case 'service':
      return isDark 
        ? 'bg-green-900/40 border-green-600 text-green-50' 
        : 'bg-green-50 border-green-500 text-green-800';
    case 'context':
      return isDark 
        ? 'bg-yellow-900/40 border-yellow-600 text-yellow-50' 
        : 'bg-yellow-50 border-yellow-500 text-yellow-800';
    case 'module':
      return isDark 
        ? 'bg-orange-900/40 border-orange-600 text-orange-50' 
        : 'bg-orange-50 border-orange-500 text-orange-800';
    case 'class':
      return isDark 
        ? 'bg-green-900/40 border-green-600 text-green-50' 
        : 'bg-green-50 border-green-500 text-green-800';
    case 'file':
      return isDark 
        ? 'bg-orange-900/40 border-orange-600 text-orange-50'
        : 'bg-orange-50 border-orange-500 text-orange-800';
    case 'model':
      return isDark 
        ? 'bg-indigo-900/40 border-indigo-600 text-indigo-50' 
        : 'bg-indigo-50 border-indigo-500 text-indigo-800';
    case 'app':
      return isDark 
        ? 'bg-red-900/40 border-red-600 text-red-50' 
        : 'bg-red-50 border-red-500 text-red-800';
    case 'view':
      return isDark 
        ? 'bg-sky-900/40 border-sky-600 text-sky-50' 
        : 'bg-sky-50 border-sky-500 text-sky-800';
    default:
      return isDark 
        ? 'bg-gray-900/40 border-gray-600 text-gray-50' 
        : 'bg-gray-50 border-gray-500 text-gray-800';
  }
};

/**
 * Node tooltip component showing detailed information on hover
 */
interface NodeTooltipProps {
  node: Node;
  position: { x: number; y: number };
  show: boolean;
  theme: 'light' | 'dark';
}

const NodeTooltip: React.FC<NodeTooltipProps> = ({ node, position, show, theme }) => {
  if (!show) return null;

  return (
    <div
      className={`absolute z-10 rounded-md shadow-lg p-3 pointer-events-none ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        width: '280px',
        maxHeight: '300px',
        overflow: 'auto',
        display: show ? 'block' : 'none'
      }}
    >
      <div className="font-bold mb-1">{node.title || node.name}</div>
      <div className={`text-xs inline-block px-2 py-0.5 rounded-full mb-2 ${
        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        {node.type}
      </div>
        
      {node.sections && node.sections.map((section, index) => (
        <div key={section.id} className={index > 0 ? 'mt-2' : ''}>
          <div className="font-semibold text-sm border-b border-gray-600 mb-1">{section.name}</div>
          {section.items.length > 0 && (
            <ul className="pl-2">
              {section.items.slice(0, 5).map(item => (
                <li key={item.id} className="text-xs truncate">{item.value}</li>
              ))}
              {section.items.length > 5 && (
                <li className="text-xs text-gray-500">+{section.items.length - 5} more...</li>
              )}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Node context menu component
 */
interface NodeMenuProps {
  node: Node;
  show: boolean;
  theme: 'light' | 'dark';
  onShowDetails: (node: Node) => void;
  onShowDependencies: (node: Node) => void;
  onShowDependents: (node: Node) => void;
  onClose: () => void;
}

const NodeMenu: React.FC<NodeMenuProps> = ({ 
  node, 
  show, 
  theme, 
  onShowDetails,
  onShowDependencies,
  onShowDependents,
  onClose 
}) => {
  if (!show) return null;
  
  const isDark = theme === 'dark';
  
  return (
    <div 
      className={`absolute right-0 top-full mt-1 ${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } rounded-lg shadow-lg border py-1 w-48 z-50 node-menu`}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        className={`w-full px-3 py-2 text-left text-sm ${
          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
        } flex items-center gap-2`}
        onClick={(e) => {
          e.stopPropagation();
          onShowDetails(node);
          onClose();
        }}
      >
        <Info className="w-4 h-4" />
        View Details
      </button>
      <button 
        className={`w-full px-3 py-2 text-left text-sm ${
          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
        } flex items-center gap-2`}
        onClick={(e) => {
          e.stopPropagation();
          onShowDependencies(node);
          onClose();
        }}
      >
        <ArrowDownRight className="w-4 h-4" />
        Show Dependencies
      </button>
      <button 
        className={`w-full px-3 py-2 text-left text-sm ${
          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
        } flex items-center gap-2`}
        onClick={(e) => {
          e.stopPropagation();
          onShowDependents(node);
          onClose();
        }}
      >
        <ArrowUpRight className="w-4 h-4" />
        Show Dependents
      </button>
      <button 
        className={`w-full px-3 py-2 text-left text-sm ${
          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
        } flex items-center gap-2`}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="w-4 h-4" />
        Close Menu
      </button>
    </div>
  );
};

/**
 * Node inline details component shown for graphs with few nodes
 */
interface NodeInlineDetailsProps {
  node: Node;
  nodeWidth: number;
  theme: 'light' | 'dark';
  show: boolean;
}

const NodeInlineDetails: React.FC<NodeInlineDetailsProps> = ({ node, nodeWidth, theme, show }) => {
  if (!show || !node.sections || node.sections.length === 0) return null;
  
  return (
    <foreignObject
      x={-nodeWidth / 2}
      y={nodeWidth / 2 + 10}
      width={nodeWidth}
      height={nodeWidth * 3}
      overflow="visible"
      className="pointer-events-none"
    >
      <div 
        className={`rounded-md border overflow-auto max-h-60 text-xs p-2 ${
          theme === 'dark' 
            ? 'bg-gray-800 border-gray-700 text-gray-200' 
            : 'bg-white border-gray-300 text-gray-700'
        }`}
      >
        {node.sections.map((section, index) => (
          <div key={section.id} className={index > 0 ? 'mt-2' : ''}>
            <div className="font-semibold">{section.name}</div>
            {section.items.length > 0 && (
              <ul className="pl-2 mt-1">
                {section.items.slice(0, 3).map(item => (
                  <li key={item.id} className="truncate">{item.value}</li>
                ))}
                {section.items.length > 3 && (
                  <li className="text-gray-500">+{section.items.length - 3} more...</li>
                )}
              </ul>
            )}
          </div>
        ))}
      </div>
    </foreignObject>
  );
};

/**
 * Core drag handler hook that manages node dragging functionality
 */
function useDragHandler(
  isInteractive: boolean,
  zoomScale: number,
  onPositionChange: (id: string, position: { x: number; y: number }) => void,
  nodeId: string
) {
  const [isDragging, setIsDragging] = useState(false);
  const dragThresholdRef = useRef(8); // Minimum pixel movement to start drag
  const nodePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    if (!isDragging || !isInteractive) return;

    // Mouse move handler that applies a direct 1:1 motion
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate delta from initial mouse position
      const deltaX = e.clientX - mousePositionRef.current.x;
      const deltaY = e.clientY - mousePositionRef.current.y;
      
      // Check if we've moved enough to start dragging
      if (!hasDraggedRef.current) {
        if (Math.abs(deltaX) > dragThresholdRef.current || 
            Math.abs(deltaY) > dragThresholdRef.current) {
          hasDraggedRef.current = true;
        } else {
          return; // Don't move yet
        }
      }

      // Calculate exact new position
      // Important: We use the original position as base and add the mouse delta
      // divided by zoom scale to create a natural 1:1 mouse movement
      const newX = nodePositionRef.current.x + (deltaX / zoomScale);
      const newY = nodePositionRef.current.y + (deltaY / zoomScale);

      // Update node position with the exact position
      onPositionChange(nodeId, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      hasDraggedRef.current = false;
      document.body.classList.remove('cursor-grabbing');
      
      // Remove global listeners when drag ends
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    // Add global event listeners for drag
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.classList.add('cursor-grabbing');

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('cursor-grabbing');
    };
  }, [isDragging, isInteractive, nodeId, onPositionChange, zoomScale]);

  // Start dragging process
  const startDrag = (e: React.MouseEvent, position: { x: number; y: number }) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Store initial positions
    nodePositionRef.current = position;
    mousePositionRef.current = { x: e.clientX, y: e.clientY };
    
    // Start dragging process
    hasDraggedRef.current = false;
    setIsDragging(true);
  };

  return { isDragging, startDrag };
}

/**
 * The main GraphNode component 
 */
export const GraphNode: React.FC<GraphNodeProps> = ({ 
  node, 
  position, 
  onPositionChange,
  isHighlighted = false,
  isPathHighlighted = false,
  onNodeClick,
  onShowDependencies,
  onShowDependents,
  sizeScale = 1,
  theme = 'light',
  totalNodesInView,
  isInteractive = true,
  zoomScale = 1,
  expandingNode = null,
}) => {
  // State
  const [showMenu, setShowMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Refs
  const nodeRef = useRef<HTMLDivElement>(null);
  const tooltipTimeoutRef = useRef<number | undefined>(undefined);

  // Use the drag handler hook
  const { isDragging, startDrag } = useDragHandler(
    isInteractive,
    zoomScale,
    onPositionChange,
    node.id
  );

  // Handle node click (when not dragging)
  const handleNodeClick = (e: React.MouseEvent) => {
    if (!isDragging && onNodeClick) {
      e.preventDefault();
      e.stopPropagation();
      onNodeClick(node);
    }
  };

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.node-menu') || !isInteractive) {
      return;
    }
    startDrag(e, position);
  };

  // Handle menu toggle
  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
    setShowTooltip(false);
  };

  // Tooltip show/hide handlers
  const handleMouseEnter = () => {
    if (totalNodesInView > 3) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Cleanup tooltip timeout
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Update tooltip position when node position changes
  useEffect(() => {
    const baseNodeWidth = 180;
    const sizeAdjustment = totalNodesInView > 50 ? Math.max(0.7, 1 - (totalNodesInView / 300)) : 1;
    const nodeWidth = baseNodeWidth * sizeScale * sizeAdjustment;
    
    // Only update tooltip position if the tooltip is shown
    if (showTooltip) {
      setTooltipPosition({ x: position.x + nodeWidth / 2, y: position.y - 20 });
    }
  }, [position.x, position.y, sizeScale, totalNodesInView, showTooltip]);

  // Calculate visual properties
  const isDark = theme === 'dark';
  const baseNodeWidth = 180;
  const baseFontSize = 14; // Define the base font size
  const sizeAdjustment = totalNodesInView > 50 ? Math.max(0.7, 1 - (totalNodesInView / 300)) : 1;
  const nodeWidth = baseNodeWidth * sizeScale * sizeAdjustment;
  
  // Check if this node is currently expanding
  const isExpanding = expandingNode === node.id;
  
  // Get display values from node
  const displayName = node.name || node.title || `Node ${node.id}`;
  const displayType = node.type || 'unknown';
  
  // Process filepath for display
  const displayPath = (() => {
    const path = node.filepath || '';
    if (!path) return '';
    return path.length > 25 ? '...' + path.substring(path.length - 25) : path;
  })();

  // Generate animation classes based on node state
  const pulseAnimation = isExpanding ? 'animate-pulse' : '';
  const borderAnimation = isExpanding ? 'border-2 shadow-lg' : 'border';

  // Generate styles
  const highlightStyle = isHighlighted
    ? `ring-4 ${isDark ? 'ring-blue-500/70' : 'ring-blue-500'} scale-110 z-20`
    : isPathHighlighted
    ? `ring-2 ${isDark ? 'ring-green-500/70' : 'ring-green-500'} z-10`
    : '';

  const nodeColor = getNodeColor(displayType || 'unknown', theme);
  const shadowStyle = isDark 
    ? isDragging 
      ? 'shadow-lg shadow-black/40' 
      : 'shadow-md shadow-black/30' 
    : isDragging 
      ? 'shadow-lg' 
      : 'shadow-md';
  const dragStyle = isDragging ? 'opacity-80 scale-105' : 'opacity-100';

  return (
    <div
      className={`absolute cursor-pointer transition-transform duration-300 ease-in-out ${pulseAnimation}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transformOrigin: 'center',
      }}
      ref={nodeRef}
      onClick={handleNodeClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Tooltip */}
      <NodeTooltip node={node} position={tooltipPosition} show={showTooltip} theme={theme} />
      
      {/* The node itself */}
      <div 
        className={`
          ${nodeColor} 
          ${highlightStyle}
          ${isPathHighlighted ? 'shadow-md ' + (theme === 'dark' ? 'shadow-blue-400/30' : 'shadow-blue-500/30') : ''}
          rounded-lg ${borderAnimation} flex items-center justify-between gap-2 transition-all
          ${shadowStyle} ${dragStyle}
          group
        `}
        style={{ 
          width: nodeWidth,
          fontSize: baseFontSize,
          padding: 10
        }}
        data-node-id={node.id}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <NodeIcon type={displayType} />
            <span className="font-medium text-sm truncate">{displayName}</span>
          </div>
          {isInteractive && (
            <button
              className={`p-1 rounded-full transition-colors node-menu
                ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
              onClick={handleMenuClick}
              aria-label="Node options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {displayPath && (
          <div className="text-xs opacity-70 mt-1 truncate">
            {displayPath}
          </div>
        )}
        
        <div className={`text-xs ${isDark ? 'bg-gray-800/50' : 'bg-white/50'} rounded px-2 py-1 mt-1`}>
          {displayType}
        </div>

        {/* Context Menu */}
        <NodeMenu 
          node={node}
          show={showMenu}
          theme={theme}
          onShowDetails={onNodeClick || (() => {})}
          onShowDependencies={onShowDependencies || (() => {})}
          onShowDependents={onShowDependents || (() => {})}
          onClose={() => setShowMenu(false)}
        />

        {/* Inline Details for small graphs */}
        <NodeInlineDetails
          node={node}
          nodeWidth={nodeWidth}
          theme={theme}
          show={totalNodesInView <= 3}
        />
      </div>
    </div>
  );
};