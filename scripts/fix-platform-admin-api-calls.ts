#!/usr/bin/env tsx

/**
 * Script to fix platform admin components to use apiClient instead of direct fetch calls
 * This resolves the "Unexpected token '<', "<!doctype "... is not valid JSON" errors
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const componentsToFix = [
  'frontend/src/components/platform-admin/FeatureTogglePanel.tsx',
  'frontend/src/components/platform-admin/PlatformAnalyticsDashboard.tsx',
  'frontend/src/components/platform-admin/AnalyticsCharts.tsx',
  'frontend/src/components/platform-admin/CommissionRateManager.tsx',
  'frontend/src/components/platform-admin/FeatureConfigurationForm.tsx',
  'frontend/src/components/platform-admin/SystemHealthDashboard.tsx',
  'frontend/src/components/platform-admin/BackupManager.tsx',
  'frontend/src/components/platform-admin/AnalyticsFilters.tsx',
  'frontend/src/components/platform-admin/DisputeManagement.tsx',
  'frontend/src/components/platform-admin/SystemAuditViewer.tsx',
  'frontend/src/components/platform-admin/BlacklistManager.tsx',
  'frontend/src/components/platform-admin/FraudDetectionDashboard.tsx',
  'frontend/src/components/platform-admin/BulkOperationsPanel.tsx',
  'frontend/src/components/platform-admin/UserManagementPanel.tsx',
  'frontend/src/components/platform-admin/CompanyManagementPanel.tsx',
  'frontend/src/components/platform-admin/PlatformConfigurationPanel.tsx'
];

function fixComponent(filePath: string) {
  console.log(`Fixing ${filePath}...`);
  
  let content = readFileSync(filePath, 'utf8');
  
  // Add apiClient import if not present
  if (!content.includes("import { apiClient }")) {
    const importMatch = content.match(/import.*from ['"].*['"];?\n/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const importIndex = content.indexOf(lastImport) + lastImport.length;
      content = content.slice(0, importIndex) + 
                "import { apiClient } from '../../services/api';\n" + 
                content.slice(importIndex);
    }
  }
  
  // Replace fetch calls with apiClient calls
  // GET requests
  content = content.replace(
    /const response = await fetch\('\/api\/platform-admin([^']+)', \{\s*headers: \{\s*'Authorization': `Bearer \$\{[^}]+\}`[^}]*\}\s*\}\);?\s*if \(!response\.ok\) \{\s*throw new Error\([^)]+\);\s*\}\s*const data = await response\.json\(\);/g,
    "const data = await apiClient.get('/platform-admin$1', token || '');"
  );
  
  // Simpler GET pattern
  content = content.replace(
    /const response = await fetch\('\/api\/platform-admin([^']+)', \{\s*headers: \{\s*'Authorization': `Bearer \$\{[^}]+\}`[^}]*\}\s*\}\);/g,
    "const response = await apiClient.get('/platform-admin$1', token || '');"
  );
  
  // POST requests
  content = content.replace(
    /const response = await fetch\('\/api\/platform-admin([^']+)', \{\s*method: 'POST',\s*headers: \{\s*'Authorization': `Bearer \$\{[^}]+\}`,?\s*'Content-Type': 'application\/json',?\s*\},\s*body: JSON\.stringify\(([^)]+)\),?\s*\}\);/g,
    "const response = await apiClient.post('/platform-admin$1', $2, token || '');"
  );
  
  // PUT requests
  content = content.replace(
    /const response = await fetch\('\/api\/platform-admin([^']+)', \{\s*method: 'PUT',\s*headers: \{\s*'Authorization': `Bearer \$\{[^}]+\}`,?\s*'Content-Type': 'application\/json',?\s*\},\s*body: JSON\.stringify\(([^)]+)\),?\s*\}\);/g,
    "const response = await apiClient.put('/platform-admin$1', $2, token || '');"
  );
  
  // Replace localStorage.getItem('token') with useAuth hook
  if (!content.includes('const { token }') && content.includes('localStorage.getItem(')) {
    // Add useAuth import if not present
    if (!content.includes("import { useAuth }")) {
      content = content.replace(
        /import React[^;]+;/,
        "$&\nimport { useAuth } from '../../contexts/AuthContext';"
      );
    }
    
    // Add token from useAuth
    const componentMatch = content.match(/export const \w+[^{]*\{/);
    if (componentMatch) {
      const hookIndex = content.indexOf(componentMatch[0]) + componentMatch[0].length;
      content = content.slice(0, hookIndex) + 
                "\n  const { token } = useAuth();\n" + 
                content.slice(hookIndex);
    }
  }
  
  // Replace localStorage.getItem calls
  content = content.replace(/localStorage\.getItem\(['"](?:admin)?[Tt]oken['"]\)/g, 'token');
  
  writeFileSync(filePath, content);
  console.log(`Fixed ${filePath}`);
}

// Fix all components
componentsToFix.forEach(fixComponent);

console.log('All platform admin components fixed!');