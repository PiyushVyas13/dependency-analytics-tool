// src/parsers/parser-registry.ts
import { ProjectType } from '../core/types';
import { Parser } from './base-parser';
import { Graph } from '../converter/types';

/**
 * Registry of all available parsers
 */
export class ParserRegistry {
    private parsers: Parser[] = [];
    
    /**
     * Register a parser
     * @param parser The parser to register
     */
    public registerParser(parser: Parser): void {
        this.parsers.push(parser);
    }
    
    /**
     * Get a parser that can handle the given project type
     * @param projectType The project type to get a parser for
     * @returns The parser, or null if no suitable parser was found
     */
    public getParser(projectType: ProjectType): Parser | null {
        for (const parser of this.parsers) {
            if (parser.canHandle(projectType)) {
                return parser;
            }
        }
        
        return null;
    }
    
    /**
     * Parse the project with an appropriate parser
     * @param projectType Information about the project to parse
     * @returns A promise that resolves to the standardized dependency graph
     * @throws Error if no suitable parser was found
     */
    public async parse(projectType: ProjectType): Promise<Graph> {
        const parser = this.getParser(projectType);
        
        if (!parser) {
            throw new Error(`No parser available for project type: ${projectType.name}`);
        }

        // Add performance measurement
        console.log(`[Performance] Starting parse for ${projectType.name} (${projectType.language})`);
        const startTime = performance.now();
        
        try {
            const result = await parser.parse(projectType);
            
            // Calculate and log the elapsed time
            const endTime = performance.now();
            const elapsedTime = endTime - startTime;
            console.log(`[Performance] Completed parse for ${projectType.name} (${projectType.language}) in ${elapsedTime.toFixed(2)}ms`);
            
            return result;
        } catch (error) {
            // Log timing even if there's an error
            const endTime = performance.now();
            const elapsedTime = endTime - startTime;
            console.error(`[Performance] Failed parse for ${projectType.name} (${projectType.language}) after ${elapsedTime.toFixed(2)}ms`);
            throw error;
        }
    }
}