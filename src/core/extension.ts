// src/core/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ProjectDetector } from '../project-detector';
import { ParserRegistry } from '../parsers/parser-registry';
import { JavaParser } from '../parsers/java';
import { PythonParser } from '../parsers/python';
import { TypeScriptParser } from '../parsers/typescript';
import { DependencyTreeProvider } from '../views/tree/dependency-tree';
import { StructureTreeProvider } from '../views/tree/structure-tree';
import { MermaidGenerator } from '../views/diagram/mermaid-generator';
import { FileUtils } from '../utils';
import { convertDependencies, detectDependencyType } from '../converter';
import { Graph } from '../converter/types';
import { ProjectType } from './types';
import { ReactGraphGenerator } from '../views/diagram/react-graph-generator';

export function activate(context: vscode.ExtensionContext) {
    console.log('Dependency Analytics Extension is now active');
    
    // Create output channel for logs
    const outputChannel = vscode.window.createOutputChannel('Dependency Analytics');
    
    // Create tree view providers
    const dependencyTreeProvider = new DependencyTreeProvider();
    const structureTreeProvider = new StructureTreeProvider();
    
    // Register tree data providers
    vscode.window.registerTreeDataProvider('dependencyView', dependencyTreeProvider);
    vscode.window.registerTreeDataProvider('classStructure', structureTreeProvider);
    
    // Create parser registry and register parsers
    const parserRegistry = new ParserRegistry();
    parserRegistry.registerParser(new JavaParser());
    parserRegistry.registerParser(new PythonParser());
    parserRegistry.registerParser(new TypeScriptParser());
    
    // Create project detector
    const projectDetector = new ProjectDetector();
    
    // Create diagram generator
    const diagramGenerator = new MermaidGenerator();
    const reactGraphGenerator = new ReactGraphGenerator();
    
    // Store the current dependency graph
    let currentDependencyGraph: Graph | null = null;
    
    // Store all nodes for quick lookup
    let allNodes: any[] = [];
    
    // Check if dependencies.json exists in the workspace and load it
    async function loadExistingDependencies(): Promise<boolean> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false;
        }
        
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        
        // First check for standardized dependencies (from previous run)
        const standardDepsPath = path.join(workspaceRoot, '.vscode', 'standard-dependencies.json');
        if (fs.existsSync(standardDepsPath)) {
            try {
                outputChannel.appendLine(`Loading existing standardized dependencies from ${standardDepsPath}`);
                const dependenciesData = FileUtils.readJsonFile<Graph>(standardDepsPath);
                
                if (dependenciesData) {
                    currentDependencyGraph = dependenciesData;
                    
                    // Collect all nodes for reference
                    allNodes = currentDependencyGraph.nodes;
                    
                    // Update the tree views
                    dependencyTreeProvider.setGraph(currentDependencyGraph);
                    
                    // Calculate and log metrics
                    const nodeCount = allNodes.length;
                    const maxDepth = calculateMaxDepth(currentDependencyGraph);
                    outputChannel.appendLine(`Successfully loaded standardized dependencies with ${nodeCount} nodes and maximum depth of ${maxDepth}`);
                    console.log(`[Metrics] Graph contains ${nodeCount} nodes with maximum depth of ${maxDepth}`);
                    
                    return true;
                }
            } catch (error) {
                outputChannel.appendLine(`Error loading standardized dependencies: ${error}`);
            }
        }
        
        // If no standardized dependencies, check for language-specific dependencies
        const languageDepsPath = path.join(workspaceRoot, '.vscode', 'language-dependencies.json');
        if (fs.existsSync(languageDepsPath)) {
            try {
                outputChannel.appendLine(`Loading existing language-specific dependencies from ${languageDepsPath}`);
                const dependenciesData = FileUtils.readJsonFile<any>(languageDepsPath);
                
                if (dependenciesData) {
                    // Convert to standardized format
                    currentDependencyGraph = convertDependencies(dependenciesData);
                    
                    // Save the standardized format for future use
                    fs.writeFileSync(standardDepsPath, JSON.stringify(currentDependencyGraph, null, 2));
                    
                    // Collect all nodes for reference
                    allNodes = currentDependencyGraph.nodes;
                    
                    // Update the tree views
                    dependencyTreeProvider.setGraph(currentDependencyGraph);
                    
                    // Calculate and log metrics
                    const nodeCount = allNodes.length;
                    const maxDepth = calculateMaxDepth(currentDependencyGraph);
                    outputChannel.appendLine(`Successfully converted and loaded dependencies with ${nodeCount} nodes and maximum depth of ${maxDepth}`);
                    console.log(`[Metrics] Graph contains ${nodeCount} nodes with maximum depth of ${maxDepth}`);
                    
                    return true;
                }
            } catch (error) {
                outputChannel.appendLine(`Error converting dependencies: ${error}`);
            }
        }
        
        // Finally, check for legacy java dependencies.json
        const javaDepsPath = path.join(workspaceRoot, '.vscode', 'dependencies.json');
        if (fs.existsSync(javaDepsPath)) {
            try {
                outputChannel.appendLine(`Loading legacy Java dependencies from ${javaDepsPath}`);
                const dependenciesData = FileUtils.readJsonFile<any>(javaDepsPath);
                
                if (dependenciesData) {
                    // Convert to standardized format
                    currentDependencyGraph = convertDependencies(dependenciesData);
                    
                    // Save the standardized format for future use
                    fs.writeFileSync(standardDepsPath, JSON.stringify(currentDependencyGraph, null, 2));
                    
                    // Collect all nodes for reference
                    allNodes = currentDependencyGraph.nodes;
                    
                    // Update the tree views
                    dependencyTreeProvider.setGraph(currentDependencyGraph);
                    
                    // Calculate and log metrics
                    const nodeCount = allNodes.length;
                    const maxDepth = calculateMaxDepth(currentDependencyGraph);
                    outputChannel.appendLine(`Successfully converted and loaded legacy dependencies with ${nodeCount} nodes and maximum depth of ${maxDepth}`);
                    console.log(`[Metrics] Graph contains ${nodeCount} nodes with maximum depth of ${maxDepth}`);
                    
                    return true;
                }
            } catch (error) {
                outputChannel.appendLine(`Error converting legacy dependencies: ${error}`);
            }
        }
        
        return false;
    }
    
    // Start the analysis process
    async function startAnalysis(): Promise<void> {
        // Add overall performance timing
        console.log(`[Performance] Starting dependency analytics process`);
        const overallStartTime = performance.now();
        
        // Check if dependencies already exist
        if (await loadExistingDependencies()) {
            const overallEndTime = performance.now();
            const overallElapsedTime = overallEndTime - overallStartTime;
            console.log(`[Performance] Loaded existing dependencies in ${overallElapsedTime.toFixed(2)}ms`);
            vscode.window.showInformationMessage('Loaded existing dependency analysis.');
            return;
        }
        
        // Select the root folder
        const rootFolder = await projectDetector.selectRootFolder();
        if (!rootFolder) {
            const overallEndTime = performance.now();
            const overallElapsedTime = overallEndTime - overallStartTime;
            console.log(`[Performance] Dependency analysis cancelled after ${overallElapsedTime.toFixed(2)}ms - no folder selected`);
            vscode.window.showErrorMessage('No folder selected for analysis.');
            return;
        }
        
        // Detect the project type
        const projectType = await projectDetector.detectProjectType(rootFolder);
        if (!projectType) {
            const overallEndTime = performance.now();
            const overallElapsedTime = overallEndTime - overallStartTime;
            console.log(`[Performance] Dependency analysis failed after ${overallElapsedTime.toFixed(2)}ms - could not detect project type`);
            vscode.window.showErrorMessage('Could not detect project type. Please make sure your project structure is supported.');
            return;
        }
        
        vscode.window.showInformationMessage(`Detected ${projectType.name} project. Analyzing dependencies...`);
        
        try {
            // Parse the project and get standardized graph
            currentDependencyGraph = await parserRegistry.parse(projectType);
            
            // Save the standardized graph
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                const outputDir = path.join(workspaceRoot, '.vscode');
                
                // Ensure output directory exists
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                
                const standardDepsPath = path.join(outputDir, 'standard-dependencies.json');
                fs.writeFileSync(standardDepsPath, JSON.stringify(currentDependencyGraph, null, 2));
            }
            
            // Collect all nodes for reference
            allNodes = currentDependencyGraph.nodes;
            
            // Update the tree views
            dependencyTreeProvider.setGraph(currentDependencyGraph);
            
            // Calculate graph metrics
            const nodeCount = currentDependencyGraph.nodes.length;
            const maxDepth = calculateMaxDepth(currentDependencyGraph);
            
            const overallEndTime = performance.now();
            const overallElapsedTime = overallEndTime - overallStartTime;
            console.log(`[Performance] Dependency analysis completed successfully in ${overallElapsedTime.toFixed(2)}ms`);
            console.log(`[Metrics] Graph contains ${nodeCount} nodes with maximum depth of ${maxDepth}`);
            
            // Display performance information in the VS Code UI
            vscode.window.showInformationMessage(`Dependency analysis completed in ${(overallElapsedTime / 1000).toFixed(2)} seconds. Found ${nodeCount} nodes with max depth of ${maxDepth}.`);
        } catch (error) {
            const overallEndTime = performance.now();
            const overallElapsedTime = overallEndTime - overallStartTime;
            console.log(`[Performance] Dependency analysis failed after ${overallElapsedTime.toFixed(2)}ms with error: ${error}`);
            
            outputChannel.appendLine(`Error analyzing dependencies: ${error}`);
            vscode.window.showErrorMessage(`Error analyzing dependencies: ${error}`);
        }
    }
    
    // Register commands
    context.subscriptions.push(
        // Start analysis command
        vscode.commands.registerCommand('dependencyAnalytics.startAnalysis', startAnalysis),
        
        // Show node details command
        vscode.commands.registerCommand('dependencyAnalytics.showNodeDetails', (node: any) => {
            // Update the structure tree view
            structureTreeProvider.setNode(node.node);
        }),
        
        // Show diagram command
        vscode.commands.registerCommand('dependencyAnalytics.showClassDiagram', async (node: any) => {
            if (!node || !node.node) {
                // If called from command palette, let the user pick a node
                if (allNodes.length === 0) {
                    vscode.window.showErrorMessage('No nodes available. Please run dependency analysis first.');
                    return;
                }

                const nodeOptions = allNodes.map(n => ({
                    label: n.title,
                    description: n.type,
                    detail: n.metadata?.filePath || n.metadata?.sourceFile || '',
                    node: n
                }));

                const selectedItem = await vscode.window.showQuickPick(nodeOptions, {
                    placeHolder: 'Select a node to show its dependency diagram'
                });

                if (!selectedItem) {
                    return; // User cancelled
                }

                node = { node: selectedItem.node };
            }
            
            try {
                // First update the structure view
                structureTreeProvider.setNode(node.node);
                
                // Log to help debug
                outputChannel.appendLine(`Showing diagram for node: ${node.node.title} (${node.node.id})`);
                outputChannel.appendLine(`Node type: ${node.node.type}, metadata: ${JSON.stringify(node.node.metadata)}`);
                
                // Check if we have a graph with edges in our state
                if (currentDependencyGraph?.edges) {
                    const relatedEdges = currentDependencyGraph.edges.filter(
                        edge => edge.source === node.node.id || edge.target === node.node.id
                    );
                    outputChannel.appendLine(`Found ${relatedEdges.length} related edges for this node`);
                    
                    if (relatedEdges.length > 0) {
                        outputChannel.appendLine(`Sample edge: ${JSON.stringify(relatedEdges[0])}`);
                    }
                } else {
                    outputChannel.appendLine('No edges found in the dependency graph');
                }
                
                // Show the diagram
                if (currentDependencyGraph) {
                    // If we have the full graph with edges, use it
                    await reactGraphGenerator.showDiagram(
                        context,
                        node.node,
                        currentDependencyGraph.nodes,
                        'react', // Always use React format
                        currentDependencyGraph
                    );
                } else {
                    // Fallback to just the nodes
                    await reactGraphGenerator.showDiagram(
                        context,
                        node.node,
                        allNodes,
                        'react' // Always use React format
                    );
                }
            } catch (error) {
                outputChannel.appendLine(`Error showing diagram: ${error}`);
                vscode.window.showErrorMessage(`Error showing diagram: ${error}`);
            }
        }),
        
        // Open source file command
        vscode.commands.registerCommand('dependencyAnalytics.openSourceFile', (data: any) => {
            try {
                const filePath = data.filePath || data.metadata?.sourceFile || data.metadata?.filePath;
                if (!filePath) {
                    vscode.window.showErrorMessage('No file path provided to open');
                    return;
                }
                
                // Get workspace root
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    vscode.window.showErrorMessage('No workspace folder found');
                    return;
                }
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                
                // Normalize path
                let normalizedPath = filePath.replace(/\\/g, '/');
                
                // Check if the path is absolute or relative
                let absolutePath: string;
                if (path.isAbsolute(normalizedPath)) {
                    absolutePath = normalizedPath;
                } else {
                    // Handle paths that start with / by removing the leading slash
                    if (normalizedPath.startsWith('/')) {
                        normalizedPath = normalizedPath.substring(1);
                    }
                    
                    // Check if it's a special path format (like /app/layout.tsx often used in Next.js)
                    if (normalizedPath.startsWith('app/') || normalizedPath.startsWith('pages/')) {
                        // Try to find the file in the src directory first
                        const srcPath = path.join(workspaceRoot, 'src', normalizedPath);
                        if (fs.existsSync(srcPath)) {
                            absolutePath = srcPath;
                        } else {
                            // Then try at the root of the project
                            absolutePath = path.join(workspaceRoot, normalizedPath);
                        }
                    } else {
                        // Handle paths relative to project root or src
                        const rootPath = path.join(workspaceRoot, normalizedPath);
                        const srcPath = path.join(workspaceRoot, 'src', normalizedPath);
                        
                        // Check if file exists at either location
                        if (fs.existsSync(rootPath)) {
                            absolutePath = rootPath;
                        } else if (fs.existsSync(srcPath)) {
                            absolutePath = srcPath;
                        } else {
                            // Try to find the file using workspace.findFiles
                            vscode.workspace.findFiles(`**/${normalizedPath}`, '**/node_modules/**')
                                .then(files => {
                                    if (files.length > 0) {
                                        openDocument(files[0].fsPath);
                                    } else {
                                        vscode.window.showErrorMessage(`File not found: ${normalizedPath}`);
                                    }
                                });
                            return;
                        }
                    }
                }
                
                // Use the resolved absolute path
                openDocument(absolutePath);
                
                function openDocument(docPath: string) {
                    const fileUri = vscode.Uri.file(docPath);
                    outputChannel.appendLine(`Opening file: ${docPath}`);
                    
                    // Open the document
                    vscode.window.showTextDocument(fileUri, {
                        viewColumn: vscode.ViewColumn.One,
                        preserveFocus: false,
                        preview: false
                    }).then(editor => {
                        // Focus the editor
                        if (editor) {
                            const position = new vscode.Position(0, 0);
                            editor.selection = new vscode.Selection(position, position);
                            editor.revealRange(new vscode.Range(position, position));
                        }
                    }, (err: Error) => {
                        // Handle error as a rejection in the promise rather than using catch
                        outputChannel.appendLine(`Error opening file: ${err.message}`);
                        vscode.window.showErrorMessage(`Failed to open file: ${docPath}. ${err.message}`);
                    });
                }
            } catch (error) {
                outputChannel.appendLine(`Error opening source file: ${error}`);
                vscode.window.showErrorMessage(`Failed to open source file: ${error}`);
            }
        }),
        
        // Reveal in file explorer command
        vscode.commands.registerCommand('dependencyAnalytics.revealInFileTree', (data: any) => {
            try {
                const filePath = data.filePath || data.metadata?.sourceFile || data.metadata?.filePath;
                if (!filePath) {
                    vscode.window.showErrorMessage('No file path provided to reveal');
                    return;
                }
                
                // Get workspace root
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    vscode.window.showErrorMessage('No workspace folder found');
                    return;
                }
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                
                // Normalize path
                let normalizedPath = filePath.replace(/\\/g, '/');
                
                // Check if the path is absolute or relative
                let absolutePath: string;
                if (path.isAbsolute(normalizedPath)) {
                    absolutePath = normalizedPath;
                } else {
                    // Handle paths that start with / by removing the leading slash
                    if (normalizedPath.startsWith('/')) {
                        normalizedPath = normalizedPath.substring(1);
                    }
                    
                    // Check if it's a special path format (like /app/layout.tsx often used in Next.js)
                    if (normalizedPath.startsWith('app/') || normalizedPath.startsWith('pages/')) {
                        // Try to find the file in the src directory first
                        const srcPath = path.join(workspaceRoot, 'src', normalizedPath);
                        if (fs.existsSync(srcPath)) {
                            absolutePath = srcPath;
                        } else {
                            // Then try at the root of the project
                            absolutePath = path.join(workspaceRoot, normalizedPath);
                        }
                    } else {
                        // Handle paths relative to project root or src
                        const rootPath = path.join(workspaceRoot, normalizedPath);
                        const srcPath = path.join(workspaceRoot, 'src', normalizedPath);
                        
                        // Check if file exists at either location
                        if (fs.existsSync(rootPath)) {
                            absolutePath = rootPath;
                        } else if (fs.existsSync(srcPath)) {
                            absolutePath = srcPath;
                        } else {
                            // Try to find the file using workspace.findFiles
                            vscode.workspace.findFiles(`**/${normalizedPath}`, '**/node_modules/**')
                                .then(files => {
                                    if (files.length > 0) {
                                        revealDocument(files[0].fsPath);
                                    } else {
                                        vscode.window.showErrorMessage(`File not found: ${normalizedPath}`);
                                    }
                                });
                            return;
                        }
                    }
                }
                
                // Use the resolved absolute path
                revealDocument(absolutePath);
                
                function revealDocument(docPath: string) {
                    const fileUri = vscode.Uri.file(docPath);
                    outputChannel.appendLine(`Revealing file: ${docPath}`);
                    
                    // Execute the reveal in explorer command
                    vscode.commands.executeCommand('revealInExplorer', fileUri)
                        .then(() => {
                            outputChannel.appendLine(`Successfully revealed file: ${docPath}`);
                        }, (err: Error) => {
                            outputChannel.appendLine(`Error revealing file: ${err.message}`);
                            vscode.window.showErrorMessage(`Failed to reveal file: ${docPath}. ${err.message}`);
                        });
                }
            } catch (error) {
                outputChannel.appendLine(`Error revealing file in explorer: ${error}`);
                vscode.window.showErrorMessage(`Failed to reveal file in explorer: ${error}`);
            }
        }),
        
        // Navigate to source command (alias for openSourceFile for backward compatibility)
        vscode.commands.registerCommand('dependencyAnalytics.navigateToSource', (data: any) => {
            vscode.commands.executeCommand('dependencyAnalytics.openSourceFile', data);
        })
    );
    
    // Set up file watcher to refresh analysis when files change
    const fileWatcher = vscode.workspace.createFileSystemWatcher('/*.{java,py,ts,js}');
    
    // Debounce the refresh to avoid too many updates
    let refreshTimeout: NodeJS.Timeout | null = null;
    const refreshAnalysis = () => {
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
        }
        
        refreshTimeout = setTimeout(async () => {
            await startAnalysis();
        }, 2000);
    };
    
    fileWatcher.onDidChange(refreshAnalysis);
    fileWatcher.onDidCreate(refreshAnalysis);
    fileWatcher.onDidDelete(refreshAnalysis);
    
    context.subscriptions.push(fileWatcher);
    
    // Auto-start analysis when the extension is activated
    startAnalysis();
}

