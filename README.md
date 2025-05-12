# CodeGraph by Optivance


![image](https://github.com/user-attachments/assets/3a484014-b7b4-4d1d-ba44-667aae273ee2)

A powerful Visual Studio Code extension that provides comprehensive dependency analysis and visualization for your projects. CodeGraph helps developers understand and navigate complex codebases by analyzing dependencies between classes, components, and modules.

<!-- Add a banner image of the extension here -->



## Features

### 1. Dependency Visualization
- Interactive dependency diagrams showing relationships between different components
- Visual representation of class hierarchies and module dependencies
- Easy-to-navigate graph interface
<!-- Add a GIF demonstrating the dependency visualization feature -->


### 2. Smart Code Analysis
- Supports multiple programming languages:
  - JavaScript/TypeScript
  - Python
  - Java
- Real-time analysis of code structure
- Automatic detection of dependencies and relationships


### 3. Navigation Tools
- Quick navigation to class/component declarations
- Detailed view of class structures
- Comprehensive dependency tree view


### 4. Integration Features
- Seamless VS Code integration
- Custom side panel for easy access
- Context-aware commands and shortcuts


## Installation

1. Open Visual Studio Code
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "CodeGraph"
4. Look for the extension by Optivance
5. Click Install
6. Reload VS Code when prompted

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.x or later)
- [Visual Studio Code](https://code.visualstudio.com/) (v1.99.0 or later)
- [Git](https://git-scm.com/)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

### Setting Up the Development Environment

1. Clone the repository


2. Install dependencies
   ```bash
   # Install main project dependencies
   npm install

   # Install webview dependencies
   cd webview
   npm install
   cd ..
   ```

3. Build the project
   ```bash
   # Compile both the extension and webview
   npm run compile
   ```

4. Open in VS Code
   ```bash
   code .
   ```

5. Start Development
   ```bash
   # Watch mode for development
   npm run watch
   ```

### Development Workflow

1. Press `F5` in VS Code to:
   - Open a new VS Code Extension Development Host
   - Launch the extension in debug mode
   - Enable breakpoints and debugging

2. Make changes to the code:
   - Extension source code is in the `src/` directory
   - Webview source code is in the `webview/` directory
   - Changes will be automatically compiled in watch mode

3. Testing your changes:
   - Run tests: `npm test`
   - Run linter: `npm run lint`
   - Package the extension: `npm run package`

### Project Structure

```
codegraph/
├── src/                    # Extension source code
│   ├── parsers/           # Language-specific code parsers
│   ├── views/             # VS Code views and panels
│   ├── converter/         # Data conversion utilities
│   ├── core/              # Core extension logic
│   └── utils/             # Helper utilities
├── webview/               # Webview frontend code
├── media/                 # Icons and images
├── dist/                  # Compiled extension code
└── resources/            # Additional resources
```

### Common Development Tasks

- **Adding a New Feature**
  1. Create a new branch: `git checkout -b feature/your-feature-name`
  2. Implement your changes
  3. Add tests in `src/test`
  4. Run tests and linting
  5. Submit a pull request

- **Debugging**
  - Use VS Code's built-in debugger
  - Check Debug Console for extension logs
  - Use breakpoints in the TypeScript code

- **Building for Production**
  ```bash
  npm run package
  ```
  This will create a `.vsix` file that can be installed in VS Code

### Troubleshooting Common Issues

1. **Build Errors**
   - Clear the build cache: `rm -rf dist/ out/`
   - Rebuild: `npm run compile`

2. **Webview Not Loading**
   - Check webview console in DevTools
   - Ensure webview dependencies are installed
   - Rebuild webview: `npm run compile:webview`

3. **TypeScript Errors**
   - Run `npm run lint` to check for issues
   - Ensure TypeScript version matches in all packages

## Usage

### Getting Started

1. Open your project in VS Code
2. Click on the Package Tree icon in the activity bar
3. Click the "Start Analysis" button to begin analyzing your project
4. Wait for the initial analysis to complete

### Key Commands

- `Start Dependency Analysis`: Initiates the analysis of your project
- `Refresh Dependency Analysis`: Updates the analysis with recent changes
- `Show Class Details`: Displays detailed information about selected classes
- `Show Dependency Diagram`: Opens the interactive dependency visualization
- `Navigate to Declaration`: Quickly jump to class/component declarations

### Viewing Dependencies

1. Open the Package Tree view from the activity bar
2. Navigate through the dependency tree in the side panel
3. Click on any component to see its details
4. Use the "Show Dependency Diagram" button to visualize relationships

## Configuration

The extension works out of the box with default settings, but you can customize various aspects:

```json
{
  "dependencyAnalytics.excludePatterns": ["node_modules/**", "dist/**"],
  "dependencyAnalytics.maxDepth": 3,
  "dependencyAnalytics.showPrivateMembers": false
}
```

## Requirements

- Visual Studio Code version 1.99.0 or higher
- Supported language extensions for your project type

## Contributing

We welcome contributions to the Dependency Analytics Tool! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

- File an issue on our [GitHub repository](https://github.com/Optivance/codegraph)
- Contact Optivance support team at [support@optivance.com](mailto:support@optivance.com)

## About Optivance

CodeGraph is developed and maintained by Optivance, a team dedicated to creating powerful developer tools that enhance productivity and code understanding. We're committed to providing high-quality extensions that make development workflows more efficient.

## Acknowledgments

- Thanks to all contributors who have helped shape CodeGraph
- Special thanks to the VS Code team for their excellent extension API
- Special thanks to the Optivance team for their continuous support and development

---

<!-- Add more screenshots or GIFs showcasing different features -->
## More Screenshots

### Feature 1: Class Structure View
![Class Structure](path_to_class_structure.png)

### Feature 2: Dependency Graph
![Dependency Graph](path_to_dependency_graph.gif)

### Feature 3: Code Navigation
![Code Navigation](path_to_code_navigation.gif)
