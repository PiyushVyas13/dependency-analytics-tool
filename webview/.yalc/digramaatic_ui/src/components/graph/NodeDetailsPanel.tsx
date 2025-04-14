import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowUpRight, ArrowDownRight, ChevronDown, ChevronRight } from 'lucide-react';
import { Node } from '../../types/graph';

interface NodeDetailsPanelProps {
  node: Node | null;
  position: { x: number; y: number } | null;
  containerSize: { width: number; height: number };
  theme: 'light' | 'dark';
  expandedSections: Set<string>;
  onToggleSection: (sectionId: string, e: React.MouseEvent) => void;
  onShowDependencies: (node: Node) => void;
  onShowDependents: (node: Node) => void;
  onClose: () => void;
  getNodeDisplayName: (node: Node) => string;
  getNodeDisplayType: (node: Node) => string;
  getNodeDisplayPath: (node: Node) => string;
}

export const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({
  node,
  position,
  containerSize,
  theme,
  expandedSections,
  onToggleSection,
  onShowDependencies,
  onShowDependents,
  onClose,
  getNodeDisplayName,
  getNodeDisplayType,
  getNodeDisplayPath
}) => {
  if (!node || !position) return null;

  // States for drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [panelPosition, setPanelPosition] = useState({
    x: Math.min(Math.max(position.x + 20, 20), containerSize.width - 370),
    y: Math.min(Math.max(position.y - 20, 20), containerSize.height - 300)
  });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Update panel position when node or position changes
  useEffect(() => {
    if (position && containerSize) {
      const panelWidth = 350; // Width of your panel
      const panelHeight = 400; // Approximate height, can be adjusted

      // Calculate available space in different directions
      const spaceRight = containerSize.width - position.x;
      const spaceLeft = position.x;
      const spaceBelow = containerSize.height - position.y;
      const spaceAbove = position.y;

      // Determine best position based on available space
      let x, y;

      // Horizontal positioning
      if (spaceRight >= panelWidth + 20) {
        // Enough space to the right, position next to the node
        x = position.x + 20; // Small gap from node
      } else if (spaceLeft >= panelWidth + 20) {
        // Not enough space right, but enough to the left
        x = position.x - panelWidth - 20;
      } else {
        // Not enough space on either side, center it
        x = Math.max(20, (containerSize.width - panelWidth) / 2);
      }

      // Vertical positioning
      if (spaceBelow >= panelHeight + 20) {
        // Enough space below, position under the node
        y = position.y + 20;
      } else if (spaceAbove >= panelHeight + 20) {
        // Not enough space below, but enough above
        y = position.y - panelHeight - 20;
      } else {
        // Not enough space above or below, position it in the middle
        y = Math.max(20, (containerSize.height - panelHeight) / 2);
      }

      // Apply position with safety bounds
      setPanelPosition({
        x: Math.min(Math.max(x, 20), containerSize.width - panelWidth - 20),
        y: Math.min(Math.max(y, 20), containerSize.height - panelHeight - 20)
      });

    }
  }, [position, containerSize]);

  // Handle mouse down event to start dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only initiate drag from the header
    if ((e.target as HTMLElement).closest('.panel-header')) {
      setIsDragging(true);

      // Calculate the offset of the mouse position relative to the panel position
      const rect = panelRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }

      // Prevent text selection while dragging
      e.preventDefault();
    }
  };

  // Handle mouse move event for dragging
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Calculate new position based on mouse coordinates and initial offset
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, containerSize.width - 350));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, containerSize.height - 300));

      setPanelPosition({ x: newX, y: newY });
    }
  };

  // Handle mouse up event to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove global event listeners for mouse move and up
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const colors = theme === 'dark'
    ? {
      panel: 'bg-gray-800 border-gray-700',
      text: 'text-white',
      secondaryBg: 'bg-gray-700',
      hoverBg: 'hover:bg-gray-700',
      sectionBg: 'bg-gray-700/50',
      sectionContentBg: 'bg-gray-800/50',
      itemBg: 'bg-gray-700/30',
      itemHoverBg: 'hover:bg-gray-700/50',
      border: 'border-gray-700'
    }
    : {
      panel: 'bg-white border-gray-200',
      text: 'text-gray-900',
      secondaryBg: 'bg-gray-100',
      hoverBg: 'hover:bg-gray-100',
      sectionBg: 'bg-gray-50',
      sectionContentBg: 'bg-white/50',
      itemBg: 'bg-gray-50/70',
      itemHoverBg: 'hover:bg-gray-100',
      border: 'border-gray-200'
    };

  return (
    <div
      ref={panelRef}
      className={`fixed z-50 ${colors.panel} backdrop-blur-md rounded-lg shadow-xl border max-h-[80vh] overflow-hidden flex flex-col w-[350px] transition-all duration-300 ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        left: panelPosition.x,
        top: panelPosition.y,
        userSelect: isDragging ? 'none' : 'auto'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={handleMouseDown}
    >
      <div className={`p-3 flex items-center justify-between border-b ${colors.border} panel-header ${!isDragging ? 'cursor-grab' : 'cursor-grabbing'}`}>
        <div className="flex items-center gap-2">
          {node.type && (
            <span className={`inline-block w-3 h-3 rounded-full`}
              style={{
                backgroundColor: node.type === 'component' ? '#3b82f6' :
                  node.type === 'hook' ? '#8b5cf6' :
                    node.type === 'context' ? '#eab308' :
                      node.type === 'class' ? '#22c55e' :
                        node.type === 'file' ? '#f97316' :
                          '#6b7280'
              }} />
          )}
          <h3 className="font-medium text-base">{getNodeDisplayName(node)}</h3>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-full ${colors.hoverBg}`}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2">
        <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${theme === 'dark' ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
          }`}>
          {getNodeDisplayType(node)}
        </div>

        {getNodeDisplayPath(node) && (
          <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} break-words`}>
            {getNodeDisplayPath(node)}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 pt-1">
        {node.sections && node.sections.length > 0 ? (
          node.sections.map(section => (
            <div
              key={section.id}
              className={`mb-2 rounded-lg ${colors.sectionBg} overflow-hidden`}
            >
              <button
                className={`w-full text-left p-2 flex items-center justify-between ${colors.itemHoverBg}`}
                onClick={(e) => onToggleSection(section.id, e)}
              >
                <span className="font-medium text-sm">{section.name}</span>
                {expandedSections.has(section.id) ?
                  <ChevronDown className="w-4 h-4" /> :
                  <ChevronRight className="w-4 h-4" />
                }
              </button>

              {expandedSections.has(section.id) && section.items.length > 0 && (
                <div className={`px-2 pb-2 ${colors.sectionContentBg}`}>
                  {section.items.map(item => (
                    <div
                      key={item.id}
                      className={`p-1.5 text-xs rounded my-1 flex items-start ${colors.itemBg} ${colors.itemHoverBg}`}
                    >
                      <div className={`rounded-full w-1.5 h-1.5 mt-1.5 mr-2 ${theme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'
                        }`}></div>
                      <span className="break-words">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} italic p-2`}>
            No additional details available
          </div>
        )}
      </div>

      <div className={`p-3 border-t ${colors.border}`}>
        <div className="flex gap-2 justify-between">
          <button
            onClick={() => onShowDependencies(node)}
            className={`text-xs flex-1 px-3 py-2 rounded flex items-center justify-center gap-1 ${theme === 'dark' ?
                'bg-gray-700 hover:bg-gray-600 text-white' :
                'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Dependencies
          </button>
          <button
            onClick={() => onShowDependents(node)}
            className={`text-xs flex-1 px-3 py-2 rounded flex items-center justify-center gap-1 ${theme === 'dark' ?
                'bg-gray-700 hover:bg-gray-600 text-white' :
                'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Dependents
          </button>
        </div>
      </div>
    </div>
  );
}; 