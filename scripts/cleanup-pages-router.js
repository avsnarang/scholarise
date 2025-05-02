#!/usr/bin/env node

/**
 * This script removes the Pages Router files after migration to App Router is complete
 * WARNING: This will delete files! Make sure your App Router migration is working correctly first.
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

// Keep essential files/directories 
const KEEP_LIST = [
  '_app.tsx', // Keep for reference during transition
  '_document.tsx', // Keep for reference during transition
];

// Files to delete
const filesToDelete = [];

// Function to recursively gather all files to delete
function collectFilesToDelete(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(base, entry.name);
    
    if (KEEP_LIST.includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      // For directories, collect files inside them first
      collectFilesToDelete(fullPath, relativePath);
      
      // Then add the empty directory to the list
      filesToDelete.push({
        path: fullPath,
        type: 'directory',
        relative: relativePath
      });
    } else if (entry.isFile()) {
      filesToDelete.push({
        path: fullPath,
        type: 'file',
        relative: relativePath
      });
    }
  }
}

// Ask for confirmation
console.log('⚠️  WARNING: This script will delete Pages Router files after verifying they exist in App Router ⚠️');
console.log('Make sure your App Router implementation is working correctly before continuing.');
console.log('\nPress any key to continue, or Ctrl+C to abort...');

// Wait for user input
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on('data', () => {
  process.stdin.setRawMode(false);
  process.stdin.pause();
  
  // Start collecting files
  console.log('\n🔍 Collecting Pages Router files to delete...');
  collectFilesToDelete(PAGES_DIR);
  
  // Verify files exist in App Router
  const verifiedFiles = filesToDelete.filter(file => {
    if (file.type === 'file') {
      // Skip checking for _app.tsx, _document.tsx, etc.
      if (file.relative.includes('_') || file.relative.includes('api/')) {
        return true;
      }
      
      // For index.tsx files, check for page.tsx in the same directory
      if (file.relative.endsWith('index.tsx')) {
        const dirPath = file.relative.replace('index.tsx', '');
        const appPath = path.join(APP_DIR, dirPath, 'page.tsx');
        return fs.existsSync(appPath);
      }
      
      // For other files, check for page.tsx in a subdirectory
      const baseName = path.basename(file.relative, '.tsx');
      const dirPath = path.dirname(file.relative);
      const appPath = path.join(APP_DIR, dirPath, baseName, 'page.tsx');
      return fs.existsSync(appPath);
    }
    return true;
  });
  
  // Display files to delete
  console.log(`\n🗑️  Found ${verifiedFiles.length} files/directories to delete:`);
  
  // Group by type for better visualization
  const files = verifiedFiles.filter(f => f.type === 'file');
  const dirs = verifiedFiles.filter(f => f.type === 'directory');
  
  console.log(`\n📄 Files (${files.length}):`);
  files.forEach(file => console.log(`  - ${file.relative}`));
  
  console.log(`\n📁 Directories (${dirs.length}):`);
  dirs.forEach(dir => console.log(`  - ${dir.relative}`));
  
  console.log('\nPress any key to delete these files, or Ctrl+C to abort...');
  
  // Wait for confirmation again
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('data', () => {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    
    console.log('\n🗑️  Deleting files...');
    
    // Delete files first, then directories (in reverse order to handle nested dirs)
    let deletedCount = 0;
    
    // Delete files
    files.forEach(file => {
      try {
        fs.unlinkSync(file.path);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting ${file.relative}: ${error.message}`);
      }
    });
    
    // Delete directories in reverse order (deepest first)
    dirs.sort((a, b) => b.relative.split('/').length - a.relative.split('/').length);
    dirs.forEach(dir => {
      try {
        fs.rmdirSync(dir.path);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting directory ${dir.relative}: ${error.message}`);
      }
    });
    
    console.log(`\n✅ Deleted ${deletedCount} files/directories.`);
    console.log('\n🎉 Cleanup complete! Your app should now be fully migrated to the App Router.');
    process.exit(0);
  });
}); 