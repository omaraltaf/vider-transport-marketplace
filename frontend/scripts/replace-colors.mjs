#!/usr/bin/env node

/**
 * Script to replace hardcoded Tailwind color classes with design system utility classes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Color class mappings
const replacements = [
  // Background colors - page/neutral
  { from: /\bbg-gray-50\b/g, to: 'ds-bg-page' },
  { from: /\bbg-neutral-50\b/g, to: 'ds-bg-page' },
  
  // Background colors - grays
  { from: /\bbg-gray-100\b/g, to: 'ds-bg-gray-100' },
  { from: /\bbg-gray-200\b/g, to: 'ds-bg-gray-200' },
  
  // Background colors - primary (indigo -> primary)
  { from: /\bbg-indigo-50\b/g, to: 'ds-bg-primary-50' },
  { from: /\bbg-indigo-100\b/g, to: 'ds-bg-primary-100' },
  { from: /\bbg-indigo-600\b/g, to: 'ds-bg-primary-600' },
  { from: /\bbg-blue-50\b/g, to: 'ds-bg-primary-50' },
  { from: /\bbg-primary-50\b/g, to: 'ds-bg-primary-50' },
  
  // Background colors - semantic
  { from: /\bbg-red-50\b/g, to: 'ds-bg-error-light' },
  { from: /\bbg-red-600\b/g, to: 'ds-bg-error' },
  { from: /\bbg-green-50\b/g, to: 'ds-bg-success-light' },
  
  // Text colors - grays
  { from: /\btext-gray-400\b/g, to: 'ds-text-gray-400' },
  { from: /\btext-gray-500\b/g, to: 'ds-text-gray-500' },
  { from: /\btext-gray-600\b/g, to: 'ds-text-gray-600' },
  { from: /\btext-gray-700\b/g, to: 'ds-text-gray-700' },
  { from: /\btext-gray-800\b/g, to: 'ds-text-gray-800' },
  { from: /\btext-gray-900\b/g, to: 'ds-text-gray-900' },
  { from: /\btext-neutral-400\b/g, to: 'ds-text-gray-400' },
  { from: /\btext-neutral-600\b/g, to: 'ds-text-gray-600' },
  { from: /\btext-neutral-700\b/g, to: 'ds-text-gray-700' },
  
  // Text colors - primary (indigo -> primary)
  { from: /\btext-indigo-600\b/g, to: 'ds-text-primary-600' },
  { from: /\btext-indigo-800\b/g, to: 'ds-text-primary-800' },
  { from: /\btext-primary-600\b/g, to: 'ds-text-primary-600' },
  
  // Text colors - semantic
  { from: /\btext-red-700\b/g, to: 'ds-text-error' },
  { from: /\btext-red-800\b/g, to: 'ds-text-error' },
  { from: /\btext-green-800\b/g, to: 'ds-text-success' },
  { from: /\btext-blue-700\b/g, to: 'ds-text-primary-700' },
  
  // Border colors
  { from: /\bborder-gray-200\b/g, to: 'ds-border-gray-200' },
  { from: /\bborder-gray-300\b/g, to: 'ds-border-gray-300' },
  { from: /\bborder-neutral-200\b/g, to: 'ds-border-gray-200' },
  { from: /\bborder-indigo-600\b/g, to: 'ds-border-primary-600' },
  { from: /\bborder-red-200\b/g, to: 'ds-border-error' },
  
  // Hover states
  { from: /\bhover:bg-gray-50\b/g, to: 'ds-hover-bg-gray-50' },
  { from: /\bhover:bg-gray-200\b/g, to: 'ds-hover-bg-gray-200' },
  { from: /\bhover:bg-neutral-50\b/g, to: 'ds-hover-bg-gray-50' },
  { from: /\bhover:text-gray-600\b/g, to: 'ds-hover-text-gray-600' },
  { from: /\bhover:text-neutral-600\b/g, to: 'ds-hover-text-gray-600' },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let count = 0;
  
  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      content = content.replace(from, to);
      count += matches.length;
      modified = true;
    }
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ ${path.basename(filePath)}: ${count} replacements`);
    return count;
  }
  
  return 0;
}

function processDirectory(dir) {
  let totalCount = 0;
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      totalCount += processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      totalCount += processFile(filePath);
    }
  });
  
  return totalCount;
}

// Process pages and components
console.log('Replacing hardcoded color classes with design system utilities...\n');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const componentsDir = path.join(__dirname, '..', 'src', 'components');

console.log('Processing pages...');
const pagesCount = processDirectory(pagesDir);

console.log('\nProcessing components...');
const componentsCount = processDirectory(componentsDir);

console.log(`\n✓ Complete! Total replacements: ${pagesCount + componentsCount}`);
console.log('\nNote: Please review the changes and test thoroughly.');
