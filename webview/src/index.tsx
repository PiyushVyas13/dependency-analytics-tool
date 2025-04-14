/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// webview/src/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Graph, GraphData } from 'digramaatic_ui';
import './index.css';

// Create a wrapper component for Graph that supports onExpandNode
interface ExtendedGraphProps {
    data: GraphData;
    width?: number;
    height?: number;
    autoLayout?: 'circular' | 'force' | 'tree' | 'spiral' | 'donut';
    nodeSizeScale?: number;
    theme?: 'light' | 'dark';
    onNodeSelect?: (nodeId: string) => void;
    onSourceNavigate?: (filePath: string) => void;
    onExpandNode?: (nodeId: string) => void;
    showDetailedNode?: boolean;
    highlightNodeId?: string;
    zoomable?: boolean;
    pannable?: boolean;
    initialZoom?: number;
    onZoomChange?: (zoom: number) => void;
    infiniteCanvas?: boolean;
    nodeSpacing?: number;
}

const GraphWrapper: React.FC<ExtendedGraphProps> = (props) => {
    const { 
        onExpandNode,
        onNodeSelect,
        onSourceNavigate,
        showDetailedNode,
        highlightNodeId,
        zoomable,
        pannable,
        initialZoom,
        onZoomChange,
        infiniteCanvas,
        nodeSpacing,
        ...graphProps 
    } = props;

    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isLayoutReady, setIsLayoutReady] = React.useState(false);

    // Pass only the props that exist in the Graph component
    const validGraphProps = {
        ...graphProps,
        width: props.width || 800,
        height: props.height || 600,
    };

    // Reset layout when data changes
    React.useEffect(() => {
        setIsLayoutReady(false);
        const timer = setTimeout(() => {
            setIsLayoutReady(true);
        }, 50);
        return () => clearTimeout(timer);
    }, [props.data]);

    // Set up DOM event listener for custom events
    React.useEffect(() => {
        const handleExpandEvent = (event: CustomEvent) => {
            if (onExpandNode && event.detail && event.detail.nodeId) {
                console.log('Expand event received for node:', event.detail.nodeId);
                onExpandNode(event.detail.nodeId);
            }
        };

        const handleNodeClickEvent = (event: CustomEvent) => {
            if (onNodeSelect && event.detail && event.detail.node) {
                onNodeSelect(event.detail.node.id);
            }
        };

        const handleOpenSourceFileEvent = (event: CustomEvent) => {
            if (onSourceNavigate && event.detail && event.detail.filePath) {
                onSourceNavigate(event.detail.filePath);
            }
        };

        // Listen for localStorage events for expandNode
        const handleStorageEvent = (event: StorageEvent) => {
            if (event.key === 'digramaatic_expandNode' && onExpandNode) {
                try {
                    const data = JSON.parse(event.newValue || '{}');
                    if (data.nodeId) {
                        console.log('Got expand node request from localStorage:', data.nodeId);
                        onExpandNode(data.nodeId);
                    }
                } catch (e) {
                    console.error('Failed to parse storage event data:', e);
                }
            }
        };

        // Listen for custom events
        window.addEventListener('expandNode', handleExpandEvent as EventListener);
        window.addEventListener('nodeClick', handleNodeClickEvent as EventListener);
        window.addEventListener('openSourceFile', handleOpenSourceFileEvent as EventListener);
        window.addEventListener('storage', handleStorageEvent);
        
        // Also listen for messages from the iframe parent
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === 'expandNode' && onExpandNode) {
                const nodeId = event.data.data?.nodeId;
                if (nodeId) {
                    console.log('Got expand node request from postMessage:', nodeId);
                    onExpandNode(nodeId);
                }
            }
        };
        window.addEventListener('message', handleMessage);
        
        return () => {
            window.removeEventListener('expandNode', handleExpandEvent as EventListener);
            window.removeEventListener('nodeClick', handleNodeClickEvent as EventListener);
            window.removeEventListener('openSourceFile', handleOpenSourceFileEvent as EventListener);
            window.removeEventListener('storage', handleStorageEvent);
            window.removeEventListener('message', handleMessage);
        };
    }, [onExpandNode, onNodeSelect, onSourceNavigate]);

    console.log('GraphWrapper rendering with onExpandNode:', !!onExpandNode);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width: '100%', 
                height: '100%', 
                position: 'relative', 
                opacity: isLayoutReady ? 1 : 0, 
                transition: 'opacity 0.15s ease-in-out',
                transform: 'translate3d(0,0,0)',
                willChange: 'opacity'
            }}
        >
            <Graph 
                {...validGraphProps}
                key={`${props.autoLayout}-${isLayoutReady}`}
            />
        </div>
    );
};

