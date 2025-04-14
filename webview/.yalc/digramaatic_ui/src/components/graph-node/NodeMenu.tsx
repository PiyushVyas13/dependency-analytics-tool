import React from 'react';
import { Info, ArrowUpRight, ArrowDownRight, X, Focus, FolderOpen, FileSearch, ChevronsUpDown, ArrowUp, Copy } from 'lucide-react';
import { Node } from '../../types/graph';

interface NodeMenuProps {
  node: Node;
  show: boolean;
  theme: 'light' | 'dark';
  onShowDetails: (node: Node) => void;
  onShowDependencies: (node: Node) => void;
  onShowDependents: (node: Node) => void;
  onClose: () => void;
  onFocusNode?: (node: Node) => void;
  onOpenSourceFile?: (node: Node) => void;
  onRevealInFileTree?: (node: Node) => void;
  onExpandNode?: (node: Node) => void;
  onGoToParent?: (node: Node) => void;
  onCopyImportPath?: (node: Node) => void;
  position?: 'right' | 'contextmenu';
  contextMenuPosition?: { x: number; y: number };
}

/**
 * Node context menu component for showing options when clicking menu button
 */
export const NodeMenu: React.FC<NodeMenuProps> = ({ 
  node, 
  show, 
  theme, 
  onShowDetails,
  onShowDependencies,
  onShowDependents,
  onClose,
  onFocusNode,
  onOpenSourceFile,
  onRevealInFileTree,
  onExpandNode,
  onGoToParent,
  onCopyImportPath
}) => {
  if (!show) return null;
  
  const isDark = theme === 'dark';

  const positionStyle = {
    position: 'absolute' as const,
    left: '50%', // Center horizontally
    top: '-10px', // Position slightly above the node
    transform: 'translate(-50%, -100%)', // Center and move up
    zIndex: 9999,
    pointerEvents: 'auto' as const
  }
  
  return (
    <div 
      className={`${
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } rounded-lg shadow-lg border py-1 w-48 z-50 node-menu`}
      style={{
        ...positionStyle,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {onFocusNode && (
        <button 
          className={`w-full px-3 py-2 text-left text-sm ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
          } flex items-center gap-2`}
          onClick={(e) => {
            e.stopPropagation();
            onFocusNode(node);
            onClose();
          }}
        >
          <Focus className="w-4 h-4" />
          Focus View on Node
        </button>
      )}

      {onOpenSourceFile && (
        <button 
          className={`w-full px-3 py-2 text-left text-sm ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
          } flex items-center gap-2`}
          onClick={(e) => {
            e.stopPropagation();
            onOpenSourceFile(node);
            onClose();
          }}
        >
          <FolderOpen className="w-4 h-4" />
          Open in Source File
        </button>
      )}

      {onRevealInFileTree && (
        <button 
          className={`w-full px-3 py-2 text-left text-sm ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
          } flex items-center gap-2`}
          onClick={(e) => {
            e.stopPropagation();
            onRevealInFileTree(node);
            onClose();
          }}
        >
          <FileSearch className="w-4 h-4" />
          Reveal in File Tree
        </button>
      )}

      {onExpandNode && (
        <button 
          className={`w-full px-3 py-2 text-left text-sm ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
          } flex items-center gap-2`}
          onClick={(e) => {
            e.stopPropagation();
            onExpandNode(node);
            onClose();
          }}
        >
          <ChevronsUpDown className="w-4 h-4" />
          Expand
        </button>
      )}

      {onGoToParent && (
        <button 
          className={`w-full px-3 py-2 text-left text-sm ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
          } flex items-center gap-2`}
          onClick={(e) => {
            e.stopPropagation();
            onGoToParent(node);
            onClose();
          }}
        >
          <ArrowUp className="w-4 h-4" />
          Go to Parent
        </button>
      )}

      {onCopyImportPath && (
        <button 
          className={`w-full px-3 py-2 text-left text-sm ${
            isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
          } flex items-center gap-2`}
          onClick={(e) => {
            e.stopPropagation();
            onCopyImportPath(node);
            onClose();
          }}
        >
          <Copy className="w-4 h-4" />
          Copy Import Path
        </button>
      )}

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