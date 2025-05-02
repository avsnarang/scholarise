#!/usr/bin/env node

/**
 * This script helps migrate from the Pages Router to the App Router
 * It will:
 * 1. Create App Router directories for each page
 * 2. Generate basic templates for pages and layouts
 * 3. List files that have been migrated and those that still need attention
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination directories
const PAGES_DIR = path.resolve(__dirname, '../src/pages');
const APP_DIR = path.resolve(__dirname, '../src/app');

// Skip directories/files
const SKIP_LIST = [
  '_app.tsx',
  '_document.tsx',
  'api',
  'dashboard.tsx', // Already handled
  'attendance-marker.tsx', // Already handled
  'attendance-records.tsx', // Already handled
];

// Make sure app directory exists
if (!fs.existsSync(APP_DIR)) {
  fs.mkdirSync(APP_DIR, { recursive: true });
}

// Track what we've migrated
/**
 * @typedef {Object} MigratedFile
 * @property {string} from - Original path in pages directory
 * @property {string} to - New path in app directory
 */

/**
 * @typedef {Object} AttentionFile
 * @property {string} path - Path to the file
 * @property {string} reason - Reason why it needs attention
 */

/**
 * @typedef {Object} ErrorFile
 * @property {string} file - Path to the file
 * @property {string} error - Error message
 */

/**
 * @typedef {Object} PageFile
 * @property {string} fullPath - Full path to the file
 * @property {string} relativePath - Relative path from pages directory
 * @property {string} name - File name
 * @property {string} dirName - Directory name
 */

/** @type {MigratedFile[]} */
const migrated = [];
/** @type {AttentionFile[]} */
const needsAttention = [];
/** @type {ErrorFile[]} */
const errors = [];

// Get all the page files
/**
 * @param {string} dir - Directory to search
 * @param {string} base - Base path for relative paths
 * @returns {PageFile[]} - Array of page files
 */
function getPagesFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  /** @type {PageFile[]} */
  let files = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(base, entry.name);
    
    if (SKIP_LIST.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      files = files.concat(getPagesFiles(fullPath, relativePath));
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) {
      files.push({
        fullPath,
        relativePath,
        name: entry.name,
        dirName: base,
      });
    }
  }
  
  return files;
}

// Create App Router structure
/**
 * @param {PageFile[]} pageFiles - Array of page files to migrate
 */
function createAppRouterFiles(pageFiles) {
  for (const file of pageFiles) {
    try {
      // Determine the new path in app directory
      let routeName;
      
      if (file.name === 'index.tsx' || file.name === 'index.jsx') {
        // index files become the directory name
        routeName = file.dirName === '' ? '' : file.dirName;
      } else {
        // other files use their name without extension
        const baseName = file.name.replace(/\.tsx$|\.jsx$/, '');
        routeName = file.dirName === '' 
          ? baseName 
          : path.join(file.dirName, baseName);
      }
      
      // Create the app directory structure
      const appRoutePath = path.join(APP_DIR, routeName);
      fs.mkdirSync(appRoutePath, { recursive: true });
      
      // Create page.tsx template
      const pageFilePath = path.join(appRoutePath, 'page.tsx');
      const layoutFilePath = path.join(appRoutePath, 'layout.tsx');
      
      if (!fs.existsSync(pageFilePath)) {
        fs.writeFileSync(
          pageFilePath,
          `"use client";\n\n// TODO: Migrate from ${file.relativePath}\n\nexport default function Page() {\n  return (\n    <div>\n      <h1>This page needs to be migrated from Pages Router</h1>\n      <p>Original file: ${file.relativePath}</p>\n    </div>\n  );\n}\n`
        );
        
        fs.writeFileSync(
          layoutFilePath,
          `"use client";\n\nimport { AppLayout } from "@/components/layout/app-layout";\n\nexport default function Layout({ children }: { children: React.ReactNode }) {\n  return (\n    <AppLayout title="${routeName || 'Home'}" description="${routeName || 'Home'} page">\n      {children}\n    </AppLayout>\n  );\n}\n`
        );
        
        migrated.push({
          from: file.relativePath,
          to: `app/${routeName}/page.tsx and layout.tsx`,
        });
      } else {
        needsAttention.push({
          path: file.relativePath,
          reason: 'App Router file already exists',
        });
      }
    } catch (/** @type {unknown} */ error) {
      errors.push({
        file: file.relativePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

// Main execution
console.log('🚀 Starting Pages Router to App Router migration script...');

const pageFiles = getPagesFiles(PAGES_DIR);
console.log(`Found ${pageFiles.length} pages to migrate.`);

createAppRouterFiles(pageFiles);

// Print summary
console.log('\n✅ Migration Summary:');
console.log('-------------------');

if (migrated.length > 0) {
  console.log('\n📦 Files with templates created:');
  migrated.forEach(item => {
    console.log(`  - ${item.from} → ${item.to}`);
  });
}

if (needsAttention.length > 0) {
  console.log('\n⚠️ Files needing attention:');
  needsAttention.forEach(item => {
    console.log(`  - ${item.path} (${item.reason})`);
  });
}

if (errors.length > 0) {
  console.log('\n❌ Errors:');
  errors.forEach(item => {
    console.log(`  - ${item.file}: ${item.error}`);
  });
}

console.log('\n🎉 Migration script completed!');
console.log('Please review the generated files and update them as needed.');
console.log('Remember to remove the Pages Router files after migration is complete.');
 