// src/parsers/base-parser.ts
import { ProjectType } from "../core/types";
import { Graph } from "../converter/types";
import { convertDependencies } from "../converter";

/**
 * Interface for language-specific parsers
 */
export interface Parser {
  /**
   * Check if this parser can handle the given project type
   * @param projectType The project type to check
   * @returns Whether this parser can handle the project type
   */
  canHandle(projectType: ProjectType): boolean;

  /**
   * Parse the project and generate a dependency tree
   * @param projectType Information about the project to parse
   * @returns A promise that resolves to the standardized dependency graph
   */
  parse(projectType: ProjectType): Promise<Graph>;
}

/**
 * Base class for language-specific parsers
 */
export abstract class BaseParser implements Parser {
  /**
   * The language that this parser handles
   */
  protected abstract language: string;

  /**
   * Check if this parser can handle the given project type
   * @param projectType The project type to check
   * @returns Whether this parser can handle the project type
   */
  public canHandle(projectType: ProjectType): boolean {
    return projectType.language === this.language;
  }

  /**
   * Parse the project and generate language-specific dependencies
   * @param projectType Information about the project to parse
   * @returns A promise that resolves to the language-specific dependencies
   */
  protected abstract parseToLanguageSpecific(
    projectType: ProjectType
  ): Promise<any>;

  /**
   * Parse the project and convert to standardized format
   * @param projectType Information about the project to parse
   * @returns A promise that resolves to the standardized dependency graph
   */
  public async parse(projectType: ProjectType): Promise<Graph> {
    // Add detailed timing for the language-specific parsing step
    console.log(`[Performance] Starting language-specific parsing for ${this.language}`);
    const parseStartTime = performance.now();
    
    // Parse project to get language-specific dependencies
    const languageSpecificDeps = await this.parseToLanguageSpecific(
      projectType
    );
    
    // Log parsing time
    const parseEndTime = performance.now();
    const parseElapsedTime = parseEndTime - parseStartTime;
    console.log(`[Performance] Completed language-specific parsing for ${this.language} in ${parseElapsedTime.toFixed(2)}ms`);
    
    // Add timing for the conversion step
    console.log(`[Performance] Starting conversion to standard format for ${this.language}`);
    const convertStartTime = performance.now();
    
    // Convert to standardized format
    const result = convertDependencies(languageSpecificDeps);
    
    // Log conversion time
    const convertEndTime = performance.now();
    const convertElapsedTime = convertEndTime - convertStartTime;
    console.log(`[Performance] Completed conversion for ${this.language} in ${convertElapsedTime.toFixed(2)}ms`);
    
    return result;
  }
}
