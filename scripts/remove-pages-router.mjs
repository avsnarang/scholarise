#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file name and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const PAGES_DIR = path.join(path.resolve(__dirname, '..'), 'src', 'pages');

// Keep list - files we need to keep (essential Pages Router files)
const KEEP_FILES = [
  '_app.tsx',
  '_document.tsx',
  'api'
];

// Function to check if a file or directory should be kept
function shouldKeep(name) {
  return KEEP_FILES.includes(name) || name.endsWith('.bak');
}

// Function to recursively delete directories
function deleteDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    // Skip files and directories we want to keep
    if (shouldKeep(entry.name)) {
      console.log(`🔒 Keeping: ${fullPath}`);
      continue;
    }
    
    if (entry.isDirectory()) {
      deleteDirectory(fullPath);
      
      // Check if directory is now empty
      const remainingFiles = fs.readdirSync(fullPath);
      if (remainingFiles.length === 0) {
        fs.rmdirSync(fullPath);
        console.log(`🗑️ Removed empty directory: ${fullPath}`);
      }
    } else {
      // Delete file
      fs.unlinkSync(fullPath);
      console.log(`🗑️ Removed file: ${fullPath}`);
    }
  }
}

console.log('🔍 Starting Pages Router cleanup...');
deleteDirectory(PAGES_DIR);
console.log('✅ Pages Router cleanup complete!'); 