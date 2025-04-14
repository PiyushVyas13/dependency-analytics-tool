import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Node } from '../../types/graph';
import { useDragHandler } from '../../hooks/useDragHandler';
import { getNodeColor } from '../../utils/graph/nodeStyles';
import { NodeIcon } from './NodeIcon';
import { NodeTooltip } from './NodeTooltip';
import { NodeMenu } from './NodeMenu';
import { NodeInlineDetails } from './NodeInlineDetails';

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
  onFocusNode?: (node: Node) => void;
  onOpenSourceFile?: (node: Node) => void;
  onRevealInFileTree?: (node: Node) => void;
  onExpandNode?: (node: Node) => void;
  onGoToParent?: (node: Node) => void;
  onCopyImportPath?: (node: Node) => void;
  expandingNode?: string | null;
}

/**
 * Main Graph Node component that represents a node in the graph visualization
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
  onFocusNode,
  onOpenSourceFile,
  onRevealInFileTree,
  onExpandNode,
  onGoToParent,
  onCopyImportPath,
  expandingNode = null
}) => {
  // State
  const [showMenu, setShowMenu] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  
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

  // Handle context menu (right click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Close dropdown menu if open
    setShowMenu(false);
    setShowContextMenu(false); // Ensure context menu is closed before showing a new one
    
    // Get the exact cursor position
    const x = e.clientX;
    const y = e.clientY;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Menu dimensions (approximate)
    const menuWidth = 200;
    const menuHeight = 350; // Approximation based on all menu items
    
    // Adjust position to keep menu in viewport
    let adjustedX = x;
    let adjustedY = y;
    
    // If menu would extend beyond right edge
    if (x + menuWidth > viewportWidth) {
      adjustedX = viewportWidth - menuWidth - 10; // Keep 10px margin
    }
    
    // If menu would extend beyond bottom edge
    if (y + menuHeight > viewportHeight) {
      adjustedY = viewportHeight - menuHeight - 10; // Keep 10px margin
    }
    
    // Ensure position is never negative
    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);
    
    // Set the position and show the context menu
    // Adding a small delay prevents the immediate click-away from the document listener
    setTimeout(() => {
      setContextMenuPosition({ x: adjustedX, y: adjustedY });
      setShowContextMenu(true);
    }, 0);
  };

  // Handle menu toggle
  const handleMenuClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
    setShowTooltip(false);
    // Close context menu if open
    setShowContextMenu(false);
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

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleDocumentClick = () => {
      if (showContextMenu) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [showContextMenu]);

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
    
    setTooltipPosition({ x: position.x + nodeWidth / 2, y: position.y - 20 });
  }, [position.x, position.y, sizeScale, totalNodesInView]);

  // Calculate visual properties
  const isDark = theme === 'dark';
  const baseNodeWidth = 180;
  const sizeAdjustment = totalNodesInView > 50 ? Math.max(0.7, 1 - (totalNodesInView / 300)) : 1;
  const nodeWidth = baseNodeWidth * sizeScale * sizeAdjustment;
  
  // Check if this node is currently expanding
  const isExpanding = expandingNode === node.id;
  const pulseAnimation = isExpanding ? 'animate-pulse' : '';
  
  // Get display values from node
  const displayName = node.name || node.title || `Node ${node.id}`;
  const displayType = node.type || 'unknown';
  
  // Process filepath for display
  const displayPath = (() => {
    const path = node.filepath || '';
    if (!path) return '';
    return path.length > 25 ? '...' + path.substring(path.length - 25) : path;
  })();

  // Generate styles
  const highlightStyle = isHighlighted
    ? `ring-4 ${isDark ? 'ring-blue-500/70' : 'ring-blue-500'} scale-110 z-20`
    : isPathHighlighted
    ? `ring-2 ${isDark ? 'ring-green-500/70' : 'ring-green-500'} z-10`
    : '';

  const nodeColor = getNodeColor(displayType, theme);
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
      ref={nodeRef}
      className={`absolute p-3 rounded-lg border-2 ${nodeColor} ${shadowStyle} transition-all duration-200 ${isInteractive ? 'cursor-pointer' : 'cursor-default'} select-none
      ${highlightStyle} ${dragStyle} pointer-events-auto ${pulseAnimation}`}
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        width: `${nodeWidth}px`,
        zIndex: isDragging || showMenu || isHighlighted ? 50 : isPathHighlighted ? 5 : 1,
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleNodeClick}
      onContextMenu={handleContextMenu}
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

      {/* Dropdown Menu */}
      <NodeMenu 
        node={node}
        show={showMenu}
        theme={theme}
        onShowDetails={onNodeClick || (() => {})}
        onShowDependencies={onShowDependencies || (() => {})}
        onShowDependents={onShowDependents || (() => {})}
        onClose={() => setShowMenu(false)}
        onFocusNode={onFocusNode}
        onOpenSourceFile={onOpenSourceFile}
        onRevealInFileTree={onRevealInFileTree}
        onExpandNode={onExpandNode}
        onGoToParent={onGoToParent}
        onCopyImportPath={onCopyImportPath}
      />

      {/* Context Menu (Right Click) */}
      <NodeMenu 
        node={node}
        show={showContextMenu}
        theme={theme}
        onShowDetails={onNodeClick || (() => {})}
        onShowDependencies={onShowDependencies || (() => {})}
        onShowDependents={onShowDependents || (() => {})}
        onClose={() => setShowContextMenu(false)}
        onFocusNode={onFocusNode}
        onOpenSourceFile={onOpenSourceFile}
        onRevealInFileTree={onRevealInFileTree}
        onExpandNode={onExpandNode}
        onGoToParent={onGoToParent}
        onCopyImportPath={onCopyImportPath}
        position="contextmenu"
        contextMenuPosition={contextMenuPosition}
      />

      {/* Inline Details for small graphs */}
      <NodeInlineDetails
        node={node}
        nodeWidth={nodeWidth}
        theme={theme}
        show={totalNodesInView <= 3}
      />

      {/* Tooltip for hovering on larger graphs */}
      <NodeTooltip
        node={node}
        position={tooltipPosition}
        show={showTooltip && totalNodesInView > 3}
        theme={theme}
      />
    </div>
  );
}; 