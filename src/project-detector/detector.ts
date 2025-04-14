import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { PROJECT_CONFIGS } from './project-config';
import { ProjectType } from '../core/types';

/**
 * Detects the type of project in the given folder
 */
export class ProjectDetector {
    /**
     * Attempts to detect the project type from the given root folder
     * @param rootFolder The root folder to detect the project type from
     * @returns A promise that resolves to the detected project type, or null if none could be detected
     */
    public async detectProjectType(rootFolder: string): Promise<ProjectType | null> {
        // Add performance measurement for project detection
        console.log(`[Performance] Starting project type detection for ${rootFolder}`);
        const startTime = performance.now();
        
        for (const [projectTypeId, config] of Object.entries(PROJECT_CONFIGS)) {
            const { requiredFiles, matchAny, language } = config;
            
            let allFilesExist: boolean;
            
            if (matchAny) {
                // Any of the files should exist
                allFilesExist = requiredFiles.some(file => 
                    fs.existsSync(path.join(rootFolder, file))
                );
            } else {
                // All of the files should exist
                allFilesExist = requiredFiles.every(file => 
                    fs.existsSync(path.join(rootFolder, file))
                );
            }
            
            if (allFilesExist) {
                // Project type detected
                const projectType: ProjectType = {
                    id: projectTypeId,
                    name: this.formatProjectTypeName(projectTypeId),
                    language,
                    rootPath: rootFolder
                };
                
                // For Android projects, add the app directory to metadata
                if (projectTypeId === 'android') {
                    projectType.metadata = {
                        appDir: path.join(rootFolder, 'app')
                    };
                }
                
                // Log successful detection time
                const endTime = performance.now();
                const elapsedTime = endTime - startTime;
                console.log(`[Performance] Detected project type ${projectTypeId} in ${elapsedTime.toFixed(2)}ms`);
                
                return projectType;
            }
        }
        
        // Log failed detection time
        const endTime = performance.now();
        const elapsedTime = endTime - startTime;
        console.log(`[Performance] Failed to detect project type after ${elapsedTime.toFixed(2)}ms`);
        
        // No project type detected
        return null;
    }
    
    /**
     * Selects a root folder for analysis
     * @returns A promise that resolves to the selected folder path, or null if none was selected
     */
    public async selectRootFolder(): Promise<string | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        
        // If there's a workspace open, use that
        if (workspaceFolders && workspaceFolders.length > 0) {
            // If there's only one workspace folder, use that
            if (workspaceFolders.length === 1) {
                return workspaceFolders[0].uri.fsPath;
            }
            
            // If there are multiple workspace folders, ask the user to select one
            const selectedFolder = await vscode.window.showQuickPick(
                workspaceFolders.map(folder => ({
                    label: folder.name,
                    description: folder.uri.fsPath,
                    folder
                })),
                {
                    placeHolder: 'Select a workspace folder to analyze'
                }
            );
            
            if (selectedFolder) {
                return selectedFolder.folder.uri.fsPath;
            }
            
            return null;
        }
        
        // No workspace open, ask the user to select a folder
        const selectedFolders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Folder'
        });
        
        if (selectedFolders && selectedFolders.length > 0) {
            return selectedFolders[0].fsPath;
        }
        
        return null;
    }
    
    /**
     * Formats a project type ID into a human-readable name
     */
    private formatProjectTypeName(id: string): string {
        return id.charAt(0).toUpperCase() + id.slice(1);
    }
}