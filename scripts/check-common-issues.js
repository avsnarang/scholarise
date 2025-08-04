#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 Checking for common build issues...\n');

// 1. Check for duplicate function declarations
console.log('1. Checking for duplicate function declarations:');
try {
  const result = execSync('grep -r "^function \\|^export default function " src/app --include="*.tsx" -n', { encoding: 'utf8' });
  const lines = result.trim().split('\n');
  const functionMap = new Map();
  
  lines.forEach(line => {
    const parts = line.split(':');
    if (parts.length >= 3) {
      const [filePath, lineNum, ...contentParts] = parts;
      const content = contentParts.join(':');
      const functionMatch = content?.match(/function\s+(\w+)/);
      if (functionMatch) {
        const functionName = functionMatch[1];
        if (!functionMap.has(functionName)) {
          functionMap.set(functionName, []);
        }
        functionMap.get(functionName)?.push({ file: filePath, line: lineNum, content: content.trim() });
      }
    }
  });
  
  let foundDuplicates = false;
  functionMap.forEach((locations, functionName) => {
    if (locations.length > 1) {
      console.log(`   ❌ Duplicate function "${functionName}":`);
      locations.forEach(/** @param {any} loc */ (loc) => {
        console.log(`      - ${loc.file}:${loc.line}`);
      });
      foundDuplicates = true;
    }
  });
  
  if (!foundDuplicates) {
    console.log('   ✅ No duplicate functions found');
  }
} catch (error) {
  console.log('   ✅ No function declarations found');
}

// 2. Check for useSearchParams without Suspense
console.log('\n2. Checking for useSearchParams() usage:');
try {
  const result = execSync('grep -r "useSearchParams" src/app --include="*.tsx" -l', { encoding: 'utf8' });
  const files = result.trim().split('\n').filter(Boolean);
  
  let hasIssues = false;
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const hasSuspense = content.includes('Suspense') || content.includes('dynamic(');
    if (!hasSuspense) {
      console.log(`   ❌ ${file} uses useSearchParams but may need Suspense`);
      hasIssues = true;
    }
  });
  
  if (!hasIssues) {
    console.log('   ✅ All useSearchParams usage properly wrapped');
  }
} catch (error) {
  console.log('   ✅ No useSearchParams usage found');
}

// 3. Check for syntax errors patterns
console.log('\n3. Checking for common syntax error patterns:');
try {
  const result = execSync('grep -r "function.*PageContent.*function.*PageContent" src/app --include="*.tsx" -l', { encoding: 'utf8' });
  if (result.trim()) {
    console.log(`   ❌ Found potential duplicate PageContent functions`);
  } else {
    console.log('   ✅ No duplicate PageContent patterns found');
  }
} catch (error) {
  console.log('   ✅ No duplicate PageContent patterns found');
}

// 4. Check for missing imports
console.log('\n4. Checking for missing dynamic imports:');
try {
  const result = execSync('grep -r "dynamic(" src/app --include="*.tsx" -l', { encoding: 'utf8' });
  const files = result.trim().split('\n').filter(Boolean);
  
  let missingImports = false;
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('dynamic(') && !content.includes('import dynamic from')) {
      console.log(`   ❌ ${file} uses dynamic() but missing import`);
      missingImports = true;
    }
  });
  
  if (!missingImports) {
    console.log('   ✅ All dynamic imports properly imported');
  }
} catch (error) {
  console.log('   ✅ No dynamic usage found');
}

// 5. Check for metadata exports in client components
console.log('\n5. Checking for metadata exports in client components:');
try {
  const result = execSync('grep -r "export const metadata" src/app --include="*.tsx" -l', { encoding: 'utf8' });
  const files = result.trim().split('\n').filter(Boolean);
  
  let hasIssues = false;
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('"use client"') && content.includes('export const metadata')) {
      console.log(`   ❌ ${file} has metadata export in client component`);
      hasIssues = true;
    }
  });
  
  if (!hasIssues) {
    console.log('   ✅ No metadata exports in client components');
  }
} catch (error) {
  console.log('   ✅ No metadata exports found');
}

console.log('\n✅ Issue check complete!');