/**
 * Property-based tests for dependency completeness
 * 
 * Property 5: Dependency Resolution Completeness
 * For any import from node_modules, there should exist a corresponding 
 * entry in package.json dependencies
 * 
 * Validates: Requirements 2.1, 2.2
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Dependency Completeness Properties', () => {
  /**
   * Property: All node_modules imports should be declared in package.json
   * For any import from node_modules, the package should be listed in
   * dependencies or devDependencies
   */
  it('should have all node_modules imports declared in package.json', async () => {
    const backendPackageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
    );
    
    const frontendPackageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'frontend/package.json'), 'utf-8')
    );

    const backendFiles = getAllTsFiles(path.join(process.cwd(), 'src'));
    const frontendFiles = getAllTsFiles(path.join(process.cwd(), 'frontend/src'));

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...[...backendFiles, ...frontendFiles]),
        async (filePath) => {
          const isBackend = filePath.includes('/src/') && !filePath.includes('/frontend/');
          const packageJson = isBackend ? backendPackageJson : frontendPackageJson;
          
          const allDependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };

          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const nodeModulesImports = extractNodeModulesImports(fileContent);

          for (const importPath of nodeModulesImports) {
            const packageName = getPackageNameFromImport(importPath);
            
            // Skip built-in Node.js modules
            if (isBuiltInModule(packageName)) {
              continue;
            }

            expect(allDependencies[packageName], 
              `Package "${packageName}" imported in ${filePath} should be declared in package.json`
            ).toBeDefined();
          }
        }
      ),
      { numRuns: Math.min(backendFiles.length + frontendFiles.length, 30), timeout: 30000 }
    );
  });

  /**
   * Property: Critical dependencies should be available
   * For any critical dependency (Prisma, Express, React, etc.), it should
   * be properly declared and importable
   */
  it('should have all critical dependencies properly declared', async () => {
    const criticalBackendDeps = [
      '@prisma/client',
      'express',
      'bcrypt',
      'jsonwebtoken',
      'cors',
      'helmet',
      'redis',
      'socket.io',
      'multer',
      'nodemailer'
    ];

    const criticalFrontendDeps = [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'recharts',
      '@radix-ui/react-select',
      'lucide-react',
      'tailwindcss'
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...criticalBackendDeps),
        async (dependency) => {
          const backendPackageJson = JSON.parse(
            fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
          );
          
          const allBackendDeps = {
            ...backendPackageJson.dependencies,
            ...backendPackageJson.devDependencies
          };

          expect(allBackendDeps[dependency], 
            `Critical backend dependency "${dependency}" should be declared in package.json`
          ).toBeDefined();
        }
      ),
      { numRuns: criticalBackendDeps.length, timeout: 10000 }
    );

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...criticalFrontendDeps),
        async (dependency) => {
          const frontendPackageJson = JSON.parse(
            fs.readFileSync(path.join(process.cwd(), 'frontend/package.json'), 'utf-8')
          );
          
          const allFrontendDeps = {
            ...frontendPackageJson.dependencies,
            ...frontendPackageJson.devDependencies
          };

          expect(allFrontendDeps[dependency], 
            `Critical frontend dependency "${dependency}" should be declared in frontend/package.json`
          ).toBeDefined();
        }
      ),
      { numRuns: criticalFrontendDeps.length, timeout: 10000 }
    );
  });

  /**
   * Property: TypeScript type dependencies should be available
   * For any @types/ import or TypeScript-specific dependency, it should
   * be properly declared
   */
  it('should have all TypeScript type dependencies declared', async () => {
    const backendFiles = getAllTsFiles(path.join(process.cwd(), 'src'));
    const frontendFiles = getAllTsFiles(path.join(process.cwd(), 'frontend/src'));

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...[...backendFiles, ...frontendFiles]),
        async (filePath) => {
          const isBackend = filePath.includes('/src/') && !filePath.includes('/frontend/');
          const packageJsonPath = isBackend 
            ? path.join(process.cwd(), 'package.json')
            : path.join(process.cwd(), 'frontend/package.json');
          
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
          const allDependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };

          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const nodeModulesImports = extractNodeModulesImports(fileContent);

          for (const importPath of nodeModulesImports) {
            const packageName = getPackageNameFromImport(importPath);
            
            // Check if this is a package that typically needs @types
            if (needsTypeDefinitions(packageName) && !packageName.startsWith('@types/')) {
              const typesPackage = `@types/${packageName}`;
              
              // Either the main package should include types, or @types package should exist
              const hasMainPackage = allDependencies[packageName];
              const hasTypesPackage = allDependencies[typesPackage];
              
              expect(hasMainPackage || hasTypesPackage, 
                `Package "${packageName}" or its types "${typesPackage}" should be declared for ${filePath}`
              ).toBeTruthy();
            }
          }
        }
      ),
      { numRuns: Math.min(backendFiles.length + frontendFiles.length, 20), timeout: 30000 }
    );
  });

  /**
   * Property: Development dependencies should be properly categorized
   * For any development-only dependency (testing, building, etc.), it should
   * be in devDependencies, not dependencies
   */
  it('should have development dependencies properly categorized', async () => {
    const devOnlyPackages = [
      'vitest',
      'typescript',
      '@types/',
      'eslint',
      'prettier',
      'vite',
      'tailwindcss',
      'autoprefixer',
      'postcss',
      '@vitejs/',
      'fast-check'
    ];

    const backendPackageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
    );
    
    const frontendPackageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'frontend/package.json'), 'utf-8')
    );

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...devOnlyPackages),
        async (devPattern) => {
          // Check backend package.json
          for (const [depName, version] of Object.entries(backendPackageJson.dependencies || {})) {
            if (depName.includes(devPattern) || depName.startsWith(devPattern)) {
              // This should be in devDependencies instead
              expect(backendPackageJson.devDependencies?.[depName], 
                `Development dependency "${depName}" should be in devDependencies, not dependencies`
              ).toBeDefined();
            }
          }

          // Check frontend package.json
          for (const [depName, version] of Object.entries(frontendPackageJson.dependencies || {})) {
            if (depName.includes(devPattern) || depName.startsWith(devPattern)) {
              // Some exceptions for frontend (like tailwindcss might be in dependencies)
              const isException = ['tailwindcss'].includes(depName);
              
              if (!isException) {
                expect(frontendPackageJson.devDependencies?.[depName], 
                  `Development dependency "${depName}" should be in devDependencies, not dependencies`
                ).toBeDefined();
              }
            }
          }
        }
      ),
      { numRuns: devOnlyPackages.length, timeout: 10000 }
    );
  });

  /**
   * Property: Package versions should be compatible
   * For any package that has peer dependencies or version constraints,
   * the declared versions should be compatible
   */
  it('should have compatible package versions', async () => {
    const packageJsons = [
      { path: path.join(process.cwd(), 'package.json'), name: 'backend' },
      { path: path.join(process.cwd(), 'frontend/package.json'), name: 'frontend' }
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...packageJsons),
        async (pkg) => {
          const packageJson = JSON.parse(fs.readFileSync(pkg.path, 'utf-8'));
          const allDependencies = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };

          // Check for common version conflicts
          const versionChecks = [
            // React ecosystem
            { packages: ['react', 'react-dom'], shouldMatch: true },
            { packages: ['@types/react', '@types/react-dom'], shouldMatch: true },
            
            // TypeScript ecosystem
            { packages: ['typescript', '@types/node'], compatible: true },
            
            // Testing ecosystem
            { packages: ['vitest', '@vitest/ui'], compatible: true }
          ];

          for (const check of versionChecks) {
            const presentPackages = check.packages.filter(p => allDependencies[p]);
            
            if (presentPackages.length > 1 && check.shouldMatch) {
              // For packages that should have matching versions
              const versions = presentPackages.map(p => allDependencies[p]);
              const majorVersions = versions.map(v => v.replace(/[^\d.].*/, '').split('.')[0]);
              
              // All major versions should be the same
              const uniqueMajorVersions = [...new Set(majorVersions)];
              expect(uniqueMajorVersions.length, 
                `Packages ${presentPackages.join(', ')} should have compatible major versions in ${pkg.name}`
              ).toBeLessThanOrEqual(1);
            }
          }
        }
      ),
      { numRuns: packageJsons.length, timeout: 10000 }
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
    
    if (stat.isDirectory() && item !== 'node_modules') {
      files.push(...getAllTsFiles(fullPath));
    } else if ((item.endsWith('.ts') || item.endsWith('.tsx')) && 
               !item.endsWith('.d.ts') && 
               !item.includes('.test.')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function extractNodeModulesImports(content: string): string[] {
  const imports: string[] = [];
  
  // Match various import patterns for node_modules
  const importRegex = /import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip relative imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
      imports.push(importPath);
    }
  }
  
  return imports;
}

function getPackageNameFromImport(importPath: string): string {
  // Handle scoped packages (@scope/package)
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  
  // Handle regular packages
  return importPath.split('/')[0];
}

function isBuiltInModule(packageName: string): boolean {
  const builtInModules = [
    'fs', 'path', 'crypto', 'http', 'https', 'url', 'querystring',
    'util', 'events', 'stream', 'buffer', 'os', 'child_process',
    'cluster', 'net', 'tls', 'dgram', 'dns', 'readline', 'repl',
    'vm', 'zlib', 'assert', 'console', 'module', 'process',
    'timers', 'tty', 'domain', 'punycode', 'string_decoder',
    'constants', 'sys', 'inspector'
  ];
  
  return builtInModules.includes(packageName);
}

function needsTypeDefinitions(packageName: string): boolean {
  // Packages that typically need @types definitions
  const packagesNeedingTypes = [
    'express',
    'node',
    'bcrypt',
    'jsonwebtoken',
    'cors',
    'helmet',
    'multer',
    'nodemailer',
    'redis',
    'jest',
    'supertest'
  ];
  
  return packagesNeedingTypes.includes(packageName);
}