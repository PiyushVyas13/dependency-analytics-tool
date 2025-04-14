import * as path from 'path';

/**
 * Configuration for project type detection
 */
export interface ProjectTypeConfig {
    /** Files required for this project type */
    requiredFiles: string[];
    
    /** Whether any of the files should match (true) or all of them (false) */
    matchAny?: boolean;
    
    /** Language associated with this project type */
    language: string;
}

/**
 * Mapping of project type ID to its detection configuration
 */
export const PROJECT_CONFIGS: Record<string, ProjectTypeConfig> = {
    "android": {
        requiredFiles: [
            "build.gradle",
            "app/src/main/AndroidManifest.xml"
        ],
        matchAny: false,
        language: "java"
    },
    "maven": {
        requiredFiles: [
            "pom.xml"
        ],
        language: "java"
    },
    "gradle": {
        requiredFiles: [
            "build.gradle",
            "build.gradle.kts",
            "settings.gradle"
        ],
        matchAny: true,
        language: "java"
    },
    "java": {
        requiredFiles: [
            "src/main/java",
        ],
        matchAny: true,
        language: "java"
    },
    "python": {
        requiredFiles: [
            "setup.py",
            "manage.py",
            "poetry.lock",
            "pyproject.toml",
            "requirements.txt"
        ],
        matchAny: true,
        language: "python"
    },
    "nodejs": {
        requiredFiles: [
            "package.json"
        ],
        language: "typescript" // or javascript, depending on detection
    }
};