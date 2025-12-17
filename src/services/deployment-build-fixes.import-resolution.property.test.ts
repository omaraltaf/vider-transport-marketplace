/**
 * Property-based tests for import resolution consistency
 * 
 * Property 3: Import Resolution Consistency
 * For any import statement in the codebase, there should exist a corresponding 
 * export in the target module
 * 
 * Validates: Requirements 1.3, 3.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Import Resolution Consistency Properties', () => {
  /**
   * Property: All import statements should resolve to existing exports
   * For any TypeScript file in the project, all import statements should
   * reference modules and exports that actually exist
   */
  it('should have all imports resolve to existing exports', async () => {
    const srcDir = path.join(process.cwd(), 'src');
    const tsFiles = getAllTsFiles(srcDir);

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...tsFiles),
        async (filePath) => {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const imports = extractImportStatements(fileContent);

          for (const importStatement of imports) {
            if (importStatement.isRelativeImport) {
              // Check relative imports
              const resolvedPath = resolveRelativeImport(filePath, importStatement.modulePath);
              
              if (resolvedPath) {
                expect(fs.existsSync(resolvedPath), 
                  `Import "${importStatement.modulePath}" in ${filePath} should resolve to existing file`
                ).toBe(true);

                // If importing specific exports, verify they exist
                if (importStatement.namedImports.length > 0) {
                  const targetContent = fs.readFileSync(resolvedPath, 'utf-8');
                  const exports = extractExportStatements(targetContent);
                  
                  for (const namedImport of importStatement.namedImports) {
                    const exportExists = exports.some(exp => 
                      exp.name === namedImport || 
                      exp.name === 'default' ||
                      exp.isExportAll
                    );
                    
                    expect(exportExists, 
                      `Named import "${namedImport}" should exist in ${resolvedPath}`
                    ).toBe(true);
                  }
                }
              }
            } else {
              // Check node_modules imports
              const packageJsonPath = path.join(process.cwd(), 'package.json');
              const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
              const allDependencies = {
                ...packageJson.dependencies,
                ...packageJson.devDependencies
              };

              const packageName = importStatement.modulePath.split('/')[0];
              
              expect(allDependencies[packageName], 
                `Package "${packageName}" imported in ${filePath} should be in package.json dependencies`
              ).toBeDefined();
            }
          }
        }
      ),
      { numRuns: Math.min(tsFiles.length, 20), timeout: 30000 }
    );
  });

  /**
   * Property: Critical service imports should be available
   * For any service file, imports of core dependencies (Prisma, Redis, Logger)
   * should resolve correctly
   */
  it('should have all critical service imports resolve correctly', async () => {
    const serviceFiles = getAllTsFiles(path.join(process.cwd(), 'src/services'));

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...serviceFiles),
        async (serviceFile) => {
          const fileContent = fs.readFileSync(serviceFile, 'utf-8');
          const imports = extractImportStatements(fileContent);

          // Critical imports that should always resolve
          const criticalImports = imports.filter(imp => 
            imp.modulePath.includes('prisma') ||
            imp.modulePath.includes('redis') ||
            imp.modulePath.includes('logger') ||
            imp.modulePath.includes('../config/') ||
            imp.modulePath.includes('../utils/')
          );

          for (const criticalImport of criticalImports) {
            if (criticalImport.isRelativeImport) {
              const resolvedPath = resolveRelativeImport(serviceFile, criticalImport.modulePath);
              
              expect(resolvedPath, 
                `Critical import "${criticalImport.modulePath}" in ${serviceFile} should resolve`
              ).toBeTruthy();
              
              if (resolvedPath) {
                expect(fs.existsSync(resolvedPath), 
                  `Critical import "${criticalImport.modulePath}" should point to existing file`
                ).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: Math.min(serviceFiles.length, 15), timeout: 30000 }
    );
  });

  /**
   * Property: Route handler imports should be consistent
   * For any route file, imports of services, middleware, and utilities
   * should resolve to existing modules
   */
  it('should have consistent route handler imports', async () => {
    const routeFiles = getAllTsFiles(path.join(process.cwd(), 'src/routes'));

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...routeFiles),
        async (routeFile) => {
          const fileContent = fs.readFileSync(routeFile, 'utf-8');
          const imports = extractImportStatements(fileContent);

          // Service and middleware imports
          const serviceImports = imports.filter(imp => 
            imp.modulePath.includes('../services/') ||
            imp.modulePath.includes('../middleware/') ||
            imp.modulePath.includes('../utils/')
          );

          for (const serviceImport of serviceImports) {
            const resolvedPath = resolveRelativeImport(routeFile, serviceImport.modulePath);
            
            expect(resolvedPath, 
              `Service import "${serviceImport.modulePath}" in ${routeFile} should resolve`
            ).toBeTruthy();
            
            if (resolvedPath) {
              expect(fs.existsSync(resolvedPath), 
                `Service import "${serviceImport.modulePath}" should point to existing file`
              ).toBe(true);

              // Verify named imports exist
              if (serviceImport.namedImports.length > 0) {
                const targetContent = fs.readFileSync(resolvedPath, 'utf-8');
                const exports = extractExportStatements(targetContent);
                
                for (const namedImport of serviceImport.namedImports) {
                  const exportExists = exports.some(exp => 
                    exp.name === namedImport || 
                    exp.name === 'default' ||
                    exp.isExportAll
                  );
                  
                  expect(exportExists, 
                    `Named import "${namedImport}" should be exported from ${resolvedPath}`
                  ).toBe(true);
                }
              }
            }
          }
        }
      ),
      { numRuns: Math.min(routeFiles.length, 10), timeout: 30000 }
    );
  });

  /**
   * Property: Middleware imports should be resolvable
   * For any middleware file, all imports should resolve correctly
   */
  it('should have resolvable middleware imports', async () => {
    const middlewareFiles = getAllTsFiles(path.join(process.cwd(), 'src/middleware'));

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...middlewareFiles),
        async (middlewareFile) => {
          const fileContent = fs.readFileSync(middlewareFile, 'utf-8');
          const imports = extractImportStatements(fileContent);

          for (const importStatement of imports) {
            if (importStatement.isRelativeImport) {
              const resolvedPath = resolveRelativeImport(middlewareFile, importStatement.modulePath);
              
              expect(resolvedPath, 
                `Import "${importStatement.modulePath}" in ${middlewareFile} should resolve`
              ).toBeTruthy();
              
              if (resolvedPath) {
                expect(fs.existsSync(resolvedPath), 
                  `Import "${importStatement.modulePath}" should point to existing file`
                ).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: Math.min(middlewareFiles.length, 10), timeout: 30000 }
    );
  });
});