export function deactivate() {
    // Cleanup
}

// Calculate the maximum depth of the dependency graph
function calculateMaxDepth(graph: Graph): number {
    if (!graph || !graph.edges || graph.edges.length === 0 || !graph.nodes || graph.nodes.length === 0) {
        return 0;
    }
    
    // Create adjacency list from edges
    const adjacencyList = new Map<string, string[]>();
    
    // Initialize map with all nodes
    graph.nodes.forEach(node => {
        adjacencyList.set(node.id, []);
    });
    
    // Add edges to adjacency list
    graph.edges.forEach(edge => {
        const sourceDependencies = adjacencyList.get(edge.source) || [];
        sourceDependencies.push(edge.target);
        adjacencyList.set(edge.source, sourceDependencies);
    });
    
    // Track visited nodes and their depths
    const visited = new Map<string, number>();
    let maxDepth = 0;
    
    // Perform DFS from each node to find the longest path
    const dfs = (nodeId: string, depth: number): void => {
        // If already visited with a higher or equal depth, skip
        if (visited.has(nodeId) && visited.get(nodeId)! >= depth) {
            return;
        }
        
        // Update max depth
        maxDepth = Math.max(maxDepth, depth);
        
        // Mark as visited with current depth
        visited.set(nodeId, depth);
        
        // Visit all dependencies
        const dependencies = adjacencyList.get(nodeId) || [];
        for (const dependencyId of dependencies) {
            dfs(dependencyId, depth + 1);
        }
    };
    
    // Start DFS from each node
    graph.nodes.forEach(node => {
        dfs(node.id, 0);
    });
    
    return maxDepth;
}