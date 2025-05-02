#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

// Get current file name and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories
const PAGES_DIR = path.join(path.resolve(__dirname, '..'), 'src', 'pages');
const APP_DIR = path.join(path.resolve(__dirname, '..'), 'src', 'app');

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

// Function to create or update a stubbed page in the App Router
function createStubPage(routePath, originalFile) {
  const dirPath = path.join(APP_DIR, routePath);
  const pagePath = path.join(dirPath, 'page.tsx');
  const layoutPath = path.join(dirPath, 'layout.tsx');

  // Create directory if it doesn't exist
  if (!fileExists(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }

  // Create a basic layout if it doesn't exist
  if (!fileExists(layoutPath)) {
    const layoutContent = `
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container mx-auto py-6">
      {children}
    </div>
  );
}
`.trim();
    fs.writeFileSync(layoutPath, layoutContent);
    console.log(`✅ Created layout: ${layoutPath}`);
  }

  // Create a stub page if it doesn't exist
  if (!fileExists(pagePath)) {
    const pageContent = `"use client";

// TODO: Migrate from ${originalFile}

export default function Page() {
  return (
    <div>
      <h1>This page needs to be migrated from Pages Router</h1>
      <p>Original file: ${originalFile}</p>
    </div>
  );
}
`.trim();
    fs.writeFileSync(pagePath, pageContent);
    console.log(`✅ Created stub page: ${pagePath}`);
  }
}

// Function to detect conflicts between Pages Router and App Router
function detectConflicts() {
  const conflicts = [];
  
  // Get all pages from Pages Router
  function findPagesInDir(dir, baseRoute = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip API and internal directories
        if (entry.name === 'api' || entry.name.startsWith('_')) {
          continue;
        }
        
        const newBaseRoute = path.join(baseRoute, entry.name);
        findPagesInDir(path.join(dir, entry.name), newBaseRoute);
      } else if (
        entry.isFile() && 
        (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) && 
        !entry.name.startsWith('_')
      ) {
        const route = path.join(baseRoute, entry.name.replace(/\.(tsx|jsx)$/, ''));
        
        // Check if this route exists in App Router
        const appRouteDir = path.join(APP_DIR, route);
        
        if (fileExists(appRouteDir)) {
          conflicts.push({
            route,
            pagesFile: path.join(dir, entry.name),
            appDir: appRouteDir
          });
        }
      }
    }
  }
  
  findPagesInDir(PAGES_DIR);
  
  return conflicts;
}

// Function to migrate a page
function migratePage(conflict) {
  try {
    const { route, pagesFile } = conflict;
    const relativePagesFile = path.relative(path.resolve(__dirname, '..'), pagesFile);
    
    // Create a stub page in App Router if it doesn't exist
    createStubPage(route, relativePagesFile.replace('src/pages/', ''));
    
    // Generate backup
    const backupFile = `${pagesFile}.bak`;
    fs.copyFileSync(pagesFile, backupFile);
    console.log(`✅ Created backup: ${backupFile}`);
    
    // Remove the Pages Router file
    fs.unlinkSync(pagesFile);
    console.log(`✅ Removed Pages Router file: ${pagesFile}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to migrate page: ${error.message}`);
    return false;
  }
}

// Main function
function main() {
  console.log('🔍 Detecting conflicts between Pages Router and App Router...');
  const conflicts = detectConflicts();
  
  if (conflicts.length === 0) {
    console.log('✅ No conflicts detected!');
    return;
  }
  
  console.log(`\n🚨 Found ${conflicts.length} conflicts:`);
  conflicts.forEach((conflict, index) => {
    console.log(`${index + 1}. Route: /${conflict.route}`);
    console.log(`   - Pages Router: ${conflict.pagesFile}`);
    console.log(`   - App Router: ${conflict.appDir}`);
  });
  
  console.log('\n🛠️ Migrating conflicting pages...');
  let migratedCount = 0;
  
  conflicts.forEach(conflict => {
    console.log(`\nMigrating route: /${conflict.route}`);
    const success = migratePage(conflict);
    if (success) {
      migratedCount++;
    }
  });
  
  console.log(`\n✅ Migration complete! Migrated ${migratedCount}/${conflicts.length} pages.`);
  console.log('\n🔍 Please check the App Router stub pages and migrate the content from the .bak files.');
}

// Run the main function
main(); 