#!/bin/bash

# Script to replace hardcoded Tailwind color classes with design system utility classes
# This preserves the class-based approach while using design tokens

echo "Replacing hardcoded color classes with design system utilities..."

# Define the directories to process
PAGES_DIR="src/pages"
COMPONENTS_DIR="src/components"

# Function to replace colors in files
replace_colors() {
  local dir=$1
  
  # Background colors - page/neutral
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\bbg-gray-50\b/ds-bg-page/g' \
    -e 's/\bbg-neutral-50\b/ds-bg-page/g' \
    {} \;
  
  # Background colors - grays
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\bbg-gray-100\b/ds-bg-gray-100/g' \
    -e 's/\bbg-gray-200\b/ds-bg-gray-200/g' \
    {} \;
  
  # Background colors - primary (indigo -> primary)
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\bbg-indigo-50\b/ds-bg-primary-50/g' \
    -e 's/\bbg-indigo-100\b/ds-bg-primary-100/g' \
    -e 's/\bbg-indigo-600\b/ds-bg-primary-600/g' \
    -e 's/\bbg-blue-50\b/ds-bg-primary-50/g' \
    -e 's/\bbg-primary-50\b/ds-bg-primary-50/g' \
    {} \;
  
  # Background colors - semantic
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\bbg-red-50\b/ds-bg-error-light/g' \
    -e 's/\bbg-red-600\b/ds-bg-error/g' \
    -e 's/\bbg-green-50\b/ds-bg-success-light/g' \
    {} \;
  
  # Text colors - grays
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\btext-gray-400\b/ds-text-gray-400/g' \
    -e 's/\btext-gray-500\b/ds-text-gray-500/g' \
    -e 's/\btext-gray-600\b/ds-text-gray-600/g' \
    -e 's/\btext-gray-700\b/ds-text-gray-700/g' \
    -e 's/\btext-gray-800\b/ds-text-gray-800/g' \
    -e 's/\btext-gray-900\b/ds-text-gray-900/g' \
    -e 's/\btext-neutral-400\b/ds-text-gray-400/g' \
    -e 's/\btext-neutral-600\b/ds-text-gray-600/g' \
    -e 's/\btext-neutral-700\b/ds-text-gray-700/g' \
    {} \;
  
  # Text colors - primary (indigo -> primary)
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\btext-indigo-600\b/ds-text-primary-600/g' \
    -e 's/\btext-indigo-800\b/ds-text-primary-800/g' \
    -e 's/\btext-primary-600\b/ds-text-primary-600/g' \
    {} \;
  
  # Text colors - semantic
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\btext-red-700\b/ds-text-error/g' \
    -e 's/\btext-red-800\b/ds-text-error/g' \
    -e 's/\btext-green-800\b/ds-text-success/g' \
    -e 's/\btext-blue-700\b/ds-text-primary-700/g' \
    {} \;
  
  # Border colors
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\bborder-gray-200\b/ds-border-gray-200/g' \
    -e 's/\bborder-gray-300\b/ds-border-gray-300/g' \
    -e 's/\bborder-neutral-200\b/ds-border-gray-200/g' \
    -e 's/\bborder-indigo-600\b/ds-border-primary-600/g' \
    -e 's/\bborder-red-200\b/ds-border-error/g' \
    {} \;
  
  # Hover states
  find "$dir" -name "*.tsx" -type f -exec sed -i '' \
    -e 's/\bhover:bg-gray-50\b/ds-hover-bg-gray-50/g' \
    -e 's/\bhover:bg-gray-200\b/ds-hover-bg-gray-200/g' \
    -e 's/\bhover:bg-neutral-50\b/ds-hover-bg-gray-50/g' \
    -e 's/\bhover:text-gray-600\b/ds-hover-text-gray-600/g' \
    -e 's/\bhover:text-neutral-600\b/ds-hover-text-gray-600/g' \
    {} \;
}

# Replace in pages
echo "Processing pages..."
replace_colors "$PAGES_DIR"

# Replace in components
echo "Processing components..."
replace_colors "$COMPONENTS_DIR"

echo "Color replacement complete!"
echo "Note: Please review the changes and test thoroughly."
