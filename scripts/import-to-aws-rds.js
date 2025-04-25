// scripts/import-to-aws-rds.js
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Directory with exported data
const exportDir = path.join(__dirname, '../exports');

// List of tables to import (in order of dependencies)
const tables = [
  'Branch',
  'Role',
  'User',
  'UserRole',
  'Teacher',
  'Parent',
  'Class',
  'Student',
  'Permission',
  // Add other tables as needed
];

async function importTable(tableName) {
  console.log(`Importing table: ${tableName}`);

  try {
    // Read data from the JSON file
    const filePath = path.join(exportDir, `${tableName}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return 0;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data || data.length === 0) {
      console.log(`No data to import for ${tableName}`);
      return 0;
    }

    // Convert table name to camelCase for Prisma
    const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);

    // Check if the model exists in Prisma
    if (!prisma[modelName]) {
      console.log(`Model ${modelName} not found in Prisma client`);
      return 0;
    }

    // Import each record
    let importedCount = 0;

    for (const record of data) {
      try {
        // Create the record
        await prisma[modelName].create({
          data: record,
        });

        importedCount++;
      } catch (error) {
        console.error(`Error importing record:`, error);
        // Continue with next record
      }
    }

    console.log(`Imported ${importedCount} records to ${tableName}`);
    return importedCount;
  } catch (error) {
    console.error(`Error importing table ${tableName}:`, error);
    return 0;
  }
}

async function importAllTables() {
  console.log('Starting data import to AWS RDS...');

  let totalRows = 0;

  for (const table of tables) {
    const rowCount = await importTable(table);
    totalRows += rowCount;
  }

  console.log(`Import complete. Total rows imported: ${totalRows}`);
}

// Run the import
importAllTables()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

export default importAllTables;
