/**
 * Property-based tests for build output validity
 * 
 * Property 6: Build Output Validity
 * For any successful build process, the generated assets should be 
 * syntactically valid and executable
 * 
 * Validates: Requirements 2.4, 4.5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

describe('Build Output Validity Properties', () => {
  const testBuildDir = path.join(process.cwd(), 'test-build-output');
  const frontendTestBuildDir = path.join(process.cwd(), 'frontend/test-dist');

  beforeAll(async () => {
    // Clean up any existing test build directories
    if (fs.existsSync(testBuildDir)) {
      fs.rmSync(testBuildDir, { recursive: true, force: true });
    }
    if (fs.existsSync(frontendTestBuildDir)) {
      fs.rmSync(frontendTestBuildDir, { recursive: true, force: true });
    }
  });

  afterAll(async () => {
    // Clean up test build directories
    if (fs.existsSync(testBuildDir)) {
      fs.rmSync(testBuildDir, { recursive: true, force: true });
    }
    if (fs.existsSync(frontendTestBuildDir)) {
      fs.rmSync(frontendTestBuildDir, { recursive: true, force: true });
    }
  });

  /**
   * Property: TypeScript compilation should produce valid JavaScript
   * For any TypeScript source file, the compiled JavaScript should be
   * syntactically valid and executable
   */
  it('should produce valid JavaScript from TypeScript compilation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('src/app.ts', 'src/server.ts'),
        async (entryFile) => {
          // Compile TypeScript to test directory
          try {
            execSync(`npx tsc --outDir ${testBuildDir} --target es2020 --module commonjs --esModuleInterop true --skipLibCheck true ${entryFile}`, {
              cwd: process.cwd(),
              stdio: 'pipe'
            });

            // Check that output files exist
            const outputFile = path.join(testBuildDir, entryFile.replace('.ts', '.js'));
            expect(fs.existsSync(outputFile), 
              `Compiled JavaScript file should exist: ${outputFile}`
            ).toBe(true);

            // Verify the JavaScript is syntactically valid
            const jsContent = fs.readFileSync(outputFile, 'utf-8');
            
            // Basic syntax validation - should not throw
            expect(() => {
              new Function(jsContent);
            }, `Compiled JavaScript should be syntactically valid: ${outputFile}`).not.toThrow();

            // Check for common compilation artifacts
            expect(jsContent).toContain('exports'); // CommonJS exports
            expect(jsContent.length).toBeGreaterThan(0);
            
            // Should not contain TypeScript-specific syntax
            expect(jsContent).not.toMatch(/:\s*\w+\s*[=;]/); // Type annotations
            expect(jsContent).not.toContain('interface ');
            expect(jsContent).not.toContain('type ');

          } catch (error) {
            throw new Error(`TypeScript compilation failed for ${entryFile}: ${error}`);
          }
        }
      ),
      { numRuns: 2, timeout: 60000 }
    );
  });

  /**
   * Property: Frontend build should produce valid static assets
   * For any frontend build, the generated assets should be valid HTML, CSS, and JS
   */
  it('should produce valid frontend static assets', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant('frontend'),
        async (frontendDir) => {
          try {
            // Run frontend build
            execSync('npm run build', {
              cwd: path.join(process.cwd(), frontendDir),
              stdio: 'pipe'
            });

            const distDir = path.join(process.cwd(), frontendDir, 'dist');
            expect(fs.existsSync(distDir), 
              'Frontend dist directory should exist after build'
            ).toBe(true);

            // Check for essential files
            const indexHtml = path.join(distDir, 'index.html');
            expect(fs.existsSync(indexHtml), 
              'index.html should exist in dist directory'
            ).toBe(true);

            // Validate HTML structure
            const htmlContent = fs.readFileSync(indexHtml, 'utf-8');
            expect(htmlContent).toContain('<!DOCTYPE html>');
            expect(htmlContent).toContain('<html');
            expect(htmlContent).toContain('<head>');
            expect(htmlContent).toContain('<body>');
            expect(htmlContent).toContain('<div id="root">');

            // Check for bundled JavaScript files
            const jsFiles = findFilesWithExtension(distDir, '.js');
            expect(jsFiles.length, 
              'Should have at least one JavaScript bundle'
            ).toBeGreaterThan(0);

            // Validate JavaScript bundles
            for (const jsFile of jsFiles.slice(0, 3)) { // Check first 3 files
              const jsContent = fs.readFileSync(jsFile, 'utf-8');
              
              // Should be valid JavaScript
              expect(() => {
                new Function(jsContent);
              }, `JavaScript bundle should be syntactically valid: ${jsFile}`).not.toThrow();
              
              expect(jsContent.length).toBeGreaterThan(0);
            }

            // Check for CSS files
            const cssFiles = findFilesWithExtension(distDir, '.css');
            if (cssFiles.length > 0) {
              for (const cssFile of cssFiles.slice(0, 2)) { // Check first 2 files
                const cssContent = fs.readFileSync(cssFile, 'utf-8');
                
                // Basic CSS validation - should not contain obvious syntax errors
                expect(cssContent).not.toContain('undefined');
                expect(cssContent).not.toMatch(/\{\s*\}/); // Empty rules are ok but suspicious
              }
            }

          } catch (error) {
            throw new Error(`Frontend build failed: ${error}`);
          }
        }
      ),
      { numRuns: 1, timeout: 120000 }
    );
  });

  /**
   * Property: Build artifacts should have correct file permissions and structure
   * For any build output, the file structure should be correct and files should
   * have appropriate permissions
   */
  it('should produce build artifacts with correct structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('backend', 'frontend'),
        async (buildType) => {
          if (buildType === 'backend') {
            // Test backend TypeScript compilation
            try {
              execSync(`npx tsc --outDir ${testBuildDir} --skipLibCheck true`, {
                cwd: process.cwd(),
                stdio: 'pipe'
              });

              // Check directory structure
              expect(fs.existsSync(testBuildDir)).toBe(true);
              
              const srcDir = path.join(testBuildDir, 'src');
              expect(fs.existsSync(srcDir), 
                'Compiled src directory should exist'
              ).toBe(true);

              // Check for essential compiled files
              const essentialFiles = ['app.js', 'server.js'];
              for (const file of essentialFiles) {
                const filePath = path.join(srcDir, file);
                if (fs.existsSync(path.join(process.cwd(), 'src', file.replace('.js', '.ts')))) {
                  expect(fs.existsSync(filePath), 
                    `Essential compiled file should exist: ${file}`
                  ).toBe(true);
                  
                  // Check file permissions (should be readable)
                  const stats = fs.statSync(filePath);
                  expect(stats.isFile()).toBe(true);
                  expect(stats.size).toBeGreaterThan(0);
                }
              }

            } catch (error) {
              throw new Error(`Backend build structure validation failed: ${error}`);
            }

          } else {
            // Test frontend build structure
            try {
              execSync('npm run build', {
                cwd: path.join(process.cwd(), 'frontend'),
                stdio: 'pipe'
              });

              const distDir = path.join(process.cwd(), 'frontend', 'dist');
              
              // Check basic structure
              expect(fs.existsSync(distDir)).toBe(true);
              
              const stats = fs.statSync(distDir);
              expect(stats.isDirectory()).toBe(true);

              // Check for assets directory (if it exists)
              const assetsDir = path.join(distDir, 'assets');
              if (fs.existsSync(assetsDir)) {
                const assetStats = fs.statSync(assetsDir);
                expect(assetStats.isDirectory()).toBe(true);
                
                // Assets should contain bundled files
                const assetFiles = fs.readdirSync(assetsDir);
                expect(assetFiles.length).toBeGreaterThan(0);
              }

            } catch (error) {
              throw new Error(`Frontend build structure validation failed: ${error}`);
            }
          }
        }
      ),
      { numRuns: 2, timeout: 120000 }
    );
  });

  /**
   * Property: Build process should be deterministic
   * For any given source code state, multiple builds should produce
   * consistent output (within reasonable variance for timestamps, etc.)
   */
  it('should produce deterministic build outputs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant('deterministic-test'),
        async (testName) => {
          const build1Dir = path.join(testBuildDir, 'build1');
          const build2Dir = path.join(testBuildDir, 'build2');

          try {
            // First build
            execSync(`npx tsc --outDir ${build1Dir} --skipLibCheck true src/app.ts src/server.ts`, {
              cwd: process.cwd(),
              stdio: 'pipe'
            });

            // Wait a moment to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 100));

            // Second build
            execSync(`npx tsc --outDir ${build2Dir} --skipLibCheck true src/app.ts src/server.ts`, {
              cwd: process.cwd(),
              stdio: 'pipe'
            });

            // Compare build outputs (excluding timestamps and other variable content)
            const build1Files = getAllFiles(build1Dir);
            const build2Files = getAllFiles(build2Dir);

            // Should have same number of files
            expect(build1Files.length).toBe(build2Files.length);

            // Compare file contents (excluding comments with timestamps)
            for (const file1 of build1Files) {
              const relativePath = path.relative(build1Dir, file1);
              const file2 = path.join(build2Dir, relativePath);
              
              expect(fs.existsSync(file2), 
                `Corresponding file should exist in second build: ${relativePath}`
              ).toBe(true);

              const content1 = fs.readFileSync(file1, 'utf-8');
              const content2 = fs.readFileSync(file2, 'utf-8');

              // Remove timestamp-like patterns for comparison
              const normalized1 = content1.replace(/\/\*.*?\*\//gs, '').trim();
              const normalized2 = content2.replace(/\/\*.*?\*\//gs, '').trim();

              expect(normalized1).toBe(normalized2);
            }

          } catch (error) {
            throw new Error(`Deterministic build test failed: ${error}`);
          }
        }
      ),
      { numRuns: 1, timeout: 60000 }
    );
  });

  /**
   * Property: Build outputs should not contain development artifacts
   * For any production build, the output should not contain development-only
   * code, console.log statements, or debug information
   */
  it('should not contain development artifacts in production builds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('production-backend', 'production-frontend'),
        async (buildType) => {
          if (buildType === 'production-backend') {
            try {
              // Build with production settings
              execSync(`npx tsc --outDir ${testBuildDir} --skipLibCheck true --removeComments true`, {
                cwd: process.cwd(),
                stdio: 'pipe'
              });

              const jsFiles = findFilesWithExtension(testBuildDir, '.js');
              
              for (const jsFile of jsFiles.slice(0, 5)) { // Check first 5 files
                const content = fs.readFileSync(jsFile, 'utf-8');
                
                // Should not contain obvious development artifacts
                expect(content).not.toContain('console.debug');
                expect(content).not.toContain('debugger;');
                
                // Should not contain TypeScript comments (if removeComments is working)
                expect(content).not.toMatch(/\/\*\*[\s\S]*?\*\//); // JSDoc comments
              }

            } catch (error) {
              throw new Error(`Production backend build validation failed: ${error}`);
            }

          } else {
            try {
              // Frontend production build
              execSync('npm run build', {
                cwd: path.join(process.cwd(), 'frontend'),
                stdio: 'pipe',
                env: { ...process.env, NODE_ENV: 'production' }
              });

              const distDir = path.join(process.cwd(), 'frontend', 'dist');
              const jsFiles = findFilesWithExtension(distDir, '.js');
              
              for (const jsFile of jsFiles.slice(0, 3)) { // Check first 3 files
                const content = fs.readFileSync(jsFile, 'utf-8');
                
                // Production builds should be minified (no unnecessary whitespace)
                const lines = content.split('\n');
                const nonEmptyLines = lines.filter(line => line.trim().length > 0);
                
                // Minified files typically have fewer lines relative to content
                if (content.length > 1000) {
                  expect(nonEmptyLines.length).toBeLessThan(content.length / 50);
                }
                
                // Should not contain development console statements
                expect(content).not.toContain('console.debug');
                expect(content).not.toContain('console.trace');
              }

            } catch (error) {
              throw new Error(`Production frontend build validation failed: ${error}`);
            }
          }
        }
      ),
      { numRuns: 2, timeout: 120000 }
    );
  });
});

// Helper functions

function findFilesWithExtension(dir: string, extension: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findFilesWithExtension(fullPath, extension));
    } else if (item.endsWith(extension)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function getAllFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}