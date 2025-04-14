import React, { useMemo } from 'react';
import { Edge, Node } from '../../types/graph';
import { calculateNodeIntersection } from '../../utils/graph/edgeUtils';

interface GraphEdgesProps {
  edges: Edge[];
  nodePositions: Record<string, { x: number; y: number }>;
  nodeSizeScale: number;
  selectedNode: Node | null;
  highlightedPath: {
    nodes: Set<string>;
    edges: Set<string>;
  };
  theme: 'light' | 'dark';
  transform: { scale: number };
  onEdgeClick: (edge: Edge) => void;
}

export const GraphEdges: React.FC<GraphEdgesProps> = ({
  edges,
  nodePositions,
  nodeSizeScale,
  selectedNode,
  highlightedPath,
  theme,
  transform,
  onEdgeClick
}) => {
  // Filter valid edges - this is the key improvement to prevent dangling arrows
  const validEdges = useMemo(() => {
    return edges.filter(edge => {
      const sourcePos = nodePositions[edge.source];
      const targetPos = nodePositions[edge.target];
      
      // Only include edges where both source and target nodes have valid positions
      return sourcePos && targetPos && 
             sourcePos.x !== 0 && sourcePos.y !== 0 &&
             targetPos.x !== 0 && targetPos.y !== 0;
    });
  }, [edges, nodePositions]);

  // Return early if no valid edges
  if (validEdges.length === 0) {
    return null;
  }

  return (
    <>
      {validEdges.map((edge) => {
        const sourcePos = nodePositions[edge.source];
        const targetPos = nodePositions[edge.target];

        // This should never happen due to our filtering, but added as a safeguard
        if (!sourcePos || !targetPos || 
          (sourcePos.x === 0 && sourcePos.y === 0) || 
          (targetPos.x === 0 && targetPos.y === 0)) {
          return null;
        }

        const isHighlighted = selectedNode && 
          (selectedNode.id === edge.source || selectedNode.id === edge.target);
        const isPathHighlighted = highlightedPath.edges.has(`${edge.source}-${edge.target}`);

        const angle = Math.atan2(targetPos.y - sourcePos.y, targetPos.x - sourcePos.x);

        // Calculate node dimensions - match these with your actual node size
        const nodeWidth = 180 * nodeSizeScale; // Width of your node
        const nodeHeight = 90 * nodeSizeScale;  // Height of your node (adjust based on actual dimensions)
        
        // Add some padding to prevent edges from exactly touching the borders
        const sourcePadding = 5; 
        const targetPadding = 6; // Slightly larger for arrowhead
        
        // Calculate start point (from source node border)
        const sourceIntersection = calculateNodeIntersection(
          sourcePos.x, sourcePos.y, nodeWidth, nodeHeight, angle, sourcePadding
        );
        
        // Calculate end point (to target node border)
        const targetIntersection = calculateNodeIntersection(
          targetPos.x, targetPos.y, nodeWidth, nodeHeight, angle + Math.PI, targetPadding
        );
        
        const startX = sourceIntersection.x;
        const startY = sourceIntersection.y;
        const endX = targetIntersection.x;
        const endY = targetIntersection.y;

        let markerEnd = "url(#arrowhead-default)";
        let strokeClass = theme === 'dark' ? 'stroke-gray-600' : 'stroke-gray-300';
        let strokeWidth = 1.5;

        if (isPathHighlighted) {
          markerEnd = "url(#arrowhead-path)";
          strokeClass = 'stroke-green-500';
          strokeWidth = 2.5;
        } else if (isHighlighted) {
          markerEnd = "url(#arrowhead-highlighted)";
          strokeClass = 'stroke-blue-500';
          strokeWidth = 2;
        }

        // Add an edge ID for better debugging and identification
        const edgeId = `edge-${edge.source}-${edge.target}`;

        return (
          <g key={edgeId} 
             id={edgeId}
             data-source={edge.source}
             data-target={edge.target}
             onClick={(e) => {
               e.stopPropagation();
               onEdgeClick(edge);
             }}>
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              className={`${strokeClass} cursor-pointer transition-all duration-200`}
              strokeWidth={strokeWidth / transform.scale}
              markerEnd={markerEnd}
            />
            
            {(isHighlighted || isPathHighlighted) && edge.type && (
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2}
                dy="-5"
                textAnchor="middle"
                className={`text-xs select-none pointer-events-none
                  ${isPathHighlighted ? 'fill-green-500' : 'fill-blue-500'}`}
                style={{ fontSize: `${12 / transform.scale}px` }}
              >
                {edge.type}
              </text>
            )}
            
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              strokeWidth={10 / transform.scale}
              className="stroke-transparent cursor-pointer"
            />
          </g>
        );
      })}
    </>
  );
}; 