#!/usr/bin/env node

/**
 * Script to replace remaining hardcoded color classes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Additional color class mappings for colors we missed
const replacements = [
  // More text colors
  { from: /\btext-green-500\b/g, to: 'ds-text-success' },
  { from: /\btext-green-400\b/g, to: 'ds-text-success' },
  { from: /\btext-red-400\b/g, to: 'ds-text-error' },
  { from: /\btext-red-600\b/g, to: 'ds-text-error' },
  { from: /\btext-blue-400\b/g, to: 'ds-text-info' },
  { from: /\btext-indigo-700\b/g, to: 'ds-text-primary-700' },
  
  // More background colors
  { from: /\bbg-red-700\b/g, to: 'ds-bg-error' },
  { from: /\bbg-green-400\b/g, to: 'ds-bg-success' },
  { from: /\bbg-green-500\b/g, to: 'ds-bg-success' },
  
  // Hover states for red (error)
  { from: /\bhover:bg-red-700\b/g, to: 'hover:ds-bg-error' },
  
  // Focus ring colors (keep these as Tailwind for now as they're part of focus states)
  // We'll handle these separately if needed
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
console.log('Replacing remaining hardcoded color classes...\n');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const componentsDir = path.join(__dirname, '..', 'src', 'components');

console.log('Processing pages...');
const pagesCount = processDirectory(pagesDir);

console.log('\nProcessing components...');
const componentsCount = processDirectory(componentsDir);

console.log(`\n✓ Complete! Total replacements: ${pagesCount + componentsCount}`);