// Get data provided by the extension
// The Window interface is now declared in global.d.ts

const Webview: React.FC = () => {
    const [theme, setTheme] = React.useState<'light' | 'dark'>('light');
    const [graphData, setGraphData] = React.useState<GraphData>(window.diagramData);
    const [isFullGraph, setIsFullGraph] = React.useState<boolean>(false);
    const [zoom, setZoom] = React.useState<number>(1);
    const [key, setKey] = React.useState<number>(0); // Add key to force remount
    const fullGraphAvailable = window.viewParams?.fullGraphAvailable || false;
    const [isTransitioning, setIsTransitioning] = React.useState(false);
    
    // Handle node selection
    const handleNodeClick = (nodeId: string) => {
        window.vscode.postMessage({
            command: 'selectNode',
            nodeId
        });
    };
    
    // Handle node expansion
    const handleExpandNode = (nodeId: string) => {
        console.log(`handleExpandNode called with nodeId: ${nodeId}`);
        window.vscode.postMessage({
            command: 'expandNode',
            nodeId
        });
    };
    
    // Handle navigation to source
    const handleNavigateToSource = (filePath: string) => {
        window.vscode.postMessage({
            command: 'navigateToSource',
            filePath
        });
    };
    
    // Handle toggling between focused and full graph views
    const handleToggleFullGraph = () => {
        if (isTransitioning) return; // Prevent multiple transitions
        
        setIsTransitioning(true);
        const newValue = !isFullGraph;
        
        // First update the view mode
        setIsFullGraph(newValue);
        
        // Notify extension
        window.vscode.postMessage({
            command: 'toggleFullGraph',
            showFullGraph: newValue
        });
    };
    
    // Handle zoom change
    const handleZoomChange = (newZoom: number) => {
        setZoom(newZoom);
    };
    
    // Reset view to center the graph
    const handleResetView = () => {
        const graphContainer = document.querySelector('.graph-container');
        if (graphContainer) {
            // Trigger a resize event to recenter the graph
            window.dispatchEvent(new Event('resize'));
            setZoom(1);
        }
    };
    
    // Add event listener setup to the Webview component
    React.useEffect(() => {
        // Initialize the pending data property if not already present
        if (window._pendingGraphData === undefined) {
            window._pendingGraphData = null;
        }
        
        // Listen for native window events from the graph component
        const handleOpenSourceFile = (event: CustomEvent) => {
            if (event.detail?.filePath) {
                window.vscode.postMessage({
                    command: 'openSourceFile',
                    filePath: event.detail.filePath,
                    nodeId: event.detail.node?.id
                });
            }
        };

        const handleRevealInFileTree = (event: CustomEvent) => {
            if (event.detail?.filePath) {
                window.vscode.postMessage({
                    command: 'revealInFileTree',
                    filePath: event.detail.filePath,
                    nodeId: event.detail.node?.id
                });
            }
        };

        // Listen for localStorage events
        const handleStorageEvent = (event: StorageEvent) => {
            if (event.key === 'digramaatic_openSourceFile') {
                try {
                    const data = JSON.parse(event.newValue || '{}');
                    if (data.filePath) {
                        window.vscode.postMessage({
                            command: 'openSourceFile',
                            filePath: data.filePath,
                            nodeId: data.nodeId
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse storage event data:', e);
                }
            } else if (event.key === 'digramaatic_revealInFileTree') {
                try {
                    const data = JSON.parse(event.newValue || '{}');
                    if (data.filePath) {
                        window.vscode.postMessage({
                            command: 'revealInFileTree',
                            filePath: data.filePath,
                            nodeId: data.nodeId
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse storage event data:', e);
                }
            }
        };

        // Add event listeners
        window.addEventListener('revealInFileTree', handleRevealInFileTree as EventListener);
        window.addEventListener('storage', handleStorageEvent);

        // Message handler for receiving updates from extension
        const messageHandler = (event: MessageEvent) => {
            const message = event.data;
            if (message.command === 'updateGraphData') {
                if (message.showFullGraph !== undefined && message.showFullGraph !== isFullGraph) {
                    // Reset zoom
                    setZoom(1);
                    
                    // Update view mode first
                    setIsFullGraph(message.showFullGraph);
                    
                    // Brief delay before data update
                    requestAnimationFrame(() => {
                        setGraphData({ nodes: [], edges: [] });
                        
                        // Use requestAnimationFrame for the next update to ensure smooth transition
                        requestAnimationFrame(() => {
                            setGraphData(message.data);
                            setIsTransitioning(false);
                        });
                    });
                } else {
                    setGraphData(message.data);
                    if (message.showFullGraph !== undefined) {
                        setIsFullGraph(message.showFullGraph);
                    }
                    setIsTransitioning(false);
                }
            }
        };
        window.addEventListener('message', messageHandler);

        // Clean up
        return () => {
            window.removeEventListener('revealInFileTree', handleRevealInFileTree as EventListener);
            window.removeEventListener('storage', handleStorageEvent);
            window.removeEventListener('message', messageHandler);
        };
    }, [isFullGraph]);
    
    // Detect VS Code theme
    React.useEffect(() => {
        // Check if body has a dark class 
        const isDark = document.body.classList.contains('vscode-dark');
        setTheme(isDark ? 'dark' : 'light');
        
        // Listen for theme changes
        const observer = new MutationObserver(() => {
            const isDarkNow = document.body.classList.contains('vscode-dark');
            setTheme(isDarkNow ? 'dark' : 'light');
        });
        
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        
        return () => observer.disconnect();
    }, []);
    
    return (
        <div className="graph-container">
            {fullGraphAvailable && (
                <div className="graph-controls">
                    <button 
                        className="graph-control-button"
                        onClick={handleToggleFullGraph}
                        disabled={isTransitioning}
                    >
                        {isFullGraph ? 'Show Focused View' : 'Show Complete Graph'}
                    </button>
                    
                    {isFullGraph && (
                        <>
                            <button 
                                className="graph-control-button"
                                onClick={handleResetView}
                                title="Reset View"
                            >
                                Reset View
                            </button>
                            <div className="zoom-controls">
                                <button 
                                    className="graph-control-button zoom-button"
                                    onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                                    title="Zoom Out"
                                >
                                    −
                                </button>
                                <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                                <button 
                                    className="graph-control-button zoom-button"
                                    onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                                    title="Zoom In"
                                >
                                    +
                                </button>
                            </div>
                        </>
                    )}
                    
                    {/* Test button for expand functionality */}
                    <button 
                        className="graph-control-button"
                        onClick={() => {
                            console.log("Test expand button clicked");
                            if (graphData && graphData.nodes && graphData.nodes.length > 0) {
                                const firstNodeId = graphData.nodes[0].id;
                                console.log(`Testing expand with first node: ${firstNodeId}`);
                                handleExpandNode(firstNodeId);
                            } else {
                                console.log("No nodes found to expand", graphData);
                            }
                        }}
                        title="Test Expand Node"
                    >
                        Test Expand
                    </button>
                </div>
            )}
            <GraphWrapper
                data={graphData}
                width={window.innerWidth}
                height={window.innerHeight}
                autoLayout={isFullGraph ? "force" : ((window as any).viewParams?.autoLayout || "circular")}
                nodeSizeScale={(window as any).viewParams?.singleNodeMode ? 1.5 : 1}
                theme={theme}
                onNodeSelect={handleNodeClick}
                onSourceNavigate={handleNavigateToSource}
                onExpandNode={handleExpandNode}
                showDetailedNode={(window as any).viewParams?.singleNodeMode}
                highlightNodeId={!isFullGraph ? undefined : window.viewParams?.focusedNodeId}
                zoomable={isFullGraph}
                pannable={isFullGraph}
                initialZoom={zoom}
                onZoomChange={handleZoomChange}
                infiniteCanvas={isFullGraph}
                nodeSpacing={isFullGraph ? 120 : 60}
            />
        </div>
    );
};

// Render the application
const root = createRoot(document.getElementById('root')!);
root.render(<Webview />);