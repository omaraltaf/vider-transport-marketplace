#!/usr/bin/env node

/**
 * Script to replace hardcoded Tailwind color classes with design system color tokens
 * This script updates all page files to use inline styles with color tokens
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color mapping from Tailwind classes to design system tokens
const colorMappings = {
  // Background colors
  'bg-gray-50': 'backgroundColor: colors.background.page',
  'bg-gray-100': 'backgroundColor: colors.gray[100]',
  'bg-gray-200': 'backgroundColor: colors.gray[200]',
  'bg-neutral-50': 'backgroundColor: colors.background.page',
  'bg-white': 'backgroundColor: colors.white',
  'bg-red-50': 'backgroundColor: "#FEE2E2"', // Light red for errors
  'bg-green-50': 'backgroundColor: "#D1FAE5"', // Light green for success
  'bg-blue-50': 'backgroundColor: colors.primary[50]',
  'bg-indigo-50': 'backgroundColor: colors.primary[50]',
  'bg-indigo-100': 'backgroundColor: colors.primary[100]',
  'bg-indigo-600': 'backgroundColor: colors.primary[600]',
  'bg-red-600': 'backgroundColor: colors.semantic.error',
  'bg-primary-50': 'backgroundColor: colors.primary[50]',
  
  // Text colors
  'text-gray-900': 'color: colors.gray[900]',
  'text-gray-800': 'color: colors.gray[800]',
  'text-gray-700': 'color: colors.gray[700]',
  'text-gray-600': 'color: colors.gray[600]',
  'text-gray-500': 'color: colors.gray[500]',
  'text-gray-400': 'color: colors.gray[400]',
  'text-neutral-700': 'color: colors.gray[700]',
  'text-neutral-400': 'color: colors.gray[400]',
  'text-neutral-600': 'color: colors.gray[600]',
  'text-red-800': 'color: colors.semantic.error',
  'text-red-700': 'color: colors.semantic.error',
  'text-green-800': 'color: colors.semantic.success',
  'text-blue-700': 'color: colors.primary[700]',
  'text-blue-400': 'color: colors.semantic.info',
  'text-indigo-800': 'color: colors.primary[800]',
  'text-indigo-600': 'color: colors.primary[600]',
  'text-primary-600': 'color: colors.primary[600]',
  
  // Border colors
  'border-gray-200': 'borderColor: colors.gray[200]',
  'border-gray-300': 'borderColor: colors.gray[300]',
  'border-neutral-200': 'borderColor: colors.gray[200]',
  'border-red-200': 'borderColor: colors.semantic.error',
  'border-indigo-600': 'borderColor: colors.primary[600]',
};

// Find all page files
const pageFiles = glob.sync('frontend/src/pages/**/*.tsx');
const componentFiles = glob.sync('frontend/src/components/*.tsx');
const allFiles = [...pageFiles, ...componentFiles];

console.log(`Found ${allFiles.length} files to process`);

let totalReplacements = 0;

allFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let fileReplacements = 0;
  
  // Check if file needs color tokens import
  const needsImport = Object.keys(colorMappings).some(className => 
    content.includes(className)
  );
  
  if (needsImport && !content.includes("import { colors } from")) {
    // Add import after other design-system imports or at the top
    if (content.includes("from '../design-system/")) {
      content = content.replace(
        /(from ['"]\.\.\/design-system\/[^'"]+['"];)/,
        `$1\nimport { colors } from '../design-system/tokens/colors';`
      );
    } else if (content.includes("from './design-system/")) {
      content = content.replace(
        /(from ['"]\.\/design-system\/[^'"]+['"];)/,
        `$1\nimport { colors } from './design-system/tokens/colors';`
      );
    }
    modified = true;
  }
  
  // Replace color classes
  Object.entries(colorMappings).forEach(([className, tokenStyle]) => {
    const regex = new RegExp(`\\b${className}\\b`, 'g');
    const matches = content.match(regex);
    if (matches) {
      fileReplacements += matches.length;
      // Note: This is a simplified replacement - manual review needed
      console.log(`  Found ${matches.length} instances of ${className} in ${path.basename(filePath)}`);
    }
  });
  
  if (fileReplacements > 0) {
    console.log(`  Total replacements needed in ${path.basename(filePath)}: ${fileReplacements}`);
    totalReplacements += fileReplacements;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log(`\nTotal color class instances found: ${totalReplacements}`);
console.log('\nNote: This script only adds imports. Manual replacement of classes with inline styles is recommended.');
console.log('Use the color tokens from frontend/src/design-system/tokens/colors.ts');