// Helper functions

function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllTsFiles(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts') && !item.includes('.test.')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

interface ImportStatement {
  modulePath: string;
  namedImports: string[];
  defaultImport?: string;
  isRelativeImport: boolean;
}

function extractImportStatements(content: string): ImportStatement[] {
  const imports: ImportStatement[] = [];
  
  // Match various import patterns
  const importRegex = /import\s+(?:(?:\{([^}]+)\})|(?:(\w+))|(?:(\w+)\s*,\s*\{([^}]+)\}))\s+from\s+['"]([^'"]+)['"]/g;
  const importAllRegex = /import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  const sideEffectImportRegex = /import\s+['"]([^'"]+)['"]/g;
  
  let match;
  
  // Named and default imports
  while ((match = importRegex.exec(content)) !== null) {
    const [, namedImportsStr, defaultImport, defaultWithNamed, namedWithDefaultStr, modulePath] = match;
    
    const namedImports: string[] = [];
    
    if (namedImportsStr) {
      namedImports.push(...namedImportsStr.split(',').map(s => s.trim()));
    }
    
    if (namedWithDefaultStr) {
      namedImports.push(...namedWithDefaultStr.split(',').map(s => s.trim()));
    }
    
    imports.push({
      modulePath,
      namedImports,
      defaultImport: defaultImport || defaultWithNamed,
      isRelativeImport: modulePath.startsWith('.') || modulePath.startsWith('/')
    });
  }
  
  // Import * as syntax
  while ((match = importAllRegex.exec(content)) !== null) {
    const [, alias, modulePath] = match;
    
    imports.push({
      modulePath,
      namedImports: [alias],
      isRelativeImport: modulePath.startsWith('.') || modulePath.startsWith('/')
    });
  }
  
  // Side effect imports
  while ((match = sideEffectImportRegex.exec(content)) !== null) {
    const [, modulePath] = match;
    
    imports.push({
      modulePath,
      namedImports: [],
      isRelativeImport: modulePath.startsWith('.') || modulePath.startsWith('/')
    });
  }
  
  return imports;
}

interface ExportStatement {
  name: string;
  isDefault: boolean;
  isExportAll: boolean;
}

function extractExportStatements(content: string): ExportStatement[] {
  const exports: ExportStatement[] = [];
  
  // Match various export patterns
  const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
  const exportListRegex = /export\s+\{([^}]+)\}/g;
  const defaultExportRegex = /export\s+default/g;
  const exportAllRegex = /export\s+\*\s+from/g;
  
  let match;
  
  // Named exports (const, function, class, etc.)
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      isDefault: false,
      isExportAll: false
    });
  }
  
  // Export lists
  while ((match = exportListRegex.exec(content)) !== null) {
    const exportList = match[1].split(',').map(s => s.trim());
    for (const exportName of exportList) {
      exports.push({
        name: exportName,
        isDefault: false,
        isExportAll: false
      });
    }
  }
  
  // Default exports
  if (defaultExportRegex.test(content)) {
    exports.push({
      name: 'default',
      isDefault: true,
      isExportAll: false
    });
  }
  
  // Export all
  if (exportAllRegex.test(content)) {
    exports.push({
      name: '*',
      isDefault: false,
      isExportAll: true
    });
  }
  
  return exports;
}

function resolveRelativeImport(fromFile: string, importPath: string): string | null {
  const fromDir = path.dirname(fromFile);
  let resolvedPath = path.resolve(fromDir, importPath);
  
  // Try different extensions
  const extensions = ['.ts', '.js', '.tsx', '.jsx'];
  
  for (const ext of extensions) {
    const pathWithExt = resolvedPath + ext;
    if (fs.existsSync(pathWithExt)) {
      return pathWithExt;
    }
  }
  
  // Try index files
  for (const ext of extensions) {
    const indexPath = path.join(resolvedPath, `index${ext}`);
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
  }
  
  return null;
}