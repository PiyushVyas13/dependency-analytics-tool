// This file provides global type declarations for TypeScript

// Fix 'cannot find name window' errors
interface Window {
  diagramData: any;
  vscode: {
    postMessage: (message: any) => void;
  };
  viewParams?: {
    singleNodeMode?: boolean;
    showSections?: boolean;
    autoLayout?: string;
    focusedNodeId?: string;
    fullGraphAvailable?: boolean;
  };
  _pendingGraphData: any | null;
}

// Enable JSX
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
} 