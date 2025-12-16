#!/usr/bin/env node

/**
 * Script to clean up color replacement issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const replacements = [
  // Fix double-prefixed classes
  { from: /ds-ds-text-primary-600/g, to: 'ds-text-primary-600' },
  { from: /ds-ds-bg-/g, to: 'ds-bg-' },
  { from: /ds-ds-border-/g, to: 'ds-border-' },
  
  // Fix hover states that got broken
  { from: /hover:ds-bg-/g, to: 'ds-hover-bg-' },
  { from: /hover:ds-text-/g, to: 'ds-hover-text-' },
  
  // Replace focus ring colors (indigo -> primary)
  { from: /focus:border-indigo-500/g, to: 'focus:ds-border-primary-600' },
  { from: /focus:ring-indigo-500/g, to: 'focus:ring-primary-600' },
  { from: /focus-within:ring-indigo-500/g, to: 'focus-within:ring-primary-600' },
  { from: /hover:text-indigo-500/g, to: 'ds-hover-text-primary-600' },
  
  // Replace checkbox/radio colors
  { from: /ds-text-primary-600 ds-border-gray-300/g, to: 'text-primary-600 ds-border-gray-300' },
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
    console.log(`✓ ${path.basename(filePath)}: ${count} fixes`);
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

console.log('Cleaning up color replacement issues...\n');

const pagesDir = path.join(__dirname, '..', 'src', 'pages');
const componentsDir = path.join(__dirname, '..', 'src', 'components');

console.log('Processing pages...');
const pagesCount = processDirectory(pagesDir);

console.log('\nProcessing components...');
const componentsCount = processDirectory(componentsDir);

console.log(`\n✓ Complete! Total fixes: ${pagesCount + componentsCount}`);
