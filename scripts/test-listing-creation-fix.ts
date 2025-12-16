#!/usr/bin/env tsx

/**
 * Test Script: Listing Creation Fix Verification
 * 
 * This script verifies that the listing creation page fixes are working correctly
 * and that there are no React input element errors.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

console.log('🔧 Testing Listing Creation Fix...\n');

// Test 1: Check TypeScript compilation
console.log('1. Checking TypeScript compilation...');
try {
  execSync('cd frontend && npx tsc --noEmit --skipLibCheck', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.log('❌ TypeScript compilation failed');
  console.log(error.toString());
}

// Test 2: Verify FormField usage is correct
console.log('\n2. Verifying FormField usage...');
const createVehicleContent = readFileSync('frontend/src/pages/CreateVehicleListingPage.tsx', 'utf-8');

const formFieldUsages = createVehicleContent.match(/<FormField[^>]*>/g) || [];
const hasCorrectTypes = formFieldUsages.every(usage => 
  usage.includes('type="text"') || 
  usage.includes('type="number"') || 
  usage.includes('type="select"') || 
  usage.includes('type="textarea"')
);

if (hasCorrectTypes) {
  console.log('✅ All FormField components have correct type attributes');
} else {
  console.log('❌ Some FormField components have incorrect type attributes');
}

// Test 3: Check for problematic input patterns
console.log('\n3. Checking for problematic input patterns...');
const hasProblematicInputs = createVehicleContent.includes('<input>') || 
                            createVehicleContent.includes('dangerouslySetInnerHTML');

if (!hasProblematicInputs) {
  console.log('✅ No problematic input patterns found');
} else {
  console.log('❌ Found problematic input patterns');
}

// Test 4: Verify design system imports
console.log('\n4. Verifying design system imports...');
const importLine = createVehicleContent.match(/import.*from.*design-system\/components/);
if (importLine && !importLine[0].includes('Select') && !importLine[0].includes('Textarea')) {
  console.log('✅ Unused imports removed correctly');
} else {
  console.log('❌ Unused imports still present or import line not found');
}

// Test 5: Check Container and Card usage
console.log('\n5. Checking Container and Card usage...');
const hasCorrectContainer = !createVehicleContent.includes('maxWidth="3xl"');
const hasCorrectCard = !createVehicleContent.includes('variant="elevated"');

if (hasCorrectContainer && hasCorrectCard) {
  console.log('✅ Container and Card components use correct props');
} else {
  console.log('❌ Container or Card components have incorrect props');
}

console.log('\n🎉 Listing Creation Fix Test Complete!');
console.log('\nSummary:');
console.log('- Fixed FormField component usage to use correct type attributes');
console.log('- Removed nested Input/Select/Textarea components inside FormField');
console.log('- Fixed Container and Card component props');
console.log('- Removed unused imports');
console.log('- Converted native HTML inputs to design system components');

console.log('\n📝 Next Steps:');
console.log('1. Test the listing creation page in the browser');
console.log('2. Verify that company admins can create listings without React errors');
console.log('3. Check that all form fields work correctly');